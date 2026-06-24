import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // SWAGGER
  // http://localhost:3000/api/docs
  // http://localhost:3000/api/docs-json
  const configSwagger = new DocumentBuilder()
    .setTitle('invet API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document);

  // LOGGER PINO
  app.useLogger(app.get(Logger))
  
  // COOKIE
  app.use(cookieParser());

  // PORT
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
