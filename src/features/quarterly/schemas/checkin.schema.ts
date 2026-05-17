/**
 * @file features/quarterly/schemas/checkin.schema.ts
 * @description Zod validation schemas for the employee quarterly check-in form.
 */

import { z } from "zod";

export const checkinFormSchema = z.object({
  progressPct: z
    .number()
    .min(0, "Cannot be less than 0%")
    .max(100, "Cannot exceed 100%"),
  
  employeeNotes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .nullable(),
});

export type CheckinFormValues = z.infer<typeof checkinFormSchema>;
