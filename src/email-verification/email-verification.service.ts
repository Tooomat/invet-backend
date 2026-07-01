import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from 'src/common/prisma.service';
import { EmailVerificationValidation } from './email-verification.validation';
import { randomBytes } from 'crypto'
import { Prisma, StatusUser } from 'src/generated/prisma/client';
import { RedisService } from 'src/common/redis.service';
import { QueueProducer } from 'src/queue/queue.producer';
import { verifyEmailTemplate } from 'src/email/templates/verify-email.template';
import { VerifyEmailQuery } from 'src/model/email-verification.model';
import { ValidationService } from 'src/common/validation.service';
import { escapeHtml } from 'src/common/utils/html.util';

@Injectable()
export class EmailVerificationService {

    private readonly TOKEN_EXPIRES_MS: number = 1 * 60 * 60 * 1000 // 1 jam
    private readonly COOLDOWN_SEC = 5 * 60                        // 5 menit
    
    constructor(
        private prismaService: PrismaService,
        private validationService: ValidationService,
        private redisService: RedisService,
        private queueProducer: QueueProducer,
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {
        this.logger.setContext(EmailVerificationService.name)
    }

    async sendOnRegister(userId: string, requestId: string): Promise<void> {

        const { emailVerif, user } = await this.prismaService.$transaction(async (tx) => {

            await tx.emailVerification.deleteMany({
                where: {
                    userId: userId,
                    usedAt: null
                }
            })
    
            const token = randomBytes(32).toString('base64url') // 43 karakter, URL-safe
            const exp = new Date(Date.now() + this.TOKEN_EXPIRES_MS)
    
            const emailVerifData: Prisma.EmailVerificationCreateInput = {
                user: {
                    connect: { id: userId }
                },
                token: token,
                expiresAt: exp,
            }

            const emailVerif = await tx.emailVerification.create({
                data: emailVerifData,
                select: {
                    id: true,
                    token: true
                }
            })

            const user = await tx.user.findUnique({
                where: { 
                    id: userId 
                },
                select: { 
                    email: true, 
                    firstName: true,
                    lastName: true
                }
            })

            return { emailVerif, user }
        })

        if (!user) {
            this.logger.warn({ 
                type: 'email_verification_failed', 
                reason: 'user_not_found', 
                userId, 
                requestId 
            })
            throw new HttpException('User not found', HttpStatus.NOT_FOUND)
        }

        try {

            const verifyLink: string = `${this.configService.getOrThrow('FRONTEND_URL')}/login/verify-email?token=${emailVerif.token}`

            const templateHtml = verifyEmailTemplate({
                fullName: escapeHtml(user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.firstName
                ),
                verifyUrl: verifyLink,
                expiresIn: '1 jam',
            })

            await this.queueProducer.enqueueEmail(
                {
                    to: user.email,
                    subject: templateHtml.subject,
                    html: templateHtml.html
                },
                `email-verify-${userId}`
            )

            // SET COOLDOWN KIRIM ULANG
            // await this.redisService.set(`email-verify:cooldown:${ userId }`, '1', this.COOLDOWN_SEC)
            const cooldownSet = await this.redisService.setNx(`email-verify:cooldown:${userId}`, '1', this.COOLDOWN_SEC)

            this.logger.info({
                type: 'email_verification_queued',
                userId,
                requestId,
            })

        } catch (e) {

            if (e instanceof HttpException) throw e

            this.logger.error({
                type: 'email_verification_enqueue_failed',
                userId,
                requestId,
                error: (e as Error).message,
                timestamp: new Date().toISOString()
            })

            throw new HttpException(
                'Failed to send verification email, please try again',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    async resend(userId: string, requestId: string): Promise<void> {
        const cooldownKey = `email-verify:cooldown:${userId}`
        const onCooldown: boolean = await this.redisService.exists(cooldownKey)

        if (onCooldown) {
            const remainingCooldown = await this.redisService.ttl(cooldownKey)

            this.logger.warn({
                type: 'resend_verification_cooldown',
                userId,
                remainingCooldown,
                requestId,
                timestamp: new Date().toISOString()
            })

            throw new HttpException(
                {
                    message: 'Please wait before requesting another verification email',
                    retryAfter: remainingCooldown
                },
                HttpStatus.TOO_MANY_REQUESTS,
            )
        }

        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            select: {
                isEmailVerified: true,
                emailVerifiedAt: true
            }
        })

        if (user!.isEmailVerified && user!.emailVerifiedAt) {

            this.logger.warn({
                type: 'resend_verification_already_verified',
                userId,
                requestId,
                timestamp: new Date().toISOString()
            })

            throw new HttpException(
                "User alredy verified",
                HttpStatus.CONFLICT
            )
        }

        await this.sendOnRegister(userId, requestId)
    }

    async verify(query: VerifyEmailQuery, requestId: string): Promise<void> {
        const validation = this.validationService.validate(EmailVerificationValidation.VERIFY_SCHEMA, query)

        const emailVerif = await this.prismaService.emailVerification.findUnique({
            where: {
                token: validation.token
            },
            include: {
                user: {
                    select: {
                        id: true,
                        isEmailVerified: true,
                        emailVerifiedAt: true
                    }
                }
            }
        })

        if (!emailVerif) {
            this.logger.warn({
                type: 'email_verification_failed',
                reason: 'invalid_token',
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Invalid token verification",
                HttpStatus.BAD_REQUEST
            )
        }

        if (emailVerif.usedAt) {
            this.logger.warn({
                type: 'email_verification_failed',
                reason: 'token_already_used',
                userId: emailVerif.userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Verification token already used",
                HttpStatus.BAD_REQUEST
            )
        }

        if (emailVerif.expiresAt < new Date()) {
            this.logger.warn({
                type: 'email_verification_failed',
                reason: 'token_expired',
                userId: emailVerif.userId,
                expiresAt: emailVerif.expiresAt,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "Verification token has expired",
                HttpStatus.BAD_REQUEST
            )
        }

        if (emailVerif.user.emailVerifiedAt && emailVerif.user.isEmailVerified) {
            this.logger.warn({
                type: 'email_verification_failed',
                reason: 'already_verified',
                userId: emailVerif.userId,
                requestId,
                timestamp: new Date().toISOString()
            })
            throw new HttpException(
                "User already verified",
                HttpStatus.CONFLICT
            )
        }

        await this.prismaService.$transaction(async (tx) => {

            await tx.emailVerification.update({
                where: {
                    id: emailVerif.id
                },
                data: {
                    usedAt: new Date()
                }
            })
    
            await tx.user.update({
                where: {
                    id: emailVerif.user.id
                },
                data: {
                    isEmailVerified: true,
                    emailVerifiedAt: new Date(),
                    status: StatusUser.ACTIVE
                }
            })
        })

        this.logger.info({
            type: 'email_verified',
            userId: emailVerif.userId,
            requestId,
            timestamp: new Date().toISOString()
        })
    }
}
