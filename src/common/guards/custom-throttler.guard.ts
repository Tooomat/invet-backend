import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    protected async throwThrottlingException(
        context: any,
        throttlerLimitDetail: ThrottlerLimitDetail
    ): Promise<void> {
        const retryAfterSeconds = Math.ceil(throttlerLimitDetail.timeToExpire / 1000);

        throw new ThrottlerException(
            `Too many requests. Please try again in ${retryAfterSeconds} seconds.`
        );
    }
}