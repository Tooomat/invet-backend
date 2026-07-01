import { Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailVerificationService } from './email-verification.service';
import { WebResponse } from 'src/model/web-response.model';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AccessTokenPayload } from 'src/common/token.service';
import { RequestId } from 'src/common/decorators/request-id.decorator';
import { VerifyEmailQuery } from 'src/model/email-verification.model';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Email Verification')
@Controller('/api/email-verification')
export class EmailVerificationController {

    constructor(private emailVerificationService: EmailVerificationService) {}

    @Post('/resend')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @Throttle({ private: { limit: 3, ttl: 1 * 60 * 60 * 1000, blockDuration: 24 * 60 * 60 * 1000 } }) // 3x/jam, block 24 jam
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Resend email verification' })
    @ApiResponse({ status: 200, description: 'Verification email sent' })
    @ApiResponse({ status: 429, description: 'Too many requests — cooldown active' })
    @ApiResponse({ status: 409, description: 'conflict  — user already verified' })
    async resend(
        @CurrentUser() user: AccessTokenPayload,
        @RequestId() requestId: string
    ): Promise<WebResponse<null>> {

        await this.emailVerificationService.resend(user.sub, requestId)

        return {
            success: true,
            message: 'Verification link sent to email',
            data: null
        }
    }

    @Get('/verify')
    @HttpCode(HttpStatus.OK)
    @Throttle({ public: { limit: 5, ttl: 1 * 60 * 1000, blockDuration: 5 * 60 * 1000 } }) // 5x/menit, block 5 menit
    @ApiOperation({ summary: 'Verify email with token' })
    @ApiResponse({ status: 200, description: 'Email verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid, expired, or already used token' })
    async verify(
        @Query() query: VerifyEmailQuery,
        @RequestId() requestId: string
    ): Promise<WebResponse<string>> {
        await this.emailVerificationService.verify(query, requestId)

        return {
            success: true,
            message: 'Email verified successfully',
            data: "OK"
        }
    }
}
