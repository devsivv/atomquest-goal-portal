/**
 * @file features/manager/utils/status.utils.ts
 * @description Label and color mappings for goal statuses in the Manager UI.
 */

import type { GoalStatus } from "@/types";

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting Review",
  under_review: "Under Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  archived: "Archived",
};

export const GOAL_STATUS_COLORS: Record<
  GoalStatus,
  {
    badge: string;
    dot: string;
  }
> = {
  draft: {
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  submitted: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  under_review: {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  revision_requested: {
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  approved: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  completed: {
    badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  archived: {
    badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    dot: "bg-slate-300",
  },
};

/**
 * Returns the status directly since GoalStatus now covers all DB enum values.
 * Kept as a utility for unknown future statuses from the DB.
 */
export function normalizeStatus(status: string): GoalStatus {
  const knownStatuses: GoalStatus[] = [
    "draft", "submitted", "under_review", "revision_requested",
    "approved", "rejected", "completed", "archived",
  ];
  return (knownStatuses.includes(status as GoalStatus) ? status : "draft") as GoalStatus;
}

/** True if the goal is in a final decided state (no further action needed) */
export function isGoalDecided(status: GoalStatus): boolean {
  return status === "approved" || status === "rejected" || status === "completed" || status === "archived";
}

/** True if the goal needs manager review */
export function isGoalPending(status: GoalStatus): boolean {
  return status === "submitted" || status === "under_review";
}

/** True if the goal needs employee re-work */
export function isGoalRevision(status: GoalStatus): boolean {
  return status === "revision_requested";
}
