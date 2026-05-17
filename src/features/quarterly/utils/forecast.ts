import { NormalizedGoal, QuarterlyCheckin } from "@/types";
import { determineGoalHealth } from "./health";
import { calculateVelocity } from "./trends";

export type ForecastRisk = "On Track" | "Likely Delayed" | "Critical Risk" | "Likely To Exceed";
export type DeliveryConfidence = "High" | "Medium" | "Low";

export interface GoalForecast {
  goalId: string;
  estimatedFinalProgress: number;
  confidence: DeliveryConfidence;
  risk: ForecastRisk;
  recommendedIntervention: string;
}

/**
 * Calculates the current progress velocity in percentage per day.
 */
function getGoalVelocity(goal: NormalizedGoal, checkins: QuarterlyCheckin[]): number {
  if (checkins.length === 0) return 0;
  
  const sorted = [...checkins].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const latest = sorted[sorted.length - 1];
  
  return calculateVelocity(latest.progress_pct, goal.created_at, new Date());
}

/**
 * Estimates the final progress percentage if the current velocity is maintained until the deadline.
 */
export function estimateFinalProgress(goal: NormalizedGoal, checkins: QuarterlyCheckin[]): number {
  const sorted = [...checkins].sort((a, b) => new Date(b.created_at).getTime() - new Date(b.created_at).getTime());
  const latestProgress = sorted.length > 0 ? sorted[sorted.length - 1].progress_pct : 0;
  
  if (latestProgress >= 100) return 100;
  
  const velocity = getGoalVelocity(goal, checkins);
  if (velocity <= 0) return latestProgress;

  if (!goal.deadline_date) return latestProgress; // Can't project without deadline
  
  const now = new Date().getTime();
  const deadline = new Date(goal.deadline_date).getTime();
  
  if (now >= deadline) return latestProgress;
  
  const daysRemaining = (deadline - now) / (1000 * 60 * 60 * 24);
  const projectedProgress = latestProgress + (velocity * daysRemaining);
  
  return Math.min(100, Math.max(latestProgress, Math.round(projectedProgress)));
}

/**
 * Calculates delivery confidence based on check-in frequency and momentum stability.
 */
export function calculateCompletionConfidence(goal: NormalizedGoal, checkins: QuarterlyCheckin[]): DeliveryConfidence {
  if (checkins.length === 0) return "Low";
  if (checkins.length === 1) return "Medium";
  
  const sorted = [...checkins].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // High confidence if we have multiple checkins and they are consistently increasing
  let increasingCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].progress_pct > sorted[i - 1].progress_pct) {
      increasingCount++;
    }
  }
  
  if (increasingCount >= 2) return "High";
  if (sorted[sorted.length - 1].progress_pct === 0) return "Low";
  return "Medium";
}

/**
 * Classifies the deterministic forecast risk.
 */
export function classifyForecastRisk(
  goal: NormalizedGoal, 
  latestCheckin: QuarterlyCheckin | null,
  projectedFinal: number
): ForecastRisk {
  const health = determineGoalHealth(goal, latestCheckin);
  const progress = latestCheckin ? latestCheckin.progress_pct : 0;
  
  if (progress >= 100) return "On Track";
  if (health === "stalled" || health === "not_started") return "Critical Risk";
  if (projectedFinal >= 100) return progress >= 80 ? "Likely To Exceed" : "On Track";
  if (projectedFinal >= 75) return "On Track";
  if (projectedFinal >= 50) return "Likely Delayed";
  
  return "Critical Risk";
}

/**
 * Generates a recommended deterministic intervention.
 */
function recommendIntervention(risk: ForecastRisk, confidence: DeliveryConfidence, progress: number): string {
  if (risk === "Critical Risk") return "Remove blockers / escalate";
  if (risk === "Likely Delayed") return "Schedule checkpoint / reduce scope";
  if (risk === "Likely To Exceed" && progress < 100) return "Recognize execution velocity";
  if (confidence === "Low" && progress > 0) return "Increase check-in frequency";
  return "Continue current support";
}

/**
 * Master predictor for a single goal.
 */
export function predictGoalCompletion(goal: NormalizedGoal, checkins: QuarterlyCheckin[]): GoalForecast {
  const goalCheckins = checkins.filter(c => c.goal_id === goal.id);
  goalCheckins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestCheckin = goalCheckins.length > 0 ? goalCheckins[0] : null;

  const estimatedFinalProgress = estimateFinalProgress(goal, goalCheckins);
  const confidence = calculateCompletionConfidence(goal, goalCheckins);
  const risk = classifyForecastRisk(goal, latestCheckin, estimatedFinalProgress);
  const recommendedIntervention = recommendIntervention(risk, confidence, latestCheckin ? latestCheckin.progress_pct : 0);

  return {
    goalId: goal.id,
    estimatedFinalProgress,
    confidence,
    risk,
    recommendedIntervention
  };
}
