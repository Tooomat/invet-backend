import z from "zod";

export class UserValidation {
    static readonly UPDATE_SCHEMA = z.object({
        firstName: z
            .string()
            .trim()
            .min(1, 'first name must contain at least 1 characters')
            .max(50)
            .regex(/^[^<>]*$/, "First name contains invalid characters")
            .optional(),
        lastName: z
            .string()
            .max(100)
            .regex(/^[^<>]*$/, "Last name contains invalid characters")
            .optional(),
    })

    static readonly CHANGE_EMAIL_SCHEMA = z.object({
        newEmail: z
            .string()
            .trim()
            .email()
            .min(1, 'email must be at least 1 characters')
            .max(100),
        password: z
            .string()
            .trim()
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
            .trim()
            .min(1, 'Token is required')
            .max(100, 'Invalid token')
            .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token format') // base64url charset
            .transform(val => val.trim())
    })

    static readonly CHANGE_PASSWORD_SCHEMA = z.object({
        currentPassword: z
            .string()
            .trim()
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
            .trim()
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