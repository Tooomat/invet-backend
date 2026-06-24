import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '../token.service';

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);