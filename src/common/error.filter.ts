import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { ZodError } from "zod";

const getStatusMessage = (status: number): string => {
    const statusMessages: Record<number, string> = {
        // 2xx
        200: "OK",
        201: "Created",
        204: "No content",

        // 3xx
        301: "Moved permanently",
        302: "Found",
        304: "Not modified",

        // 4xx
        400: "Bad request",
        401: "Unauthorized",
        402: "Payment required",
        403: "Forbidden",
        404: "Not found",
        405: "Method not allowed",
        406: "Not acceptable",
        408: "Request timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length required",
        413: "Payload too large",
        414: "URI too long",
        415: "Unsupported media type",
        422: "Unprocessable entity",
        423: "Locked",
        424: "Failed dependency",
        425: "Too early",
        426: "Upgrade required",
        429: "Too many requests",
        431: "Request header fields too large",
        451: "Unavailable for legal reasons",

        // 5xx
        500: "Internal server error",
        501: "Not implemented",
        502: "Bad gateway",
        503: "Service unavailable",
        504: "Gateway timeout",
        505: "HTTP version not supported",
        507: "Insufficient storage",
        508: "Loop detected",
        511: "Network authentication required",
    }
        
    return statusMessages[status] || "An error occurred"
}

// ErrorFilter — log hanya error 500 (unexpected) yang tidak tertangkap, 
// karena interceptor mungkin tidak selalu menangkap error yang di-catch filter
@Catch(ZodError, HttpException)
export class ErrorFilter implements ExceptionFilter {

    constructor(private logger: PinoLogger) {
        this.logger.setContext(ErrorFilter.name)
    }
    
    catch(exception: any, host: ArgumentsHost) {
        const request = host.switchToHttp().getRequest()
        const response = host.switchToHttp().getResponse()
        const requestId = request.requestId ?? null

        // ERROR HTTP
        if (exception instanceof HttpException) {
            const res = exception.getResponse()

            response.status(exception.getStatus()).json({
                status: false,
                message: getStatusMessage(exception.getStatus()),
                errors: typeof res === 'string' ? res : (res as any).message ?? res,
            })


        // ERROR VALIDATION
        } else if (exception instanceof ZodError) {
            response.status(400).json({
                status: false,
                message: "Validation errors",
                errors: exception.issues.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            })


        // ERROR SERVER
        } else {
            this.logger.error({
                type: 'unhandled_error',
                requestId,
                errorMessage: exception.message,
                errorName: exception.constructor.name,
                stack: exception.stack,
                timestamp: new Date().toISOString()
            })
            
            response.status(500).json({
                status: false,
                message: "Internal server error",
                errors: exception.message
            })
        }

    }
}