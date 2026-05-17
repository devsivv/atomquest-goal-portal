/**
 * @file features/scoring/utils/quarterlyWorkflow.ts
 * @description Orchestrates the creation of QuarterlyWorkflowState from raw DB rows.
 *
 * This utility maps arrays of NormalizedGoal, QuarterlyCheckin, and QuarterlyGoalUpdate
 * into a single unified QuarterlyWorkflowState, calculating workflow summaries
 * and identifying missing checkpoints.
 */

import type {
  NormalizedGoal,
  QuarterlyCheckin,
  QuarterlyGoalUpdate,
  QuarterlyWorkflowState,
  QuarterLabel,
  QuarterlyGoalState,
  QuarterlyWorkflowSummary,
} from "@/types";

/**
 * Builds a structured workflow state for a specific employee and quarter.
 * 
 * Only goals that are in the "approved" and "locked" state are included in the workflow,
 * as per the immutable goal invariants defined in Phase 4.
 */
export function buildQuarterlyWorkflowState(
  employeeId: string,
  quarter: QuarterLabel,
  goals: NormalizedGoal[],
  checkins: QuarterlyCheckin[],
  updates: QuarterlyGoalUpdate[]
): QuarterlyWorkflowState {
  
  // Rule: Quarterly check-ins can only happen against approved and locked goals.
  const approvedGoals = goals.filter(g => g.status === "approved" && g.is_locked);
  
  let notStartedCount = 0;
  let draftCount = 0;
  let submittedCount = 0;
  let acknowledgedCount = 0;

  const goalStates: QuarterlyGoalState[] = approvedGoals.map(goal => {
    const checkin = checkins.find(c => c.goal_id === goal.id && c.quarter === quarter) || null;
    const update = checkin ? (updates.find(u => u.checkin_id === checkin.id) || null) : null;

    if (!checkin) {
      notStartedCount++;
    } else if (checkin.checkin_status === "draft") {
      draftCount++;
    } else if (checkin.checkin_status === "submitted") {
      submittedCount++;
    } else if (checkin.checkin_status === "acknowledged") {
      acknowledgedCount++;
    }

    return {
      goalId: goal.id,
      title: goal.title,
      weightage: goal.weightage,
      checkin,
      update
    };
  });

  const total = goalStates.length;
  const allAcknowledged = total > 0 && acknowledgedCount === total;
  
  // Calculate completion percent based on acknowledged check-ins vs total expected
  const completionPercent = total > 0 ? (acknowledgedCount / total) * 100 : 0;

  const summary: QuarterlyWorkflowSummary = {
    total,
    notStarted: notStartedCount,
    draft: draftCount,
    submitted: submittedCount,
    acknowledged: acknowledgedCount,
    allAcknowledged,
    completionPercent: parseFloat(completionPercent.toFixed(2))
  };

  return {
    employeeId,
    quarter,
    goals: goalStates,
    summary
  };
}
