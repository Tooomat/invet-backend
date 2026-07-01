import z from "zod";

export class EmailVerificationValidation {
    static readonly VERIFY_SCHEMA = z.object({
        token: z
            .string()
            .trim()
            .min(1, 'Token is required')
            .max(100, 'Invalid token')
            .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token format') // base64url charset
            .transform(val => val.trim())
    })
}