import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { AuthLoginRequest, AuthLoginResponse, AuthRefreshResponse, AuthRegisterRequest, AuthRegisterResponse, toAuthRegisterResponse } from 'src/model/auth.model';
import { AuthValidation } from './auth.validation';

import bcrypt from "bcrypt";
import { Prisma } from 'src/generated/prisma/client';
import type { AccessTokenPayload, RefreshTokenPayload } from 'src/common/token.service';
import { TokenService } from 'src/common/token.service';
import { RedisService } from 'src/common/redis.service';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private validationService: ValidationService,
        private logger: PinoLogger,
        private tokenService: TokenService,
        private redisService: RedisService,
        private emailVerificationService: EmailVerificationService
    ) {
        this.logger.setContext(AuthService.name)
    }

    async register(req: AuthRegisterRequest, requestId: string): Promise<AuthRegisterResponse> {

        const validation: AuthRegisterRequest = this.validationService.validate(AuthValidation.REGISTER_SCHEMA, req)

        const userWithSameEmail = await this.prismaService.user.count({
            where: {
                email: validation.email
            }
        })
        if (userWithSameEmail != 0) {
            this.logger.warn({
                type: 'register_failed',
                reason: 'email_already_exists',
                email: validation.email,
                requestId,
                timestamp: new Date().toISOString()
            })
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

        // KIRIM EMAIL VERIFICATION
        await this.emailVerificationService.sendOnRegister(user.id, requestId)
        
        this.logger.info({
            type: 'register',
            userId: user.id,
            email: user.email,
            requestId,
            timestamp: new Date().toISOString()
        })

        return toAuthRegisterResponse(user)
    }

    async login(req: AuthLoginRequest, requestId: string): Promise<AuthLoginResponse> {

        const validation: AuthLoginRequest = this.validationService.validate(AuthValidation.LOGIN_SCHEMA, req)

        const user = await this.prismaService.user.findUnique({
            where: {
                email: validation.email
            },
            select: {
                id: true, 
                password: true,
                role: true,
                status: true,
                isEmailVerified: true,
                emailVerifiedAt: true
            }
        })
        if (!user) {
            this.logger.warn({
                type: 'login_failed',
                reason: 'user_not_found',
                email: validation.email,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Invalid email or password",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (user.status === 'BLOCKED') {
            this.logger.warn({
                type: 'login_failed',
                reason: 'account_blocked',
                userId: user.id,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Account has been blocked",
                HttpStatus.FORBIDDEN
            )
        }

        const isPasswordValid = await bcrypt.compare(validation.password, user.password)
        if (!isPasswordValid) {
            this.logger.warn({
                type: 'login_failed',
                reason: 'invalid_password',
                userId: user.id,
                requestId,
                timestamp: new Date().toISOString()
            })
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

        await this.prismaService.user.update({
            where: {
                id: user.id
            },
            data: {
                lastLoginAt: new Date()
            }
        })

        this.logger.info({
            type: 'login',
            userId: user.id,
            requestId,
            timestamp: new Date().toISOString()
        })

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            isEmailVerified: user.isEmailVerified === false && !user.emailVerifiedAt ? false : undefined
        }
    }

    async renewToken(refreshTokenHttpOnlyCookie: string, requestId: string): Promise<AuthRefreshResponse> {

        if (!refreshTokenHttpOnlyCookie) {
            this.logger.warn({
                type: 'refresh_token_failed',
                reason: 'missing_refresh_token',
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Missing refresh token",
                HttpStatus.UNAUTHORIZED
            )
        }
        
        const refreshTokenPayload: RefreshTokenPayload = this.tokenService.verifyRefreshToken(refreshTokenHttpOnlyCookie)
        const redisRefreshToken: string | null = await this.redisService.get(`refresh:${refreshTokenPayload.sub}:${refreshTokenPayload.jti}`)
        if (!redisRefreshToken) {
            this.logger.warn({
                type: 'refresh_token_failed',
                reason: 'token_revoked',
                userId: refreshTokenPayload.sub,
                jti: refreshTokenPayload.jti,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Refresh token revoke",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (redisRefreshToken !== refreshTokenHttpOnlyCookie) {
            this.logger.warn({
                type: 'refresh_token_failed',
                reason: 'token_mismatch',
                userId: refreshTokenPayload.sub,
                jti: refreshTokenPayload.jti,
                requestId,
                timestamp: new Date().toISOString()
            })
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
            this.logger.warn({
                type: 'refresh_token_failed',
                reason: 'user_not_found',
                userId: refreshTokenPayload.sub,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "User not found",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (user.status === 'BLOCKED') {
            this.logger.warn({
                type: 'refresh_token_failed',
                reason: 'account_blocked',
                userId: user.id,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Account has been blocked",
                HttpStatus.FORBIDDEN
            )
        }

        const newAccessToken: string = this.tokenService.generateAccessToken({
            sub: user.id,
            role: user.role
        })

        this.logger.info({
            type: 'token_renewed',
            userId: user.id,
            requestId,
            timestamp: new Date().toISOString()
        })

        return {
            newAccessToken: newAccessToken
        }
    }

    async logout(accessToken: string, refreshToken: string, requestId: string): Promise<void> {
        const expAccessToken = this.tokenService.getExp(accessToken)
        const now = Math.floor(Date.now() / 1000)
        const ttl = expAccessToken ? expAccessToken - now : 900

        if (ttl > 0) {
            await this.redisService.set(`blacklist:${accessToken}`, '1', ttl)
        }

        let userId: string | undefined

        if (refreshToken) {
            try {
                const refreshTokenPayload: RefreshTokenPayload = this.tokenService.verifyRefreshToken(refreshToken)
                userId = refreshTokenPayload.sub
                await this.redisService.del(`refresh:${refreshTokenPayload.sub}:${refreshTokenPayload.jti}`)
            } catch {
                // refresh token invalid/expired, tidak perlu throw — tetap lanjut logout
            }
        }

        this.logger.info({
            type: 'logout',
            userId,
            requestId,
            timestamp: new Date().toISOString()
        })
    }

    async forgotPassword() {}

    async resetPassword() {}
}
