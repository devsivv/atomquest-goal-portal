import { NormalizedGoal, QuarterlyCheckin } from "@/types";
import { determineGoalHealth } from "./health";

export type AlertSeverity = "urgent" | "action_needed" | "notice";

export interface ManagerAlert {
  id: string;
  goalId: string;
  employeeId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  type: "overdue" | "stalled" | "no_updates" | "near_deadline";
}

/**
 * Generates highly actionable alerts for managers to act upon immediately.
 * Differs from insights (which provide executive intelligence) by focusing strictly
 * on blockers, overdue items, and stalled executions requiring direct intervention.
 */
export function generateManagerAlerts(goals: NormalizedGoal[], checkins: QuarterlyCheckin[]): ManagerAlert[] {
  const alerts: ManagerAlert[] = [];
  const now = new Date();

  goals.forEach(goal => {
    const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
    goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestCheckin = goalCheckins[0] || null;

    const health = determineGoalHealth(goal, latestCheckin);
    const progress = latestCheckin ? latestCheckin.progress_pct : 0;
    
    // 1. Overdue: Deadline has passed, but progress is not 100%
    if (goal.deadline_date && new Date(goal.deadline_date) < now && progress < 100) {
      alerts.push({
        id: `alert-overdue-${goal.id}`,
        goalId: goal.id,
        employeeId: goal.profile_id,
        title: "Goal Overdue",
        message: `"${goal.title}" is past its deadline but only at ${progress}% completion.`,
        severity: "urgent",
        type: "overdue"
      });
      return; // Skip other alerts for this goal if it's already overdue (highest severity)
    }

    // 2. Stalled: Progress is 0 or health explicitly stalled
    if (health === "stalled" && progress === 0) {
      alerts.push({
        id: `alert-stalled-${goal.id}`,
        goalId: goal.id,
        employeeId: goal.profile_id,
        title: "Execution Stalled",
        message: `"${goal.title}" has not started and is marked as stalled.`,
        severity: "action_needed",
        type: "stalled"
      });
      return;
    }

    // 3. No Updates: No checkins at all despite being an active goal
    if (!latestCheckin) {
      alerts.push({
        id: `alert-no-updates-${goal.id}`,
        goalId: goal.id,
        employeeId: goal.profile_id,
        title: "Missing Check-ins",
        message: `"${goal.title}" has no progress updates recorded.`,
        severity: "action_needed",
        type: "no_updates"
      });
      return;
    }

    // 4. Near Deadline: Less than 14 days left and progress < 80%
    if (goal.deadline_date) {
      const daysUntilDeadline = (new Date(goal.deadline_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 14 && progress < 80) {
        alerts.push({
          id: `alert-near-deadline-${goal.id}`,
          goalId: goal.id,
          employeeId: goal.profile_id,
          title: "Approaching Deadline",
          message: `"${goal.title}" is due in ${Math.ceil(daysUntilDeadline)} days but is only ${progress}% complete.`,
          severity: "notice",
          type: "near_deadline"
        });
      }
    }
  });

  // Sort by severity (urgent > action_needed > notice)
  const severityWeight = { urgent: 3, action_needed: 2, notice: 1 };
  return alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
}
