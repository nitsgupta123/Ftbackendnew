import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255),
  password: passwordSchema,
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(255, "Full name is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupFormValues = z.infer<typeof signupSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;

export const createUserSchema = signupSchema.extend({
  role: z
    .string()
    .trim()
    .min(2, "Role is required")
    .max(60, "Role is too long")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Role must start with a letter and use lowercase letters, numbers, or underscore"
    )
    .optional(),
});

export const updateUserSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(255, "Full name is too long")
      .optional(),
    role: z
      .string()
      .trim()
      .min(2, "Role is required")
      .max(60, "Role is too long")
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Role must start with a letter and use lowercase letters, numbers, or underscore"
      )
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
