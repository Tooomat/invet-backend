import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [CommonModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
