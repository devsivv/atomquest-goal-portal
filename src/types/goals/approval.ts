/**
 * @file types/goals/approval.ts
 * @description TypeScript entity types for the Phase 3 approval persistence layer.
 * Mirrors the DB tables: goal_approval_logs and manager_comments.
 */

/** Valid action labels stored in goal_approval_logs.action */
export type GoalApprovalAction =
  | "submitted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "revision_submitted"
  | "locked"
  | "unlocked"
  | "bulk_approved";

/** Valid values for goals.last_review_action */
export type GoalReviewAction =
  | "approved"
  | "rejected"
  | "revision_requested"
  | "unlocked";

/**
 * Immutable approval timeline entry.
 * Mirrors the goal_approval_logs DB table exactly.
 * Never mutated after INSERT.
 */
export interface GoalApprovalLog {
  id: string;
  goal_id: string;
  actor_id: string;
  action: GoalApprovalAction;
  from_status: string; // goal_status — kept as string for forward compat
  to_status: string;
  comment: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string; // ISO 8601 — no updated_at (immutable)
}

/**
 * Manager comment on a goal.
 * Mirrors the manager_comments DB table exactly.
 * is_internal=TRUE means the comment is hidden from the goal's employee.
 */
export interface ManagerComment {
  id: string;
  goal_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GoalApprovalLog enriched with the actor's profile for UI display.
 * Fetched via a join in the timeline service method.
 */
export interface GoalApprovalLogWithActor extends GoalApprovalLog {
  actor: {
    id: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
  } | null;
}

/**
 * ManagerComment enriched with author profile for UI display.
 */
export interface ManagerCommentWithAuthor extends ManagerComment {
  author: {
    id: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Payload for the approve_goal_sheet RPC.
 */
export interface ApproveGoalSheetInput {
  p_goal_id: string;
  p_manager_id: string;
  p_comment?: string | null;
}

/**
 * Payload for the reject_goal_sheet RPC.
 */
export interface RejectGoalSheetInput {
  p_goal_id: string;
  p_manager_id: string;
  p_reason: string;
  p_comment?: string | null;
}

/**
 * Payload for the request_goal_revision RPC.
 */
export interface RequestRevisionInput {
  p_goal_id: string;
  p_manager_id: string;
  p_reason: string;
  p_comment?: string | null;
}
