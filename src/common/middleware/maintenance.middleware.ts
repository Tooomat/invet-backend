import { Injectable, NestMiddleware } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {

    constructor(
        private logger: PinoLogger,
        private prismaService: PrismaService
    ) {
        this.logger.setContext(MaintenanceMiddleware.name)
    }

  use(req: Request, res: Response, next: NextFunction) {
    

    next()
  }
}