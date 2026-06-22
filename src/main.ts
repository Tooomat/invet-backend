import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // PORT
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
