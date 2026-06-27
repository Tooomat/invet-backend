import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailQuery {
    @ApiProperty({ example: 'ais2jdjd3oa4m...' })
    token: string
}