import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { QueueModule } from './queue/queue.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [CommonModule, AuthModule, EmailVerificationModule, QueueModule, EmailModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
