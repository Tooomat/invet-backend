import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { QueueProducer } from './queue.producer';
import { EmailModule } from 'src/email/email.module';
import { QueueConsumer } from './queue.consumer';
import { EMAIL_QUEUE } from 'src/email/email.queue';

@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.getOrThrow('REDIS_HOST'),
                    port: config.getOrThrow('REDIS_PORT'),
                    password: config.get('REDIS_PASSWORD'),
                    db: config.getOrThrow('REDIS_DB')
                }
            })
        }),
        BullModule.registerQueue({
            name: EMAIL_QUEUE
        }),
        EmailModule
    ],
    providers: [QueueProducer, QueueConsumer],
    exports: [QueueProducer]
})
export class QueueModule {}
