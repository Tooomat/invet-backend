import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Resend } from 'resend';

export type EmailJob = {
    to: string | string[]
    subject: string
    html: string
}

@Injectable()
export class EmailService {

    private resend: Resend

    constructor(
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {
        this.logger.setContext(EmailService.name)
        this.resend = new Resend(this.configService.getOrThrow('RESEND_API_KEY'))
    }

    async send(emailJob: EmailJob): Promise<void> {
        const from = this.configService.getOrThrow('EMAIL_FROM')

        try {
            const { error } = await this.resend.emails.send({
                from: from,
                to: Array.isArray(emailJob.to) ? emailJob.to : [emailJob.to],
                subject: emailJob.subject,
                html: emailJob.html
            })

            if (error) {
                this.logger.error({
                    type: 'email_send_failed',
                    to: emailJob.to,
                    subject: emailJob.subject,
                    error: error.message,
                })

                throw new Error(`Resend error: ${error.message}`)
            }

            this.logger.info({
                type: 'email_sent',
                to: emailJob.to,
                subject: emailJob.subject,
            })
        } catch (e) {
            this.logger.error({
                type: 'email_send_exception',
                to: emailJob.to,
                error: (e as Error).message,
                stack: (e as Error).stack,
            })
            throw e
        }
        
    }

}
