import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from './prisma.service';
import { ValidationService } from './validation.service';
import { APP_FILTER } from '@nestjs/core';
import { ErrorFilter } from './error.filter';

@Global()
@Module({
    imports: [
        // SETUP PINO LOGGER (DEV)
        LoggerModule.forRoot({
            pinoHttp: process.env.NODE_ENV === 'test'
                ? { enabled: false }
                : process.env.NODE_ENV === 'development'
                ? {
                    transport: {
                        target: 'pino-pretty',
                        options: { singleLine: true }
                    }
                    }
                : {
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
    ],
    exports: [PrismaService, ValidationService]
})
export class CommonModule {}
