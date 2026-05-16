/**
 * @file types/goals/payloads.ts
 * @description API and form payload contracts for Goal workflows.
 */

import type {
  GoalStatus,
  GoalUomType,
} from "./enums";

/**
 * React Hook Form Payload
 * Highly permissive for autosave and incomplete frontend states.
 */
export interface GoalFormPayload {
  thrust_area?: string;

  title?: string;

  description?: string;

  uom_type?: GoalUomType;

  target_value?: number | string | null;

  weightage?: number;

  deadline_date?: string | null;
}

/**
 * Draft Payload
 * Stored inside the `draft_content` JSONB column.
 * Allows incomplete frontend form persistence safely.
 */
export type GoalDraftPayload = Partial<GoalFormPayload>;

/**
 * Strict validated payload used during final submission.
 * Mirrors required backend business constraints.
 */
export interface GoalSubmissionPayload {
  cycle_id: string;

  thrust_area: string;

  title: string;

  description: string | null;

  uom_type: GoalUomType;

  target_value: number | null;

  weightage: number;

  deadline_date?: string | null;
}

/**
 * Goal update payload
 * Used for manager edits, employee revisions, and approval workflows.
 */
export interface GoalUpdatePayload
  extends Partial<GoalSubmissionPayload> {
  status?: GoalStatus;

  progress?: number;

  achievement_value?: number | null;

  rejected_reason?: string | null;

  draft_content?: GoalDraftPayload | null;

  last_autosaved_at?: string | null;
}