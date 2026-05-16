/**
 * @file features/goals/schemas/collection.schema.ts
 * @description Cross-array validation logic to enforce multi-goal business rules.
 */

import { z } from "zod";
import { GOAL_LIMITS } from "./fields.schema";
import { goalSubmissionSchema } from "./submission.schema";

/**
 * Validates a collection of submitted goals.
 * Enforces BRD rules:
 * 1. Maximum 8 goals
 * 2. Total weightage exactly 100%
 */
export const goalCollectionSchema = z
  .array(goalSubmissionSchema)
  .max(
    GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE,
    `Maximum of ${GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE} goals allowed per cycle`
  )
  .superRefine((goals, ctx) => {
    // Skip checking total weightage if the array is completely empty 
    // (though usually we require at least 1 goal to submit a cycle)
    if (goals.length === 0) return;

    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);

    if (totalWeightage !== GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total weightage must equal ${GOAL_LIMITS.TOTAL_WEIGHTAGE_REQ}%. Currently at ${totalWeightage}%.`,
        // We attach the path to the entire array, but a frontend could use this to show a global banner.
        path: ["root"], 
      });
    }
  });

export type GoalCollectionInput = z.infer<typeof goalCollectionSchema>;
