/**
 * @file features/scoring/utils/progressCalc.ts
 * @description Logic for computing user-friendly progress percentages and labels.
 *
 * This layer sits above the raw BRD formulas. While a BRD score might evaluate to 0 
 * (e.g., if a goal is overdue or underperforming), the *progress* metric answers:
 * "How far along is the employee?" independent of min/max formula constraints.
 */

import type { GoalProgress, GoalScoringInput, ProgressLabel } from "@/types";
import { computeGoalScore } from "./formulas";

/**
 * Computes display-friendly progress information for a single goal.
 *
 * @param input The goal scoring input, containing target, actuals, and dates.
 * @returns A structured GoalProgress object with a clamped [0, 100] percentage
 *          and a contextual UI label.
 */
export function computeGoalProgress(input: GoalScoringInput): GoalProgress {
  // Leverage the core BRD formula to get the mathematical evaluation.
  const score = computeGoalScore(input);
  const progressPercent = score.scorePercent;

  let daysRemaining: number | null = null;
  let isOverdue = false;
  let progressLabel: ProgressLabel = "Not Started";

  // Calculate timeline-specific metadata
  if (input.deadlineDate) {
    const deadline = Date.parse(input.deadlineDate);
    if (!isNaN(deadline)) {
      const now = Date.now();
      const msPerDay = 86_400_000;
      daysRemaining = Math.ceil((deadline - now) / msPerDay);
      
      // If past deadline and not completed
      if (daysRemaining < 0 && !input.completionDate) {
        isOverdue = true;
      }
    }
  }

  // Determine contextual progress label
  const hasData =
    input.achievementValue !== null || input.completionDate !== null;

  if (!hasData) {
    progressLabel = isOverdue ? "Overdue" : "Not Started";
  } else if (score.isComplete) {
    progressLabel = "Completed";
  } else if (isOverdue) {
    progressLabel = "Overdue";
  } else if (progressPercent > 0 && progressPercent < 100) {
    // If progress is greater than 0 but not 100, they are in progress.
    // Further refinement (e.g. "At Risk" vs "On Track") can be calculated
    // by comparing progressPercent against time elapsed in the quarter.
    progressLabel = "In Progress";
  } else {
    progressLabel = "In Progress";
  }

  return {
    goalId: input.goalId,
    progressPercent,
    progressLabel,
    daysRemaining,
    isOverdue,
  };
}
