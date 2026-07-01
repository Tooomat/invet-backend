import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from "nestjs-pino";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {

    private client: Redis;

    constructor(
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {
        this.logger.setContext(RedisService.name)
    }

    // onModuleInit() {
    //     this.client = new Redis({
    //         host: this.configService.getOrThrow<string>('REDIS_HOST'),
    //         port: this.configService.getOrThrow<number>('REDIS_PORT'),
    //         password: this.configService.get<string>('REDIS_PASSWORD'),
    //         db: this.configService.getOrThrow<number>('REDIS_DB'),
    //     })
    // }
    
    onModuleInit() {
        this.client = new Redis({
            host: this.configService.getOrThrow<string>('REDIS_HOST'),
            port: this.configService.getOrThrow<number>('REDIS_PORT'),
            password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
            db: this.configService.getOrThrow<number>('REDIS_DB'),
            retryStrategy(times) {
                if (times > 10) {
                    // setelah 10x retry, stop reconnect
                    return null
                }
                return Math.min(times * 500, 5000) // retry setiap 500ms, max 5 detik
            },
            reconnectOnError(err) {
                // reconnect kalau ada error READONLY (Redis failover)
                return err.message.includes('READONLY')
            },
            lazyConnect: false,
            enableOfflineQueue: true, // queue command saat offline, kirim saat reconnect
        })

        this.client.on('error', (err) => {
            this.logger.error({ type: 'redis_connection_error', error: err.message })
        })

        this.client.on('reconnecting', () => {
            this.logger.warn({ type: 'redis_reconnecting' })
        })

        this.client.on('connect', () => {
            this.logger.info({ type: 'redis_connected' })
        })
    }

    onModuleDestroy() {
        this.client.quit();
    }

    // async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    //     if (ttlSeconds) {
    //         this.client.set(key, value, "EX", ttlSeconds)
    //     } else {
    //         this.client.set(key, value)
    //     }
    // }
    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds)
            } else {
                await this.client.set(key, value)
            }
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error', 
                method: 'set', key, 
                error: (e as Error).message 
            })
            // tidak throw — operasi non-critical tetap lanjut
        }
    }

    // async get(key: string): Promise<string | null> {
    //     return this.client.get(key);
    // }
    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key)
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error', 
                method: 'get', 
                key, 
                error: (e as Error).message 
            })
            return null
        }
    }

    // async del(key: string): Promise<void> {
    //     await this.client.del(key);
    // }
    async del(key: string): Promise<void> {
        try {
            await this.client.del(key)
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error',
                method: 'del', 
                key, 
                error: (e as Error).message 
            })
        }
    }

    // async exists(key: string): Promise<boolean> {
    //     const result = await this.client.exists(key);
    //     return result === 1;
    // }
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key)
            return result === 1
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error', 
                method: 'exists', 
                key, 
                error: (e as Error).message 
            })
            return false // fallback: anggap tidak ada cooldown, biarkan request jalan
        }
    }

    // async ttl(key: string): Promise<number> {
    //     return this.client.ttl(key)
    // }
    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(key)
        } catch (e) {
            this.logger.error({
                type: 'redis_error',
                method: 'ttl', 
                key, 
                error: (e as Error).message 
            })
            return 0
        }
    }

    // UNTUK PROJECT KECIL
    // async delByPattern(pattern: string): Promise<void> {
    //     const keys = await this.client.keys(pattern)
    //     if (keys.length === 0) return
    //     await this.client.del(keys)
    // }

    // UNTUK PROJECT DENGAN DATA BESAR
    async delByPattern(pattern: string): Promise<void> {
        try {
            let cursor = 0
            do {
                const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
                cursor = parseInt(nextCursor)
                if (keys.length > 0) {
                    await this.client.del(keys)
                }
            } while (cursor !== 0)
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error', 
                method: 'delByPattern', 
                pattern, 
                error: (e as Error).message 
            })
        }
    }

    async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        try {
            const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX')
            return result === 'OK' // true = berhasil set, false = sudah ada
        } catch (e) {
            this.logger.error({ 
                type: 'redis_error', 
                method: 'setNx', 
                key, 
                error: (e as Error).message 
            })
            return false
        }
    }
}