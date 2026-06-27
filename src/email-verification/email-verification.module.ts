import { Module } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationController } from './email-verification.controller';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [EmailVerificationService],
  controllers: [EmailVerificationController],
  exports: [EmailVerificationService]
})
export class EmailVerificationModule {}
