/**
 * @file types/goals/quarterly.ts
 * @description TypeScript contracts for the quarterly check-in workflow layer.
 *
 * These types are the TypeScript mirror of the Phase 4 DB tables:
 *   - quarterly_checkins
 *   - quarterly_goal_updates
 *   - quarterly_checkin_audit_logs
 *
 * They are kept separate from scoring.ts to maintain a clean separation:
 *   quarterly.ts → persistence / workflow shapes
 *   scoring.ts   → calculation / computation shapes
 */

import type { QuarterLabel } from "./scoring";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CORE DB MIRRORS
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors the quarterly_checkins DB row. */
export interface QuarterlyCheckin {
  id: string;
  goal_id: string;
  employee_id: string;
  quarter: QuarterLabel;
  progress_pct: number; // 0–100
  employee_notes: string | null;
  checkin_status: CheckinStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Valid workflow states for a quarterly check-in. */
export type CheckinStatus = "draft" | "submitted" | "acknowledged";

/** Mirrors the quarterly_goal_updates DB row. */
export interface QuarterlyGoalUpdate {
  id: string;
  checkin_id: string;
  goal_id: string;
  employee_id: string;
  quarter: QuarterLabel;
  actual_value: number | null;
  actual_pct: number | null;
  evidence_notes: string | null;
  blockers: string | null;
  manager_score: number | null; // 0.0–5.0
  manager_feedback: string | null;
  scored_by: string | null;
  scored_at: string | null;
  metadata: Record<string, unknown>;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Mirrors the quarterly_checkin_audit_logs DB row. */
export interface QuarterlyCheckinAuditLog {
  id: string;
  checkin_id: string;
  goal_id: string;
  actor_id: string;
  quarter: QuarterLabel;
  action: CheckinAuditAction;
  from_status: string | null;
  to_status: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string; // immutable — no updatedAt
}

/** Valid audit action codes stored in quarterly_checkin_audit_logs.action. */
export type CheckinAuditAction =
  | "checkin_created"
  | "checkin_updated"
  | "checkin_submitted"
  | "checkin_acknowledged"
  | "checkin_deleted"
  | "update_scored";

// ─────────────────────────────────────────────────────────────────────────────
// 2. RPC PAYLOAD TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Input payload for the upsert_quarterly_checkin Supabase RPC. */
export interface UpsertCheckinPayload {
  p_goal_id: string;
  p_quarter: QuarterLabel;
  p_progress_pct: number;
  p_notes?: string | null;
  p_submit?: boolean; // true → status transitions to 'submitted'
}

/** Input payload for the acknowledge_quarterly_checkin Supabase RPC. */
export interface AcknowledgeCheckinPayload {
  p_checkin_id: string;
  p_manager_id: string;
  p_manager_score?: number | null;
  p_manager_feedback?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENRICHED VIEW TYPES (for UI / service layer joins)
// ─────────────────────────────────────────────────────────────────────────────

/** QuarterlyCheckin with the associated QuarterlyGoalUpdate (if exists). */
export interface CheckinWithUpdate extends QuarterlyCheckin {
  update: QuarterlyGoalUpdate | null;
}

/** Full check-in timeline: check-in + update + audit trail. */
export interface CheckinTimeline {
  checkin: QuarterlyCheckin;
  update: QuarterlyGoalUpdate | null;
  auditLogs: QuarterlyCheckinAuditLog[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. QUARTERLY WORKFLOW STATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregated workflow snapshot for all goals in a given quarter.
 * Used by the employee and manager dashboards.
 */
export interface QuarterlyWorkflowState {
  employeeId: string;
  quarter: QuarterLabel;

  /** One entry per goal in the approved set. */
  goals: QuarterlyGoalState[];

  /** Derived counts. */
  summary: QuarterlyWorkflowSummary;
}

export interface QuarterlyGoalState {
  goalId: string;
  title: string;
  weightage: number;
  checkin: QuarterlyCheckin | null; // null if not yet created
  update: QuarterlyGoalUpdate | null;
}

export interface QuarterlyWorkflowSummary {
  total: number;
  notStarted: number;
  draft: number;
  submitted: number;
  acknowledged: number;
  allAcknowledged: boolean; // true when every goal is acknowledged
  completionPercent: number; // acknowledged / total × 100
}
