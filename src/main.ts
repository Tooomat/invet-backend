import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
// import { json, urlencoded } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // enable graceful shutdown
  // Pastikan app tidak mati mendadak saat ada request yang sedang diproses
  app.enableShutdownHooks()

  // Request timeout
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(30000, () => {  // 30 detik
      res.status(408).json({
        success: false,
        message: 'Request Timeout',
        errors: 'Request took too long'
      })
    })
    next()
  })

  // LIMIT JSON SIZE
  // app.use(json({ limit: '1mb' }))
  // app.use(urlencoded({ extended: true, limit: '1mb' }))

  // COOKIE
  app.use(cookieParser());
  
  app.enableCors({
    origin: ['http://localhost:3000', 'https://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // kalau pakai cookies / auth header
  });
  
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

  // PORT
  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
