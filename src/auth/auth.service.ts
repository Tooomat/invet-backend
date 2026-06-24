import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { AuthLoginRequest, AuthLoginResponse, AuthRefreshResponse, AuthRegisterRequest, AuthRegisterResponse, toAuthRegisterResponse } from 'src/model/auth.model';
import { AuthValidation } from './auth.validation';

import bcrypt from "bcrypt";
import { Prisma } from 'src/generated/prisma/client';
import type { AccessTokenPayload, RefreshTokenPayload } from 'src/common/token.service';
import { TokenService } from 'src/common/token.service';
import { RedisService } from 'src/common/redis.service';

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private validationService: ValidationService,
        private tokenService: TokenService,
        private redisService: RedisService
    ) {}

    async register(req: AuthRegisterRequest): Promise<AuthRegisterResponse> {

        const validation: AuthRegisterRequest = this.validationService.validate(AuthValidation.REGISTER_SCHEMA, req)

        const userWithSameEmail = await this.prismaService.user.count({
            where: {
                email: validation.email
            }
        })
        if (userWithSameEmail != 0) {
            throw new HttpException(
                "Email already exists", 
                HttpStatus.BAD_REQUEST
            )
        }

        validation.password = await bcrypt.hash(validation.password, 10)
        
        const registerData: Prisma.UserCreateInput = {
            role: "USER",
            firstName: validation.firstName,
            password: validation.password, 
            email: validation.email
        }

        if (validation.lastName !== undefined) {
            registerData.lastName = validation.lastName
        }

        const user = await this.prismaService.user.create({
            data: registerData,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                createdAt: true
            }
        })

        return toAuthRegisterResponse(user)
    }

    async login(req: AuthLoginRequest): Promise<AuthLoginResponse> {

        const validation: AuthLoginRequest = this.validationService.validate(AuthValidation.LOGIN_SCHEMA, req)

        const user = await this.prismaService.user.findUnique({
            where: {
                email: validation.email
            }
        })
        if (!user) {
            throw new HttpException(
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED
            )
        }

        const isPasswordValid = await bcrypt.compare(validation.password, user.password)
        if (!isPasswordValid) {
            throw new HttpException(
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED
            )
        }

        const accessPayload: AccessTokenPayload = {
            sub: user.id,
            role: user.role
        }
        const accessToken = this.tokenService.generateAccessToken(accessPayload)
        const { token: refreshToken, jti } = this.tokenService.generateRefreshToken({ sub: user.id })

        await this.redisService.set(
            `refresh:${user.id}:${jti}`,
            refreshToken, 
            60 * 60 * 24 * 7
        )

        return {
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    }

    async renewToken(refreshTokenHttpOnlyCookie: string): Promise<AuthRefreshResponse> {

        if (!refreshTokenHttpOnlyCookie) {
            throw new HttpException(
                "Missing refresh token",
                HttpStatus.UNAUTHORIZED
            )
        }
        
        const refreshTokenPayload: RefreshTokenPayload = this.tokenService.verifyRefreshToken(refreshTokenHttpOnlyCookie)
        const redisRefreshToken: string | null = await this.redisService.get(`refresh:${refreshTokenPayload.sub}:${refreshTokenPayload.jti}`)
        if (!redisRefreshToken) {
            throw new HttpException(
                "Refresh token revoke",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (redisRefreshToken !== refreshTokenHttpOnlyCookie) {
            throw new HttpException(
                "Invalid refresh token",
                HttpStatus.UNAUTHORIZED
            )
        }

        const user = await this.prismaService.user.findUnique({
            where: {
                id: refreshTokenPayload.sub
            },
            select: {
                id: true,
                status: true,
                role: true
            }
        })
        if (!user) {
            throw new HttpException(
                "User not found",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (user.status === 'BLOCKED') {
            throw new HttpException(
                "Account has been blocked",
                HttpStatus.FORBIDDEN
            )
        }

        const newAccessToken: string = this.tokenService.generateAccessToken({
            sub: user.id,
            role: user.role
        })

        return {
            newAccessToken: newAccessToken
        }
    }

    async logout(accessToken: string, refreshToken: string): Promise<void> {
        const expAccessToken = this.tokenService.getExp(accessToken)
        const now = Math.floor(Date.now() / 1000)
        const ttl = expAccessToken ? expAccessToken - now : 900

        if (ttl > 0) {
            await this.redisService.set(`blacklist:${accessToken}`, '1', ttl)
        }

        if (refreshToken) {
            try {
                const refreshTokenPayload: RefreshTokenPayload = this.tokenService.verifyRefreshToken(refreshToken)
                await this.redisService.del(`refresh:${refreshTokenPayload.sub}:${refreshTokenPayload.jti}`)
            } catch {
                // refresh token invalid/expired, tidak perlu throw — tetap lanjut logout
            }
        }
    }
}
