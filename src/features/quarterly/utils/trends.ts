import { QuarterlyCheckin, QuarterlyGoalUpdate } from "@/types";

/**
 * Calculates the execution momentum of a specific goal.
 * Momentum is positive if recent check-ins show consistent progress increases.
 * 
 * @param checkins Ordered list of checkins for a single goal
 * @returns A number representing momentum (positive means accelerating, negative means decelerating, 0 is static)
 */
export function calculateMomentum(checkins: QuarterlyCheckin[]): number {
  if (checkins.length < 2) return 0;
  
  // Sort from oldest to newest
  const sorted = [...checkins].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Look at the delta between the last two checkins
  const last = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  
  return last.progress_pct - previous.progress_pct;
}

/**
 * Calculates the quarterly trend across the entire team or an individual.
 * Compares average progress from the previous quarter to the current quarter.
 * 
 * @param previousQuarterCheckins Checkins from the previous quarter
 * @param currentQuarterCheckins Checkins from the current quarter
 * @returns Percentage difference in average progress
 */
export function calculateQuarterTrend(
  previousQuarterCheckins: QuarterlyCheckin[], 
  currentQuarterCheckins: QuarterlyCheckin[]
): number {
  if (previousQuarterCheckins.length === 0 || currentQuarterCheckins.length === 0) return 0;

  const prevAvg = previousQuarterCheckins.reduce((sum, c) => sum + c.progress_pct, 0) / previousQuarterCheckins.length;
  const currAvg = currentQuarterCheckins.reduce((sum, c) => sum + c.progress_pct, 0) / currentQuarterCheckins.length;

  return currAvg - prevAvg;
}

/**
 * Calculates the velocity of execution.
 * Velocity = progress percentage divided by days elapsed since start of cycle or quarter.
 * 
 * @param progressPct Current progress percentage
 * @param startDate Date the execution started
 * @param endDate Current evaluation date (usually today)
 * @returns Average progress percentage per day
 */
export function calculateVelocity(progressPct: number, startDate: string | Date, endDate: string | Date = new Date()): number {
  if (progressPct <= 0) return 0;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const daysElapsed = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

  return progressPct / daysElapsed;
}

/**
 * Compares three sequential check-ins to determine if execution velocity is accelerating.
 */
export function calculateAcceleration(checkins: QuarterlyCheckin[]): number {
  if (checkins.length < 3) return 0;

  const sorted = [...checkins].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const newest = sorted[sorted.length - 1];
  const middle = sorted[sorted.length - 2];
  const oldest = sorted[sorted.length - 3];

  const recentDelta = newest.progress_pct - middle.progress_pct;
  const oldDelta = middle.progress_pct - oldest.progress_pct;

  return recentDelta - oldDelta;
}

/**
 * Detects if a goal has regressed (meaning progress has stalled or velocity has dropped significantly)
 * after initially showing strong momentum.
 */
export function detectRegression(checkins: QuarterlyCheckin[]): boolean {
  if (checkins.length < 3) return false;

  const sorted = [...checkins].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // If earlier updates showed high progress but the last delta is near zero
  const lastDelta = sorted[sorted.length - 1].progress_pct - sorted[sorted.length - 2].progress_pct;
  const initialDelta = sorted[1].progress_pct - sorted[0].progress_pct;

  return initialDelta > 10 && lastDelta <= 2;
}

/**
 * Detects positive or negative momentum shifts across sequential updates.
 */
export function detectMomentumShift(checkins: QuarterlyCheckin[]): "Accelerating" | "Stalling" | "Stable" {
  const acceleration = calculateAcceleration(checkins);
  if (acceleration > 5) return "Accelerating";
  if (acceleration < -5) return "Stalling";
  return "Stable";
}
