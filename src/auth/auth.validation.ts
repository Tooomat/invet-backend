import z from "zod";

export class AuthValidation {
    static readonly REGISTER_SCHEMA = z.object({
        firstName: z
            .string()
            .min(1, 'first name must contain at least 1 characters')
            .max(50),
        lastName: z
            .string()
            .max(100)
            .optional(),
        // phone: z
        //     .string()
        //     .min(1, "Phone number must contain at least 1 characters")
        //     .transform((val) => val.trim().replace(/[\s\-]/g, ""))
        //     .refine(
        //         (val) => val.startsWith("+62"),
        //         { message: "Phone number must start with +62" }
        //     )
        //     .refine(
        //         (val) => /^\+62\d{9,12}$/.test(val),
        //         { message: "Phone number must have 9-12 digits after +62" }
        //     )
        //     .optional(),
        email: z
            .string()
            .email()
            .min(1, 'email must be at least 1 characters')
            .max(100),
        password: z
            .string()
            .min(8, 'Password must contain at least 8 characters')
            .max(100)
            .refine((val) => /[a-z]/.test(val), {
                message: 'Password must contain at least one lowercase letter'
            })
            .refine((val) => /[A-Z]/.test(val), {
                message: 'Password must contain at least one uppercase letter'
            })
            .refine((val) => /[0-9]/.test(val), {
                message: 'Password must contain at least one number'
            })
            .refine((val) => /[^a-zA-Z0-9]/.test(val), {
                message: 'Password must contain at least one special character (!@#$% etc.)'
            }),
    })

    static readonly LOGIN_SCHEMA = z.object({
        email: z
            .string()
            .email()
            .min(1, 'email must be at least 1 characters')
            .max(100),
        password: z
            .string()
            .min(8, 'Password must contain at least 8 characters')
            .max(100)
            .refine((val) => /[a-z]/.test(val), {
                message: 'Password must contain at least one lowercase letter'
            })
            .refine((val) => /[A-Z]/.test(val), {
                message: 'Password must contain at least one uppercase letter'
            })
            .refine((val) => /[0-9]/.test(val), {
                message: 'Password must contain at least one number'
            })
            .refine((val) => /[^a-zA-Z0-9]/.test(val), {
                message: 'Password must contain at least one special character (!@#$% etc.)'
            }),
    })

}