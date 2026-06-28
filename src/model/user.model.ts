import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Role, StatusUser } from "src/generated/prisma/enums"

export class UserResponse { 
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string

    @ApiProperty({ example: 'John Doe' })
    name: string

    @ApiProperty({ enum: StatusUser, example: StatusUser.ACTIVE })
    status: StatusUser

    @ApiProperty({ example: 'john@example.com' })
    email: string

    @ApiProperty({ enum: Role, example: Role.USER })
    role: Role

    @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
    createdAt: Date

    @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', nullable: true })
    updatedAt?: Date | null
}

// -------- UPDATE ----------------------------------------------------------
export class UserUpdateRequest {
    @ApiPropertyOptional({ example: 'John' })
    firstName?: string | undefined

    @ApiPropertyOptional({ example: 'Doe' })
    lastName?: string | undefined
}

export class UserUpdateResponse {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string

    @ApiPropertyOptional({ example: 'John', nullable: true })
    firstName?: string | null

    @ApiPropertyOptional({ example: 'Doe', nullable: true })
    lastName?: string | null
}

// -------- PROFILE ----------------------------------------------------------
export class UserProfileResponse {}

// -------- CHANGE EMAIL ----------------------------------------------------------
export class ChangeEmailUserRequest {
    @ApiProperty({ example: 'newemail@example.com' })
    newEmail: string

    @ApiProperty({ example: 'Password123!' })
    password: string
}

// -------- VERIFY CHANGE EMAIL ----------------------------------------------------------
export class VerifyChangeEmailQuery {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    token: string
}

// -------- CHANGE PASSWORD ----------------------------------------------------------
export class ChangePasswordRequest {
    @ApiProperty({ example: 'OldPassword123!' })
    currentPassword: string

    @ApiProperty({ example: 'NewPassword123!' })
    newPassword: string
}