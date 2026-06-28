import z from "zod";

export class UserValidation {
    static readonly UPDATE_SCHEMA = z.object({
        firstName: z
            .string()
            .min(1, 'first name must contain at least 1 characters')
            .max(50)
            .optional(),
        lastName: z
            .string()
            .max(100)
            .optional(),
    })

    static readonly CHANGE_EMAIL_SCHEMA = z.object({
        newEmail: z
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

    static readonly VERIFY_NEW_EMAIL_SCHEMA = z.object({
        token: z
            .string()
            .min(1, "Token is required")
    })

    static readonly CHANGE_PASSWORD_SCHEMA = z.object({
        currentPassword: z
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
        newPassword: z
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
    }).refine((val) => val.currentPassword !== val.newPassword, {
        message: 'New password must be different from current password',
        path: ['newPassword']
    })

}