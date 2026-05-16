/**
 * @file features/goals/schemas/submission.schema.ts
 * @description Strict validation for finalizing goals.
 * Enforces NOT NULL constraints matching the PostgreSQL schema.
 */

import { z } from "zod";
import { baseGoalFields, uomTargetRefinement } from "./fields.schema";

/**
 * Submission Schema: Used when clicking "Submit for Approval".
 * Ensures all required fields are present and structurally valid.
 */
export const goalSubmissionSchema = z.object({
  cycle_id: z.string().uuid("Invalid cycle ID"),
  title: baseGoalFields.title,
  description: baseGoalFields.description,
  thrust_area: baseGoalFields.thrust_area,
  uom_type: baseGoalFields.uom_type,
  target_value: baseGoalFields.target_value,
  weightage: baseGoalFields.weightage,
  deadline_date: baseGoalFields.deadline_date,
}).superRefine(uomTargetRefinement);

export type GoalSubmissionInput = z.infer<typeof goalSubmissionSchema>;
