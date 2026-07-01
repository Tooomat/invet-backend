import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
// import { PinoLogger } from 'nestjs-pino';
import { PrismaPg } from "@prisma/adapter-pg";
import { PinoLogger } from "nestjs-pino";
import { PrismaClient } from "src/generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy  {

    constructor(
        private logger: PinoLogger
    ) {
        const databaseUrl = process.env.DATABASE_URL;
        const isProduction = process.env.NODE_ENV === 'production';

        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not defined');
        }

        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL as string,
        });

        super({ 
            adapter,
            log: isProduction
                ? [
                    { emit: 'event', level: 'error' },
                    { emit: 'event', level: 'warn' },
                ]
                : [
                    { emit: 'event', level: 'error' },
                    { emit: 'event', level: 'warn' },
                    { emit: 'event', level: 'info' },
                    // { emit: 'event', level: 'query' }, // debug query di local
                ],
        })

        this.logger.setContext(PrismaService.name);
    }

    async onModuleInit() {
        // LISTEN runtime query errors (bukan cuma saat connect)
        this.$on('error' as never, (e: any) => {
            this.logger.error({
                type: 'database:query:error',
                message: e.message,
                target: e.target,
                timestamp: new Date().toISOString()
            });
        });

        this.$on('warn' as never, (e: any) => {
            this.logger.warn({
                type: 'database:query:warning',
                origin: 'PrismaService',
                message: e.message,
                timestamp: new Date().toISOString()
            });
        });

        try {
            await this.$connect();

            this.logger.info({
                type: 'database:connect:success',
                message: 'Database connected successfully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error({
                type: 'database:connect:failed',
                errorMessage: error.message,
                errorName: error.constructor.name,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw error; // app tidak start kalau DB rusak
        }
    }

    async onModuleDestroy() {
        try {
            await this.$disconnect();

            this.logger.info({
                type: 'database:disconnect:success',
                message: 'Database disconnected gracefully',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error({
                type: 'database:disconnect:failed',
                errorMessage: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            // tidak perlu throw — app sedang shutdown, jangan blocking proses exit
        }
    }
}