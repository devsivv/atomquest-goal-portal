/**
 * @file types/goals/enums.ts
 * @description Centralized domain enums for Goal workflows.
 */

/**
 * Goal Unit of Measurement Types
 * Mirrors PostgreSQL goal_uom_type enum.
 */
export type GoalUomType =
  | "numeric_max"
  | "numeric_min"
  | "percentage_max"
  | "percentage_min"
  | "timeline"
  | "zero_based";

/**
 * Goal lifecycle statuses
 * Mirrors PostgreSQL goal_status enum (full set).
 * The frontend may display a simplified 4-state view via normalizeStatus().
 */
export type GoalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "completed"
  | "archived";

/**
 * Quarterly progress tracking statuses
 * Used during check-in workflows.
 */
export type GoalProgressStatus =
  | "not_started"
  | "on_track"
  | "completed";