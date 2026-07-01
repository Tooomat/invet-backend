import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { QueueModule } from './queue/queue.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [

    // SETUP RATE LIMITER
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          // AUTH — sensitif
          { name: 'login',    ttl: 1 * 60 * 1000, limit: 5,   blockDuration: 5  * 60 * 1000 }, // 5x/menit, block 5 menit
          { name: 'register', ttl: 1 * 60 * 1000, limit: 3,   blockDuration: 60 * 60 * 1000 }, // 3x/menit, block 1 jam
          
          // PRIVATE — user sudah login
          { name: 'private',  ttl: 1 * 60 * 1000, limit: 100, blockDuration: 1  * 60 * 1000 }, // 100x/menit, block 1 menit
          
          // PUBLIC — endpoint umum tanpa auth
          { name: 'public',   ttl: 1 * 60 * 1000, limit: 60,  blockDuration: 1  * 60 * 1000 }, // 60x/menit, block 1 menit
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.getOrThrow('REDIS_HOST'),
            port: config.getOrThrow('REDIS_PORT'),
            password: config.get('REDIS_PASSWORD'),
            db: config.getOrThrow('REDIS_DB'),
            keyPrefix: 'throttler:rl:'
          }),
        )
      }),
    }),

    CommonModule, AuthModule, EmailVerificationModule, UserModule, QueueModule, EmailModule, 
  ],
  controllers: [],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ]
})
export class AppModule {}
