import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_JOB, EMAIL_QUEUE } from "src/email/email.queue";
import type { EmailJob } from "src/email/email.service";

// Job producers add jobs to queues
@Injectable()
export class QueueProducer {

    constructor(@InjectQueue(EMAIL_QUEUE) private emailQueue: Queue) {}

    async enqueueEmail(emailJob: EmailJob, jobId: string): Promise<void> {
        await this.emailQueue.add(
            EMAIL_JOB.SEND, 
            emailJob,
            {
                jobId: jobId,
                attempts: 3,                    // retry 3x kalau gagal
                backoff: {
                    type: 'exponential',
                    delay: 5000,                // retry pertama 5s, kedua 10s, ketiga 20s
                },
                removeOnComplete: true,         // hapus job setelah berhasil
                removeOnFail: {
                    age: 1 * 24 * 3600
                }
            }
        )
    }

    async enqueueManyEmail(emailJobs: EmailJob[]): Promise<void> {
        const jobs = emailJobs.map(emailJob => ({
            name: EMAIL_JOB.SEND,
            data: emailJob,
            opts: {
                attempts: 3,
                backoff: {
                    type: 'exponential' as const,
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: {
                    age: 1 * 24 * 3600
                },
            }
        }))

        await this.emailQueue.addBulk(jobs)
    }
    
}