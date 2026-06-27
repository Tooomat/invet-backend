import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { WebResponse } from 'src/model/web-response.model';
import { AuthLoginRequest, AuthLoginResponse, AuthRefreshResponse, AuthRegisterRequest, AuthRegisterResponse } from 'src/model/auth.model';
import { Response, Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AccessToken } from 'src/common/decorators/access-token.decorator';
import { RequestId } from 'src/common/decorators/request-id.decorator';

@ApiTags('Auth')
@Controller('/api/auth')
export class AuthController {

    constructor(private authService: AuthService) {}

    @Post('/register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register new user' })
    @ApiBody({ type: AuthRegisterRequest })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Validation error or email already exists' })
    async register(
        @Body() req: AuthRegisterRequest,
        @RequestId() requestId: string
    ): Promise<WebResponse<AuthRegisterResponse>> {
        const result: AuthRegisterResponse = await this.authService.register(req, requestId)
        return {
            success: true,
            message: "Registration successfull",
            data: result
        }
    }

    @Post("/login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiBody({ type: AuthLoginRequest })
    @ApiResponse({ 
        status: 200, 
        description: 'Login successful. Access token returned in body, refresh token set in HttpOnly cookie',
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Invalid email or password' })
    async login(
        @Body() req: AuthLoginRequest,
        @Res({ passthrough: true }) res: Response,
        @RequestId() requestId: string
    ): Promise<WebResponse<AuthLoginResponse>> {
        const result: AuthLoginResponse = await this.authService.login(req, requestId)

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 1000 * 60 * 60 * 24 * 7,
            path: '/',
        })

        return {
            success: true,
            message: "Login successfull",
            data: {
                accessToken: result.accessToken,
                isEmailVerified: result.isEmailVerified
            }
        }
    }

    @Post('/refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Renew access token using refresh token cookie' })
    @ApiCookieAuth('refreshToken')
    @ApiResponse({ status: 200, description: 'New access token generated' })
    @ApiResponse({ status: 401, description: 'Missing, invalid, or revoked refresh token' })
    @ApiResponse({ status: 403, description: 'Account has been blocked' })
    async renewToken(
        @Req() req: Request,
        @RequestId() requestId: string
    ): Promise<WebResponse<AuthRefreshResponse>> {
        const refreshTokenHttpOnlyCookie = req.cookies['refreshToken'];
        const result: AuthRefreshResponse = await this.authService.renewToken(refreshTokenHttpOnlyCookie, requestId)

        return {
            success: true,
            message: "Successful generate new token",
            data: {
                newAccessToken: result.newAccessToken
            }
        }
    }

    @Post('/logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiCookieAuth('refreshToken')
    @ApiOperation({ summary: 'Logout user — blacklist access token & remove refresh token' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
    async logout(
        @AccessToken() accessToken: string,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @RequestId() requestId: string
    ): Promise<WebResponse<string>> {
        const refreshToken: string = req.cookies['refreshToken']

        await this.authService.logout(accessToken, refreshToken, requestId)

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        })

        return {
            success: true,
            message: 'Logout successful',
            data: 'OK'
        }
    }
}