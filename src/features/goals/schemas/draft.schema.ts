/**
 * @file features/goals/schemas/draft.schema.ts
 * @description Permissive validation for autosaves. 
 * Allows incomplete forms to be persisted safely as JSONB drafts.
 */

import { z } from "zod";
import { baseGoalFields } from "./fields.schema";

/**
 * Draft Schema: All fields are optional/partial.
 * Used exclusively for validating data before writing to the JSONB draft_content column.
 */
export const goalDraftSchema = z.object({
  title: baseGoalFields.title.optional().or(z.literal("")),
  description: baseGoalFields.description.optional(),
  thrust_area: baseGoalFields.thrust_area.optional().or(z.literal("")),
  uom_type: baseGoalFields.uom_type.optional(),
  
  // Use coerce to handle empty string inputs gracefully during draft
  weightage: z.coerce.number().optional().or(z.string().max(0)),
  target_value: z.coerce.number().nullable().optional().or(z.string().max(0)),
  
  deadline_date: z.string().nullable().optional().or(z.literal("")),
}).partial();

export type GoalDraftInput = z.infer<typeof goalDraftSchema>;
