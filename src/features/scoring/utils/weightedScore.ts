/**
 * @file features/scoring/utils/weightedScore.ts
 * @description Weighted score aggregation across a full goal cycle.
 *
 * Responsibilities:
 *   1. Take an array of GoalScoringInput (all goals in a cycle / quarter).
 *   2. Compute individual BRD scores via `computeGoalScore`.
 *   3. Compute each goal's weighted contribution: clampedScore × (weightage/100).
 *   4. Aggregate into a CycleScore with normalization and metadata.
 *
 * Normalization rationale:
 *   Some goals may have null achievement data (employee hasn't reported yet).
 *   A naive sum would penalise employees for incomplete data.
 *   We normalize: finalScore = rawAggregateScore / totalWeightCovered
 *   where totalWeightCovered = sum of weightFractions that had real data.
 *   This keeps partial-quarter scores fair and comparable.
 *
 * Integrity checks:
 *   • Negative / zero weightage → logged as warning, treated as 0 contribution.
 *   • totalWeightCovered = 0    → finalScorePercent = 0 (avoids /0).
 *   • NaN guards at every arithmetic step.
 */

import type {
  CycleScore,
  CycleScoreMeta,
  GoalScoringInput,
  QuarterLabel,
  WeightedGoalContribution,
} from "@/types";
import { computeGoalScore } from "./formulas";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when a goal's scoring input has real achievement data. */
function hasData(input: GoalScoringInput): boolean {
  switch (input.uomType) {
    case "timeline":
      return input.completionDate !== null && input.completionDate !== undefined;
    case "zero_based":
    case "numeric_max":
    case "numeric_min":
    case "percentage_max":
    case "percentage_min":
      return (
        input.achievementValue !== null && input.achievementValue !== undefined
      );
    default:
      return false;
  }
}

/**
 * Safe division: returns `numerator / denominator`.
 * Returns 0 if denominator is 0 or result is non-finite.
 */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL WEIGHTED CONTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the weighted contribution of a single goal to the cycle score.
 *
 * contribution = clampedScore × (weightage / 100)
 *
 * If weightage is invalid (≤ 0), contribution is forced to 0 and the
 * goalScore still carries the diagnostic so callers can surface warnings.
 */
export function computeWeightedContribution(
  input: GoalScoringInput
): WeightedGoalContribution {
  const goalScore = computeGoalScore(input);

  // Guard: weightage must be a positive number
  const sanitizedWeightage =
    input.weightage > 0 && Number.isFinite(input.weightage)
      ? input.weightage
      : 0;

  const weightFraction = sanitizedWeightage / 100;
  const contribution = goalScore.clampedScore * weightFraction;

  return {
    goalId: input.goalId,
    weightage: sanitizedWeightage,
    weightFraction: parseFloat(weightFraction.toFixed(6)),
    goalScore,
    contribution: parseFloat(contribution.toFixed(6)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE / QUARTER AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the full weighted aggregate score for an employee's cycle.
 *
 * @param employeeId  UUID of the employee being scored.
 * @param cycleId     UUID of the performance cycle.
 * @param quarter     The quarter being evaluated.
 * @param inputs      All goal scoring inputs for this employee in this quarter.
 *                    Must belong to the same cycle (caller's responsibility).
 *
 * @returns CycleScore — fully typed aggregate with per-goal contributions,
 *          a normalized final score, and rich metadata.
 */
export function computeCycleScore(
  employeeId: string,
  cycleId: string,
  quarter: QuarterLabel,
  inputs: GoalScoringInput[]
): CycleScore {
  if (inputs.length === 0) {
    return buildEmptyCycleScore(employeeId, cycleId, quarter);
  }

  // ── Step 1: Compute individual weighted contributions ──────────────────
  const goalContributions = inputs
    .map(computeWeightedContribution)
    .sort((a, b) => b.weightage - a.weightage); // descending by weightage

  // ── Step 2: Separate goals with/without data ───────────────────────────
  const goalsWithData = inputs.filter(hasData);
  const goalsWithNoData = inputs.length - goalsWithData.length;

  // ── Step 3: Aggregate raw score ────────────────────────────────────────
  const rawAggregateScore = goalContributions.reduce(
    (sum, gc) => sum + gc.contribution,
    0
  );

  // Total weight fraction covered (only goals that have data count toward coverage)
  const totalWeightCovered = goalContributions
    .filter((gc) => hasData(inputs.find((i) => i.goalId === gc.goalId)!))
    .reduce((sum, gc) => sum + gc.weightFraction, 0);

  // ── Step 4: Normalize ──────────────────────────────────────────────────
  // Avoid penalizing employees for goals with no data yet.
  // If ALL goals have data → totalWeightCovered ≈ 1.0 → normalization is a no-op.
  // If SOME goals have no data → we scale up proportionally.
  const normalizedScore = safeDivide(rawAggregateScore, totalWeightCovered);

  // Final display score — clamp to [0, 100] and round to 2 dp
  const finalScorePercent = parseFloat(
    Math.min(100, Math.max(0, normalizedScore * 100)).toFixed(2)
  );

  // ── Step 5: Sum of all declared weightages (sanity check) ──────────────
  const sumOfAllWeights = goalContributions.reduce(
    (sum, gc) => sum + gc.weightFraction,
    0
  );

  const meta: CycleScoreMeta = {
    goalsScored: inputs.length,
    goalsWithNoData,
    computedAt: new Date().toISOString(),
    isPartial: goalsWithNoData > 0,
  };

  return {
    employeeId,
    cycleId,
    quarter,
    goalContributions,
    totalWeightCovered: parseFloat(sumOfAllWeights.toFixed(6)),
    rawAggregateScore: parseFloat(rawAggregateScore.toFixed(6)),
    normalizedScore: parseFloat(normalizedScore.toFixed(6)),
    finalScorePercent,
    meta,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASE: EMPTY CYCLE
// ─────────────────────────────────────────────────────────────────────────────

function buildEmptyCycleScore(
  employeeId: string,
  cycleId: string,
  quarter: QuarterLabel
): CycleScore {
  return {
    employeeId,
    cycleId,
    quarter,
    goalContributions: [],
    totalWeightCovered: 0,
    rawAggregateScore: 0,
    normalizedScore: 0,
    finalScorePercent: 0,
    meta: {
      goalsScored: 0,
      goalsWithNoData: 0,
      computedAt: new Date().toISOString(),
      isPartial: false,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the sum of all goal weightages equals 100 (±0.01 tolerance
 * for floating-point rounding).
 *
 * @returns true if weights are valid.
 */
export function validateWeightageSum(inputs: GoalScoringInput[]): boolean {
  const total = inputs.reduce((sum, i) => sum + (i.weightage ?? 0), 0);
  return Math.abs(total - 100) < 0.01;
}

/**
 * Returns the top-N goal contributors by weighted contribution (descending).
 * Useful for highlighting top performers in UI dashboards.
 */
export function topContributors(
  cycle: CycleScore,
  n: number = 3
): WeightedGoalContribution[] {
  return [...cycle.goalContributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, n);
}
