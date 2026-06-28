import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { ChangeEmailUserRequest, ChangePasswordRequest, UserProfileResponse, UserResponse, UserUpdateRequest, UserUpdateResponse, VerifyChangeEmailQuery } from 'src/model/user.model';
import { UserValidation } from './user.validation';
import { Prisma } from 'src/generated/prisma/client';

import bcrypt from "bcrypt";
import { RedisService } from 'src/common/redis.service';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { changeEmailTemplate } from 'src/email/templates/change-email.template';
import { QueueProducer } from 'src/queue/queue.producer';
import { TokenService } from 'src/common/token.service';
import type { RefreshTokenPayload } from 'src/common/token.service';

@Injectable()
export class UserService {

    private readonly TOKEN_EXPIRES_MS: number = 1 * 60 * 60 * 1000 // 1 jam
    private readonly COOLDOWN_SEC = 5 * 60       

    constructor(
        private prismaService: PrismaService,
        private validationService: ValidationService,
        private redisService: RedisService,
        private queueProducer: QueueProducer,
        private configService: ConfigService,
        private tokenService: TokenService,
        private logger: PinoLogger
    ) {
        this.logger.setContext(UserService.name)
    }

    async current(userId: string, requestId: string): Promise<UserResponse> {
        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                status: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        })

        if (!user) {
            this.logger.warn({
                type: 'current_user_failed',
                reason: 'user_not_found',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "User not found",
                HttpStatus.UNAUTHORIZED
            )
        }

        return {
            id: user.id,
            name: user.lastName ? `${user.firstName} ${user.lastName}` : `${user.firstName}`,
            status: user.status,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }
    }

    async update(userId: string, req: UserUpdateRequest, requestId: string): Promise<UserUpdateResponse> {
        const validation = this.validationService.validate(UserValidation.UPDATE_SCHEMA, req)

        const updateData: Prisma.UserUpdateInput = {}

        if (validation.firstName !== undefined) {
            updateData.firstName = validation.firstName
        }

        if (validation.lastName !== undefined) {
            updateData.lastName = validation.lastName
        }

        const newUser = await this.prismaService.user.update({
            where: {
                id: userId
            },
            data: updateData,
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        })

        return {
            id: newUser.id,
            firstName: validation.firstName !== undefined ? newUser.firstName : null,
            lastName: validation.lastName !== undefined ? newUser.lastName : null,
        }
    }

    // TODO: BELUM SELESAI
    async profile(userId: string, requestId: string): Promise<UserProfileResponse> {
        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            select: {
                firstName: true,
                lastName: true,
                status: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        })
        if (!user) {
            this.logger.warn({
                type: 'profile_failed',
                reason: 'user_not_found',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "User not found",
                HttpStatus.UNAUTHORIZED
            )
        }

        return {

        }
    }


    async changeEmail(userId: string, req: ChangeEmailUserRequest, requestId: string): Promise<void> {

        const validation = this.validationService.validate(UserValidation.CHANGE_EMAIL_SCHEMA, req)

        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                password: true,
                
            }
        })
        if (!user) {
            this.logger.warn({
                type: 'change_email_failed',
                reason: 'user_not_found',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "User not found",
                HttpStatus.UNAUTHORIZED
            )
        }

        const isPassword = await bcrypt.compare(validation.password, user.password)
        if (!isPassword) {
            this.logger.warn({
                type: 'change_email_failed',
                reason: 'invalid_password',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Password is incorrect",
                HttpStatus.BAD_REQUEST
            )
        }

        const countExistsEmail = await this.prismaService.user.count({
            where: {
                email: validation.newEmail
            }
        })
        if (countExistsEmail !== 0) {
            this.logger.warn({
                type: 'change_email_failed',
                reason: 'email_already_exists',
                userId,
                newEmail: validation.newEmail,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Email already exists",
                HttpStatus.BAD_REQUEST
            )
        }

        // cek cooldown
        const onCooldown = await this.redisService.exists(`newEmail-verify:cooldown:${userId}`)
        if (onCooldown) {
            const remainingCooldown = await this.redisService.ttl(`newEmail-verify:cooldown:${userId}`)
            this.logger.warn({
                type: 'change_email_failed',
                reason: 'cooldown_active',
                userId,
                remainingCooldown,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                {
                    message: 'Please wait before requesting another email change',
                    retryAfter: remainingCooldown
                },
                HttpStatus.TOO_MANY_REQUESTS
            )
        }

        const token = randomUUID()
        const exp = new Date(Date.now() + this.TOKEN_EXPIRES_MS)

        const changeEmailReqData: Prisma.ChangeEmailRequestCreateInput = {
            user: {
                connect: {
                    id: user.id
                }
            },
            token: token,
            newEmail: validation.newEmail,
            expiresAt: exp
        }
        const changeEmailReq = await this.prismaService.changeEmailRequest.create({
            data: changeEmailReqData,
            select: {
                id: true,
                token: true,
                newEmail: true
            }
        })

        const verifyLink: string = `${this.configService.getOrThrow('FRONTEND_URL')}/settings/verify-newEmail?token=${changeEmailReq.token}`

        const templateHtml = changeEmailTemplate({
            fullName: user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName,
            verifyUrl: verifyLink,
            expiresIn: '1 jam'
        })

        await this.queueProducer.enqueueEmail(
            {
                to: changeEmailReq.newEmail,
                subject: templateHtml.subject,
                html: templateHtml.html
            },
            `newEmail-verify-${userId}`
        )

        await this.redisService.set(`newEmail-verify:cooldown:${user.id}`, '1', this.COOLDOWN_SEC)

        this.logger.info({
            type: 'change_email_queued',
            userId,
            newEmail: validation.newEmail,
            requestId,
            timestamp: new Date().toISOString()
        })
    }

    async verifyChangeEmail(query: VerifyChangeEmailQuery, requestId: string): Promise<void> {

        const validation = this.validationService.validate(UserValidation.VERIFY_NEW_EMAIL_SCHEMA, query)

        const changeEmail = await this.prismaService.changeEmailRequest.findUnique({
            where: {
                token: validation.token
            },
            include: {
                user: {
                    select: {
                        id: true,
                    }
                }
            }
        })
        if (!changeEmail) {
            this.logger.warn({
                type: 'verify_change_email_failed',
                reason: 'invalid_token',
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Invalid token verification",
                HttpStatus.BAD_REQUEST
            )
        }
        if (changeEmail.usedAt) {
            this.logger.warn({
                type: 'verify_change_email_failed',
                reason: 'token_already_used',
                userId: changeEmail.userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Verification token already used",
                HttpStatus.BAD_REQUEST
            )
        }
        if (changeEmail.expiresAt < new Date()) {
            this.logger.warn({
                type: 'verify_change_email_failed',
                reason: 'token_expired',
                userId: changeEmail.userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Verification token has expired",
                HttpStatus.BAD_REQUEST
            )
        }

        await this.prismaService.$transaction(async (tx) => {
            await tx.user.update({
                where: {
                    id: changeEmail.user.id
                },
                data: {
                    email: changeEmail.newEmail
                }
            })

            await tx.changeEmailRequest.update({
                where: {
                    id: changeEmail.id
                },
                data: {
                    usedAt: new Date()
                }
            })
        })

        await this.redisService.del(`newEmail-verif:cooldown:${changeEmail.userId}`)

        // invalidasi semua session user
        await this.redisService.delByPattern(`refresh:${changeEmail.userId}:*`)

        this.logger.info({
            type: 'change_email_verified',
            userId: changeEmail.userId,
            newEmail: changeEmail.newEmail,
            requestId,
            timestamp: new Date().toISOString()
        })
    }

    async changePassword(userId: string, accessToken: string, refreshToken: string, req: ChangePasswordRequest, requestId: string): Promise<void> {
        
        const validation = this.validationService.validate(UserValidation.CHANGE_PASSWORD_SCHEMA, req)

        const user = await this.prismaService.user.findUnique({
            where: { 
                id: userId 
            },
            select: { 
                id: true, 
                password: true 
            }
        })

        if (!user) {
            this.logger.warn({
                type: 'change_password_failed',
                reason: 'user_not_found',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                'User not found', 
                HttpStatus.UNAUTHORIZED
            )   
        }

        const isPasswordValid = await bcrypt.compare(validation.currentPassword, user.password)
        if (!isPasswordValid) {
            this.logger.warn({
                type: 'change_password_failed',
                reason: 'invalid_current_password',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException('Current password is incorrect', HttpStatus.BAD_REQUEST)
        }

        const hashedNewPassword = await bcrypt.hash(validation.newPassword, 10)
        await this.prismaService.user.update({
            where: { 
                id: userId 
            },
            data: { 
                password: hashedNewPassword 
            }
        })

        // invalidasi semua session
        const expAccessToken = this.tokenService.getExp(accessToken)
        const now = Math.floor(Date.now() / 1000)
        const ttl = expAccessToken ? expAccessToken - now : 900
        if (ttl > 0) {
            await this.redisService.set(`blacklist:${accessToken}`, '1', ttl)
        }

        // hapus SEMUA refresh token user, bukan hanya yang sedang dipakai
        await this.redisService.delByPattern(`refresh:${userId}:*`)

        if (refreshToken) {
            try {
                const refreshTokenPayload: RefreshTokenPayload = this.tokenService.verifyRefreshToken(refreshToken)
                await this.redisService.del(`refresh:${refreshTokenPayload.sub}:${refreshTokenPayload.jti}`)
            } catch {
                
            }
        }   

        this.logger.info({
            type: 'change_password_success',
            userId,
            requestId,
            timestamp: new Date().toISOString()
        })
    }
}
