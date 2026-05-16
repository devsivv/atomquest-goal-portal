/**
 * @file features/auth/types/auth.schema.ts
 * @description Zod schemas for authentication forms.
 */

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters."),
    employee_id: z.string().min(1, "Employee ID is required."),
    department: z.string().min(2, "Department is required."),
    designation: z.string().min(2, "Designation is required."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm password is required."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
