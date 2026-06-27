import z from "zod";

export class EmailVerificationValidation {
    static readonly VERIFY_SCHEMA = z.object({
        token: z
            .string()
            .min(1, "Token is required")
    })
}