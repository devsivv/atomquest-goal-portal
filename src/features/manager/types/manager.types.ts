/**
 * @file features/manager/types/manager.types.ts
 * @description Manager-specific domain types for the approval workflow.
 * These are VIEW types — projections of DB data for UI consumption.
 * They do NOT replace the canonical 7-field model in types/goals/.
 */

import type { NormalizedGoal } from "@/types";

/**
 * Payload sent when a manager approves or rejects a goal.
 * Maps directly to the RPC function parameters.
 */
export interface ManagerApprovalPayload {
  goalId: string;
  action: "approve" | "reject" | "request_revision";
  /** Mandatory for reject/request_revision (min 10 chars). */
  reason?: string;
  /**
   * Optional public comment shown to the employee.
   * For approve: serves as positive feedback.
   * For reject/revision: adds context beyond the mandatory reason.
   */
  comment?: string;
}

/**
 * A team member profile with their submitted goals for the current cycle.
 * Fetched by the Manager Dashboard to render the review queue.
 */
export interface TeamMemberGoalGroup {
  profileId: string;
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  avatarUrl: string | null;
  /** All submitted goals for this employee in the active cycle */
  goals: NormalizedGoal[];
  /** Computed: true only if every goal is non-draft (submitted/approved/rejected) */
  isFullyReviewed: boolean;
  totalWeightage: number;
}

/**
 * Summary counts for the Manager Dashboard stats banner.
 */
export interface ManagerDashboardStats {
  totalTeamMembers: number;
  pendingReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
}
