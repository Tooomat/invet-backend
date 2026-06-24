import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { TokenService } from '../token.service';
import type { AccessTokenPayload } from '../token.service';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private tokenService: TokenService,
        private prismaService: PrismaService,
        private redisService: RedisService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const authHeader = request.headers['authorization']

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HttpException(
                'Missing or invalid authorization header', 
                HttpStatus.UNAUTHORIZED
            )
        }

        const accessToken = authHeader.split(' ')[1]
        if (!accessToken) {
            throw new HttpException(
                "Missing access token",
                HttpStatus.UNAUTHORIZED
            )
        }

        const accessTokenPayload: AccessTokenPayload = this.tokenService.verifyAccessToken(accessToken)
        const isAccessTokenBl: boolean = await this.redisService.exists(`blacklist:${accessToken}`)
        if (isAccessTokenBl) {
            throw new HttpException(
                'Access token has been revoked',
                HttpStatus.UNAUTHORIZED
            )
        }

        const user = await this.prismaService.user.findUnique({
            where: {
                id: accessTokenPayload.sub
            },
            select: {
                status: true
            }
        })
        if (!user) {
            throw new HttpException(
                "Invalid user",
                HttpStatus.UNAUTHORIZED
            )
        }
        if (user.status === 'BLOCKED') {
            throw new HttpException(
                "Account has been blocked",
                HttpStatus.FORBIDDEN
            )
        }

        request.user = accessTokenPayload;
        request.accessToken = accessToken

        return true;
    }
}