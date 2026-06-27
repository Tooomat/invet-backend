import { 
    CallHandler,
    ExecutionContext, 
    Injectable, 
    NestInterceptor 
} from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { Observable, tap } from "rxjs";
import { v4 as uuidv4 } from 'uuid';

// Interceptor — log semua request/response termasuk error HTTP (sudah handle)
@Injectable()
export class LoggingInterceptor implements NestInterceptor{

    constructor(private logger: PinoLogger) {
        this.logger.setContext(LoggingInterceptor.name)
    }
    
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
        const request = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse()

        const {
            method,
            path,
            ip,
            headers
        } = request

        const userAgent = headers['user-agent']
        const realIp = headers['x-forwarded-for'] ?? ip
        const requestId = headers['x-request-id'] ?? uuidv4()
        const start = Date.now()
        const userId = request.user?.sub ?? 'anonymous'

        // attach ke request gar bisa dipakai di service
        request.requestId = requestId

        // kirim balik ke client via response header
        response.setHeader('x-request-id', requestId)

        return next.handle().pipe(
            tap({
                next: () => {
                    this.logger.info({
                        type: 'http_request',
                        requestId,
                        userId,
                        method,
                        path,
                        statusCode: response.statusCode,
                        ip: realIp,
                        userAgent,
                        duration: `${Date.now() - start}ms`,
                        timestamp: new Date().toISOString()
                    })
                },
                error: (error) => {
                    this.logger.error({
                        type: 'http_request_error',
                        requestId,
                        userId,
                        method,
                        path,
                        statusCode: error.status ?? 500,
                        ip: realIp,
                        userAgent,
                        duration: `${Date.now() - start}ms`,
                        errorMessage: error.message,
                        stack: error.stack,
                        errorName: error.constructor.name,
                        timestamp: new Date().toISOString()
                    })
                }
            })
        )
    }
}