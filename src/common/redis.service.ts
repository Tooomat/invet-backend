import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {

    private client: Redis;

    constructor(private configService: ConfigService) {}
    
    onModuleInit() {
        this.client = new Redis({
            host: this.configService.getOrThrow<string>('REDIS_HOST'),
            port: this.configService.getOrThrow<number>('REDIS_PORT'),
            password: this.configService.get<string>('REDIS_PASSWORD'),
            db: this.configService.getOrThrow<number>('REDIS_DB'),
        })
    }

    onModuleDestroy() {
        this.client.quit();
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            this.client.set(key, value, "EX", ttlSeconds)
        } else {
            this.client.set(key, value)
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(key)
    }

    // UNTUK PROJECT KECIL
    // async delByPattern(pattern: string): Promise<void> {
    //     const keys = await this.client.keys(pattern)
    //     if (keys.length === 0) return
    //     await this.client.del(keys)
    // }

    // UNTUK PROJECT DENGAN DATA BESAR
    async delByPattern(pattern: string): Promise<void> {
        let cursor = 0

        do {
            const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = parseInt(nextCursor)

            if (keys.length > 0) {
                await this.client.del(keys)
            }
        } while (cursor !== 0)
    }
}