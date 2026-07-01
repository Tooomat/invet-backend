import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Response, Request } from 'express';
import { ChangeEmailUserRequest, ChangePasswordRequest, UserResponse, UserUpdateRequest, UserUpdateResponse, VerifyChangeEmailQuery } from 'src/model/user.model';
import type { AccessTokenPayload } from 'src/common/token.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessToken } from 'src/common/decorators/access-token.decorator';
import { RequestId } from 'src/common/decorators/request-id.decorator';
import { WebResponse } from 'src/model/web-response.model';

@ApiTags('User')
@Controller('/api/users')
export class UserController {
    constructor(private userService: UserService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @Throttle({ private: { limit: 100, ttl: 1 * 60 * 1000, blockDuration: 1 * 60 * 1000 } }) // 100x/menit, block 1 menit
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user' })
    @ApiResponse({ status: 200, description: 'Current user data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async current(
        @CurrentUser() user: AccessTokenPayload,
        @RequestId() requestId: string,
    ): Promise<WebResponse<UserResponse>> {
        const result = await this.userService.current(user.sub, requestId)
        return {
            success: true,
            message: 'User retrieved successfully',
            data: result
        }
    }

    @Patch()
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @Throttle({ private: { limit: 20, ttl: 1 * 60 * 1000, blockDuration: 1 * 60 * 1000 } }) // 20x/menit, block 1 menit
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiBody({ type: UserUpdateRequest })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async update(
        @CurrentUser() user: AccessTokenPayload,
        @Body() req: UserUpdateRequest,
        @RequestId() requestId: string,
    ): Promise<WebResponse<UserUpdateResponse>> {
        const result = await this.userService.update(user.sub, req, requestId)
        return {
            success: true,
            message: 'User updated successfully',
            data: result
        }
    }

    // TODO:
    async profile() {}

    @Post('/change-email')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @Throttle({ private: { limit: 3, ttl: 1 * 60 * 60 * 1000, blockDuration: 24 * 60 * 60 * 1000 } }) // 3x/jam, block 24 jam
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request email change — sends verification to new email' })
    @ApiBody({ type: ChangeEmailUserRequest })
    @ApiResponse({ status: 200, description: 'Verification email sent to new email address' })
    @ApiResponse({ status: 400, description: 'Invalid password or email already exists' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 429, description: 'Too many requests — cooldown active' })
    async changeEmail(
        @CurrentUser() user: AccessTokenPayload,
        @Body() body: ChangeEmailUserRequest,
        @RequestId() requestId: string,
    ): Promise<WebResponse<string>> {
        await this.userService.changeEmail(user.sub, body, requestId)
        return {
            success: true,
            message: 'Verification email sent to your new email address',
            data: "OK"
        }
    }
    
    @Get('/verify/change-email')
    @HttpCode(HttpStatus.OK)
    @Throttle({ public: { limit: 5, ttl: 1 * 60 * 1000, blockDuration: 5 * 60 * 1000 } }) // 5x/menit, block 5 menit
    @ApiOperation({ summary: 'Verify new email address via token from email link' })
    @ApiResponse({ status: 200, description: 'Email changed successfully, all sessions invalidated' })
    @ApiResponse({ status: 400, description: 'Invalid, expired, or already used token' })
    async verifyChangeEmail(
        @Query() query: VerifyChangeEmailQuery,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @RequestId() requestId: string,
    ): Promise<WebResponse<string>> {

        await this.userService.verifyChangeEmail(query, requestId)

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        })

        return {
            success: true,
            message: 'Email changed successfully. Please log in again with your new email.',
            data: "OK"
        }
    }

    @Put('/change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @Throttle({ private: { limit: 5, ttl: 1 * 60 * 60 * 1000, blockDuration: 24 * 60 * 60 * 1000 } }) // 5x/jam, block 24 jam
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change user password' })
    @ApiBody({ type: ChangePasswordRequest })
    @ApiResponse({ status: 200, description: 'Password changed successfully, all sessions invalidated' })
    @ApiResponse({ status: 400, description: 'Invalid current password or validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async changePassword(
        @CurrentUser() user: AccessTokenPayload,
        @AccessToken() accessToken: string,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() body: ChangePasswordRequest,
        @RequestId() requestId: string,
    ): Promise<WebResponse<string>> {
        const refreshToken = req.cookies['refreshToken']

        await this.userService.changePassword(
            user.sub,
            accessToken,
            refreshToken,
            body,
            requestId
        )

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        })

        return {
            success: true,
            message: 'Password changed successfully. Please log in again.',
            data: 'OK'
        }
    }
}
