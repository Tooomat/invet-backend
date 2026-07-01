import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import { ChangeEmailUserRequest, ChangePasswordRequest, UserProfileResponse, UserResponse, UserUpdateRequest, UserUpdateResponse, VerifyChangeEmailQuery } from 'src/model/user.model';
import { UserValidation } from './user.validation';
import { Prisma } from 'src/generated/prisma/client';

import bcrypt from "bcrypt";
import { RedisService } from 'src/common/redis.service';
import { randomBytes } from 'crypto'
import { ConfigService } from '@nestjs/config';
import { changeEmailTemplate } from 'src/email/templates/change-email.template';
import { QueueProducer } from 'src/queue/queue.producer';
import { TokenService } from 'src/common/token.service';
import type { RefreshTokenPayload } from 'src/common/token.service';
import { escapeHtml } from 'src/common/utils/html.util';

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

        this.logger.info({
            type: 'user_current',
            userId,
            requestId,
            timestamp: new Date().toISOString()
        })

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

        if (validation.firstName === undefined && validation.lastName === undefined) {
            throw new HttpException(
                'At least one field must be provided',
                HttpStatus.BAD_REQUEST
            )
        }

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

        this.logger.info({
            type: 'user_updated',
            userId,
            fields: Object.keys(updateData),
            requestId,
            timestamp: new Date().toISOString()
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
                id: true,
                firstName: true,
                lastName: true,
                status: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                emailVerifiedAt: true,
                lastLoginAt: true,
                lastPasswordChangedAt: true
            }
        })

        if (!user) {
            this.logger.warn({
                type: 'get_profile_failed',
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

        const changeEmailReq = await this.prismaService.changeEmailRequest.findFirst({
            where: {
                userId: userId,
                usedAt: {
                    not: null
                }
            },
            orderBy: {
                usedAt: 'desc'
            },
            select: {
                usedAt: true
            }
        })

        this.logger.info({
            type: 'get_user_profile',
            userId,
            requestId,
            timestamp: new Date().toISOString()
        })

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            email: user.email,
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt,
            updatedAt: user.updatedAt,
            security: {
                lastPasswordChangedAt: user.lastPasswordChangedAt,
                lastLoginAt: user.lastLoginAt,
                lastEmailChangedAt: changeEmailReq?.usedAt ?? null
            },
            memberSince: user.createdAt
        }
    }

    async changeEmail(userId: string, req: ChangeEmailUserRequest, requestId: string): Promise<void> {
        // set lock — kalau gagal berarti ada request lain yang sedang diproses
        const lockKey = `change-email:lock:${userId}`
        const lockAcquired = await this.redisService.setNx(lockKey, '1', 10)
        if (!lockAcquired) {
            throw new HttpException(
                'Request is being processed, please wait',
                HttpStatus.TOO_MANY_REQUESTS
            )
        }

        try {
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

            const changeEmailReq = await this.prismaService.$transaction(async (tx) => {
                const token = randomBytes(32).toString('base64url')
                const exp = new Date(Date.now() + this.TOKEN_EXPIRES_MS)

                const changeEmailReqData: Prisma.ChangeEmailRequestCreateInput = {
                    user: {
                        connect: {
                            id: user.id
                        }
                    },
                    token: token,
                    newEmail: validation.newEmail,
                    expiresAt: exp,
                    isEmailSent: false,
                }

                // hapus request lama yang belum diverifikasi
                await tx.changeEmailRequest.deleteMany({
                    where: {
                        userId: user.id,
                        usedAt: null
                    }
                })

                // buat request baru
                return tx.changeEmailRequest.create({
                    data: changeEmailReqData,
                    select: {
                        id: true,
                        token: true,
                        newEmail: true
                    }
                })
            })

            try {
                const verifyLink: string = `${this.configService.getOrThrow('FRONTEND_URL')}/settings/verify-newEmail?token=${changeEmailReq.token}`

                const templateHtml = changeEmailTemplate({
                    fullName: escapeHtml(user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.firstName
                    ),
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

                // update jadi true kalau berhasil masuk queue
                await this.prismaService.changeEmailRequest.update({
                    where: { id: changeEmailReq.id },
                    data: { isEmailSent: true }
                })

                // SET COOLDOWN KIRIM ULANG
                // await this.redisService.set(`newEmail-verify:cooldown:${user.id}`, '1', this.COOLDOWN_SEC)
                await this.redisService.setNx(`newEmail-verify:cooldown:${userId}`, '1', this.COOLDOWN_SEC)

                this.logger.info({
                    type: 'change_email_queued',
                    userId,
                    newEmail: validation.newEmail,
                    requestId,
                    timestamp: new Date().toISOString()
                })

            } catch (e) {
                // enqueue gagal — log tapi tidak throw
                // user bisa request ulang, transaction sudah hapus request lama
                // cooldown tidak diset supaya user bisa langsung coba lagi
                this.logger.error({
                    type: 'change_email_enqueue_failed',
                    userId,
                    newEmail: validation.newEmail,
                    requestId,
                    error: (e as Error).message,
                    timestamp: new Date().toISOString()
                })

                throw new HttpException(
                    'Failed to send verification email, please try again',
                    HttpStatus.INTERNAL_SERVER_ERROR
                )
            }

        } finally {
            // hapus lock setelah selesai
            await this.redisService.del(lockKey)
        }
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
        if (!changeEmail.isEmailSent) {
            this.logger.warn({
                type: 'verify_change_email_failed',
                reason: 'email_not_sent',
                userId: changeEmail.userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                'Verification email was not sent, please request again',
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

        await this.prismaService.user.update({
            where: {
                id: userId
            },
            data: {
                lastPasswordChangedAt: new Date()
            }
        })

        // invalidasi semua session
        const expAccessToken = this.tokenService.getExp(accessToken)
        const now = Math.floor(Date.now() / 1000)
        const ttl = expAccessToken ? expAccessToken - now : 900
        if (ttl > 0) {
            await this.redisService.set(`blacklist:${accessToken}`, '1', ttl)
        }

        // hapus SEMUA refresh token user, bukan hanya yang sedang dipakai, semua device
        await this.redisService.delByPattern(`refresh:${userId}:*`)

        this.logger.info({
            type: 'change_password_success',
            userId,
            requestId,
            timestamp: new Date().toISOString()
        })
    }
}
