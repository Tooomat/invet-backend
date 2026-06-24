import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JsonWebTokenError, JwtService as NestJwtService, TokenExpiredError } from '@nestjs/jwt';

import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { Role } from 'src/generated/prisma/enums';

export type AccessTokenPayload = {
    sub: string;
    role: Role;
};

export type RefreshTokenPayload = {
    sub: string;
    jti: string;
};

@Injectable()
export class TokenService {
    constructor(private jwtService: NestJwtService) {}

    generateAccessToken(payload: AccessTokenPayload): string {
        return this.jwtService.sign(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: process.env.JWT_ACCESS_EXPIRE as StringValue,
            algorithm: 'HS256',
        });
    }

    generateRefreshToken(payload: { sub: string }): { token: string; jti: string } {
        const jti = randomUUID();

        const token = this.jwtService.sign(
            { sub: payload.sub, jti },
            {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRE as StringValue,
                algorithm: 'HS256',
            },
        );

        return { token, jti };
    }

    verifyAccessToken(token: string): AccessTokenPayload {
        try {
            return this.jwtService.verify(token, {
                secret: process.env.JWT_ACCESS_SECRET,
                algorithms: ['HS256'],
            });
        } catch (e) {
            if (e instanceof TokenExpiredError) {
                throw new HttpException('Access token has expired', HttpStatus.UNAUTHORIZED);
            }
            if (e instanceof JsonWebTokenError) {
                throw new HttpException('Invalid access token', HttpStatus.UNAUTHORIZED);
            }
            throw e;
        }
    }

    verifyRefreshToken(token: string): RefreshTokenPayload {
        try {
            return this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
                algorithms: ['HS256'],
            });
        } catch (e) {
            if (e instanceof TokenExpiredError) {
                throw new HttpException('Refresh token has expired', HttpStatus.UNAUTHORIZED);
            }
            if (e instanceof JsonWebTokenError) {
                throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
            }
            throw e;
        }
    }

    getExp(token: string): number | null {
        const decoded = this.jwtService.decode(token);
        if (!decoded || typeof decoded !== 'object') return null;
        return 'exp' in decoded ? (decoded.exp as number) : null;
    }
}