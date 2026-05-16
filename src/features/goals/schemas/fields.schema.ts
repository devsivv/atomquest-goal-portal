/**
 * @file features/goals/schemas/fields.schema.ts
 * @description Atomic Zod validators for goal fields. 
 * Reused across drafts and strict submissions.
 */

import { z } from "zod";

export const GOAL_LIMITS = {
  MAX_GOALS_PER_EMPLOYEE: 8,
  MIN_WEIGHTAGE_PER_GOAL: 10,
  TOTAL_WEIGHTAGE_REQ: 100,
} as const;

export const goalUomTypeSchema = z.enum([
  "numeric_max",
  "numeric_min",
  "percentage_max",
  "percentage_min",
  "timeline",
  "zero_based",
] as const);

export const baseGoalFields = {
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must not exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .nullable(),
  thrust_area: z.string().min(1, "Thrust area is required"),
  uom_type: goalUomTypeSchema,
  
  weightage: z.coerce
    .number()
    .int("Weightage must be a whole number")
    .min(GOAL_LIMITS.MIN_WEIGHTAGE_PER_GOAL, `Minimum weightage per goal is ${GOAL_LIMITS.MIN_WEIGHTAGE_PER_GOAL}%`)
    .max(GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ, `Maximum weightage is ${GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ}%`),

  target_value: z.coerce.number().nullable(),
  achievement_value: z.coerce.number().nullable(),
  
  deadline_date: z.string().nullable(),
};

/** Shared refinement logic for UOM Target rules */
export const uomTargetRefinement = (
  data: { uom_type?: string | null; target_value?: number | null },
  ctx: z.RefinementCtx
) => {
  if (!data.uom_type) return; // Skip if missing (e.g. permissive draft)
  
  if (data.uom_type !== "timeline" && data.uom_type !== "zero_based") {
    if (data.target_value === undefined || data.target_value === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target value is required for this Unit of Measurement",
        path: ["target_value"],
      });
    }
  }
};
