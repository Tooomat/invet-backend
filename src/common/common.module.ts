import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaService } from './prisma.service';
import { ValidationService } from './validation.service';
import { ErrorFilter } from './error.filter';
import { RedisService } from './redis.service';
import { TokenService } from './token.service';
import { AuthGuard } from './guards/auth.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Global()
@Module({
    imports: [
        // SETUP PINO LOGGER
        LoggerModule.forRoot({
            pinoHttp: process.env.NODE_ENV === 'test'
                ? { enabled: false }
                : process.env.NODE_ENV === 'development'
                    ? {
                        autoLogging: false, // ← (true) auto log semua HTTP request/response
                        redact: ['req.headers.authorization'], // ← sembunyikan token di log
                        customProps: (req) => ({
                            ip: req.headers['x-forwarded-for'] ?? req.socket.remoteAddress,
                            userAgent: req.headers['user-agent'],
                        }),
                        transport: {
                            target: 'pino-pretty',
                            options: { singleLine: true }
                        }
                    }
                    : {
                        autoLogging: false,
                        redact: ['req.headers.authorization'],
                        customProps: (req) => ({
                            ip: req.headers['x-forwarded-for'] ?? req.socket.remoteAddress,
                            userAgent: req.headers['user-agent'],
                        }),
                        level: process.env.LOG_LEVEL || 'info',
                    }
        }),

        // SETUP CONFIG MODULE
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
        }),

        // SETUP JWT
        JwtModule.register({}),
    ],
    providers: [
        PrismaService, 
        ValidationService, 
        {
            provide: APP_FILTER,
            useClass: ErrorFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        TokenService,
        RedisService,
        AuthGuard
    ],
    exports: [PrismaService, ValidationService, TokenService, RedisService, AuthGuard]
})
export class CommonModule {}
