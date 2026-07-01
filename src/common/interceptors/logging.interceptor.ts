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
            body,
            headers
        } = request

        const userAgent = headers['user-agent']
        // const realIp = headers['x-forwarded-for'] ?? ip
        const requestId = headers['x-request-id'] ?? uuidv4()
        const start = Date.now()
        const userId = request.user?.sub ?? 'anonymous'

        // attach ke request gar bisa dipakai di service
        request.requestId = requestId

        // kirim balik ke client via response header
        response.setHeader('x-request-id', requestId)

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const bodySize = Buffer.byteLength(JSON.stringify(data ?? ''), 'utf8')

                    this.logger.info({
                        type: 'http_request',
                        requestId,
                        userId,
                        method,
                        path,
                        statusCode: response.statusCode,
                        ip: ip,
                        userAgent,
                        duration: `${Date.now() - start}ms`,
                        responseSizeBytes: bodySize,     
                        responseSizeKb: (bodySize / 1024).toFixed(2) + 'KB', 
                        timestamp: new Date().toISOString()
                    })
                },
                error: (error) => {
                    const requestBodySize = request.headers['content-length'] 
                    ? parseInt(request.headers['content-length']) 
                    : 0
    
                    this.logger.error({
                        type: 'http_request_error',
                        requestId,
                        userId,
                        method,
                        path,
                        statusCode: error.status ?? 500,
                        ip: ip,
                        userAgent,
                        duration: `${Date.now() - start}ms`,
                        errorMessage: error.message,
                        stack: error.stack,
                        errorName: error.constructor.name,
                        requestBodySizeBytes: requestBodySize,
                        timestamp: new Date().toISOString()
                    })
                }
            })
        )
    }
}