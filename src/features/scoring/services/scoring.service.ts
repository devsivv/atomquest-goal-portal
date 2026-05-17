/**
 * @file features/scoring/services/scoring.service.ts
 * @description High-level service linking the scoring domain to the persistence layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GoalScoringInput,
  CycleScore,
  QuarterLabel,
  QuarterlyCheckin,
  QuarterlyGoalUpdate,
  NormalizedGoal
} from "@/types";
import { computeCycleScore } from "../utils/weightedScore";

export class ScoringService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Calculates the real-time cycle score given the current database entities.
   * Maps DB entities into GoalScoringInput and executes the BRD scoring engine.
   *
   * @param employeeId The ID of the employee being scored.
   * @param cycleId The ID of the performance cycle.
   * @param quarter The quarter for which the score is being computed.
   * @param goals An array of normalized goals (should be approved and locked).
   * @param updates Array of quarterly goal updates containing actuals.
   * @param checkins Array of quarterly checkins.
   */
  public calculateRealtimeScore(
    employeeId: string,
    cycleId: string,
    quarter: QuarterLabel,
    goals: NormalizedGoal[],
    updates: QuarterlyGoalUpdate[],
    checkins: QuarterlyCheckin[]
  ): CycleScore {
    
    const inputs: GoalScoringInput[] = goals.map(goal => {
      // Find the checkin for this specific goal and quarter
      const checkin = checkins.find(c => c.goal_id === goal.id && c.quarter === quarter);
      // Find the associated update
      const update = checkin ? updates.find(u => u.checkin_id === checkin.id) : undefined;
      
      // Determine completion date (used mainly for timeline goals)
      // Since QuarterlyGoalUpdate does not have a strict completionDate, we use updatedAt
      // as a surrogate for when the actuals were finalized.
      let completionDate: string | null = null;
      if (update && update.updated_at) {
        completionDate = update.updated_at;
      } else if (checkin && checkin.updated_at) {
        completionDate = checkin.updated_at;
      }

      return {
        goalId: goal.id,
        uomType: goal.uom_type,
        weightage: goal.weightage,
        targetValue: goal.target_value,
        achievementValue: update?.actual_value ?? null,
        deadlineDate: goal.deadline_date,
        completionDate,
      };
    });

    return computeCycleScore(employeeId, cycleId, quarter, inputs);
  }
}
