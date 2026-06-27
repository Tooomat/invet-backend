import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from "src/generated/prisma/client"

// ------- REGISTER -------------------------------------------------------------
export class AuthRegisterRequest {
    @ApiProperty({ example: 'John' })
    firstName: string

    @ApiPropertyOptional({ example: 'Doe' })
    lastName?: string | undefined

    @ApiProperty({ example: 'john@example.com' })
    email: string

    @ApiProperty({ example: 'Password123!' })
    password: string
}

export class AuthRegisterResponse {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string

    @ApiProperty({ example: 'John' })
    firstName: string

    @ApiPropertyOptional({ example: 'Doe' })
    lastName?: string | null

    @ApiProperty({ example: 'john@example.com' })
    email: string

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    createdAt: Date
}

export function toAuthRegisterResponse(
    user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'createdAt'>
): AuthRegisterResponse {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt
    }
}

// ------- LOGIN -------------------------------------------------------------
export class AuthLoginRequest {
    @ApiProperty({ example: 'john@example.com' })
    email: string

    @ApiProperty({ example: 'Password123!' })
    password: string
}

export class AuthLoginResponse {
    @ApiProperty({ example: 'eyJhbGci...' })
    accessToken: string

    @ApiPropertyOptional({ example: 'eyJhbGci...' })
    refreshToken?: string | null

    @ApiPropertyOptional({ example: 'false' })
    isEmailVerified?: boolean | undefined
}

// ------- REFRESH -------------------------------------------------------------
export class AuthRefreshResponse {
    @ApiProperty({ example: 'eyJhbGci...' })
    newAccessToken: string
}