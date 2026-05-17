/**
 * @file types/goals/entities.ts
 * @description Exact representations of strict database rows.
 */

import type { BaseEntity } from "@/types";
import type { GoalStatus, GoalUomType } from "./enums";
import type { GoalReviewAction } from "./approval";

/** 
 * Normalized Goal Entity 
 * Exactly matches the DB row. Extends BaseEntity for ID and timestamps. 
 */
export interface NormalizedGoal extends BaseEntity {
  profile_id: string;
  cycle_id: string;

  // Content
  title: string;
  description: string | null;
  thrust_area: string;
  status: GoalStatus;

  // UOM
  uom_type: GoalUomType;
  target_value: number | null;
  achievement_value: number | null;
  deadline_date: string | null;

  // Progress & weightage
  weightage: number;
  progress: number;

  // Lifecycle — Manager Approval
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  /** Manager's optional comment/feedback stored at review time (maps to DB: review_comment). */
  review_comment: string | null;

  is_locked: boolean;
  is_shared: boolean;

  // Phase 3: Granular lifecycle audit columns
  locked_at: string | null;
  locked_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  last_review_action: GoalReviewAction | null;

  // Autosave tracking
  last_autosaved_at: string | null;
  draft_content: Record<string, unknown> | null;

  // Audit
  deleted_at: string | null;
  deleted_by: string | null;
  created_by: string;
  updated_by: string | null;
}

/** 
 * Compatibility entity for Shared Goals assigned to employees 
 */
export interface SharedGoalAssignment extends BaseEntity {
  shared_goal_id: string;
  goal_id: string;
  profile_id: string;
  is_synced: boolean;
  assigned_by: string;
}

/** 
 * Future compatibility for Quarterly Check-ins 
 */
export interface QuarterlyCheckIn extends BaseEntity {
  goal_id: string;
  cycle_id: string;
  quarter: 1 | 2 | 3 | 4;
  progress: number;
  achievement_value: number | null;
  employee_comments: string | null;
  manager_feedback: string | null;
  status: GoalStatus;
}
