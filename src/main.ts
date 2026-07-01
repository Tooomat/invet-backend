import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import hpp from 'hpp';
import helmet from 'helmet';
// import { json, urlencoded } from 'express'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  const config = app.get(ConfigService)
  const isProduction = config.get('NODE_ENV') === 'production'

  // enable graceful shutdown
  // Pastikan app tidak mati mendadak saat ada request yang sedang diproses
  app.enableShutdownHooks()

  app.set('trust proxy', 1)

   // HELMET — security headers
   //  kumpulan middleware yang set berbagai HTTP security headers sekaligus. Salah satunya untuk XSS
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", "data:", "https:"],
        connectSrc:  ["'self'"],
        fontSrc:     ["'self'"],
        objectSrc:   ["'none'"],
        mediaSrc:    ["'self'"],
        frameSrc:    ["'none'"],
      },
    } : false,
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy:   isProduction,

    // same-origin  → hanya boleh dari domain PERSIS sama (strict) 
    // same-site    → boleh dari subdomain yang sama (Frontend & backend subdomain sama (appppp.invet.com + apiiiii.invet.com))
    // cross-origin → boleh dari mana saja (beda domain) (Frontend & backend domain beda (vercel.app + api.invet.com))
    crossOriginResourcePolicy: { policy: 'same-site' },
    hidePoweredBy:             true,
    hsts:                      isProduction,
    noSniff:                   true,
    referrerPolicy:            { policy: 'strict-origin-when-cross-origin' },
  }))

  // REQUEST TIMEOUT
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
  app.use(cookieParser())

  // HPP — HTTP Parameter Pollution protection
  app.use(hpp())
  
  // CORS
  app.enableCors({
    origin: [config.getOrThrow('CORS_ORIGIN')],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // kalau pakai cookies / auth header
  })
  
  // SWAGGER
  // http://localhost:3000/api/docs
  // http://localhost:3000/api/docs-json
  if (!isProduction) {
    const configSwagger = new DocumentBuilder()
      .setTitle('invet API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, configSwagger);
    SwaggerModule.setup('api/docs', app, document);
  }

  // LOGGER PINO
  app.useLogger(app.get(Logger))

  // PORT
  const port = config.get<number>('APP_PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
