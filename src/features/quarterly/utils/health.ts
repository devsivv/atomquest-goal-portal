import { NormalizedGoal, QuarterlyCheckin } from "@/types";

export type GoalHealth = "healthy" | "at_risk" | "stalled" | "not_started" | "completed";

export function determineGoalHealth(goal: NormalizedGoal, checkin?: QuarterlyCheckin | null): GoalHealth {
  if (!checkin) return "not_started";
  
  const progress = checkin.progress_pct || 0;
  
  if (progress === 100) return "completed";
  
  if (progress === 0) {
    if (!goal.deadline_date) return "stalled";
    const deadline = new Date(goal.deadline_date);
    const now = new Date();
    // If progress is 0 and we are past deadline or close to it, it's stalled
    if (now > deadline) return "stalled";
    return "stalled"; // As per requirements: "progress = 0"
  }
  
  if (goal.deadline_date) {
    const deadline = new Date(goal.deadline_date);
    const now = new Date();
    // Simple heuristic: if we are within 14 days of deadline and progress < 50%
    const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (daysUntilDeadline < 14 && progress < 50) {
      return "at_risk";
    }
    // Or if we are past deadline and not completed
    if (now > deadline && progress < 100) {
      return "at_risk";
    }
  } else {
    // If no deadline, and progress < 25%, call it at risk
    if (progress > 0 && progress < 25) return "at_risk";
  }
  
  return "healthy";
}
