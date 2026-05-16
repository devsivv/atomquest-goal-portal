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
 * Mirrors PostgreSQL goal_status enum.
 */
export type GoalStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

/**
 * Quarterly progress tracking statuses
 * Used during check-in workflows.
 */
export type GoalProgressStatus =
  | "not_started"
  | "on_track"
  | "completed";