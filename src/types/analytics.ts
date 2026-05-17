/** Analytics types for Phase 5 Step 3 — HR/Admin Completion Dashboard */

import type { QuarterLabel } from "./cycles";

export interface OrgCompletionKpis {
  totalEmployees: number;
  totalGoals: number;
  submittedGoals: number;
  approvedGoals: number;
  pendingApprovalGoals: number;
  overdueApprovals: number;        // submitted > 5 business days ago
  submissionRate: number;          // % employees who submitted goals
  avgGoalProgress: number;         // average progress_pct across all check-ins
}

// ─── Goal submission by employee ─────────────────────────────────────────────
export interface EmployeeSubmissionRow {
  profileId: string;
  fullName: string;
  employeeId: string | null;
  department: string | null;
  managerName: string | null;
  totalGoals: number;
  submittedCount: number;
  approvedCount: number;
  pendingCount: number;
  hasSubmitted: boolean;
}

// ─── Quarterly check-in tracking ─────────────────────────────────────────────
export interface CheckinCompletionRow {
  profileId: string;
  fullName: string;
  department: string | null;
  quarter: QuarterLabel;
  checkinStatus: 'draft' | 'submitted' | 'acknowledged' | 'not_started';
  progressPct: number | null;
  submittedAt: string | null;
  acknowledgedBy: string | null;
}

// ─── Overdue approvals ────────────────────────────────────────────────────────
export interface OverdueApprovalRow {
  goalId: string;
  goalTitle: string;
  employeeName: string;
  department: string | null;
  managerName: string | null;
  submittedAt: string;
  daysOverdue: number;
  status: string;
}

// ─── Department heatmap ───────────────────────────────────────────────────────
export interface DeptHeatmapRow {
  department: string;
  totalEmployees: number;
  submittedGoals: number;
  approvedGoals: number;
  q1Progress: number;
  q2Progress: number;
  q3Progress: number;
  q4Progress: number;
  avgProgress: number;
}

// ─── Manager effectiveness ────────────────────────────────────────────────────
export interface ManagerEffectivenessRow {
  managerId: string;
  managerName: string;
  teamSize: number;
  pendingReviews: number;
  avgReviewDays: number;        // avg calendar days from submitted → approved
  approvedCount: number;
  rejectedCount: number;
  ackRate: number;              // % check-ins acknowledged
}
