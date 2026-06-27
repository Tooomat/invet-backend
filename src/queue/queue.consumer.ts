import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PinoLogger } from "nestjs-pino";
import { EMAIL_JOB, EMAIL_QUEUE } from "src/email/email.queue";
import { EmailJob, EmailService } from "src/email/email.service";

// WORKER (process the jobs while producer added into the queue)
@Processor(`${ EMAIL_QUEUE }`, {
    concurrency: 10, // Maksimal 10 email sedang dikirim secara bersamaan
    limiter: {
        max: 10,
        duration: 1000
    }
})
export class QueueConsumer extends WorkerHost {

    constructor(
        private emailService: EmailService,
        private logger: PinoLogger,
    ) {
        super()
        this.logger.setContext(QueueConsumer.name)
    }

    async process(job: Job): Promise<void> {
        if(job.name === EMAIL_JOB.SEND) {
            await this.handleSendEmail(job)
        }
    }

    async handleSendEmail(job: Job<EmailJob>): Promise<void> {
        this.logger.info({
            type: 'email_job_start',
            jobId: job.id,
            to: job.data.to,
            subject: job.data.subject,
            attempt: job.attemptsMade + 1,
        })

        try {
            await this.emailService.send(job.data)

            this.logger.info({
                type: 'email_job_success',
                jobId: job.id,
                to: job.data.to,
            })
        } catch (e) {
            this.logger.error({
                type: 'email_job_failed',
                jobId: job.id,
                to: job.data.to,
                attempt: job.attemptsMade + 1,
                error: (e as Error).message,
            })
            throw e // rethrow supaya BullMQ tahu job gagal dan retry
        }
    }
}