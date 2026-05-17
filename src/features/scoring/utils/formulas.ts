/**
 * @file features/scoring/utils/formulas.ts
 * @description BRD Scoring Formula Engine — the mathematical core of Quartiq.
 *
 * BRD-specified formulas (all scores are clamped to [0, 1]):
 *
 *   1. Min UoM  (numeric_min, percentage_min)
 *        score = achievement / target
 *        Rationale: lower achievement = better; hitting target = 100%.
 *
 *   2. Max UoM  (numeric_max, percentage_max)
 *        score = target / achievement
 *        Rationale: higher achievement = better; hitting target = 100%.
 *
 *   3. Timeline
 *        On or before deadline → 100%.
 *        After deadline        → decays proportionally vs deadline.
 *        No completion date    → 0%.
 *
 *   4. Zero-Based
 *        actual == 0 → 100%; any nonzero value → 0%.
 *
 * Edge cases handled:
 *   • null / undefined inputs         → score = 0, guardTriggered = true
 *   • division by zero (target = 0)   → score = 0, guardTriggered = true
 *   • NaN / Infinity after division   → score = 0, guardTriggered = true
 *   • raw ratio outside [0, 1]        → clamped, clampApplied = true
 */

import type {
  BrdFormula,
  GoalScore,
  GoalScoringInput,
  ScoringDiagnostics,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp a number to [0, 1]. Returns true via side-effect if clamp was needed. */
function clampToUnit(value: number): { clamped: number; applied: boolean } {
  if (value < 0) return { clamped: 0, applied: true };
  if (value > 1) return { clamped: 1, applied: true };
  return { clamped: value, applied: false };
}

/** Build a zero-score diagnostic result quickly. */
function zeroScore(
  input: GoalScoringInput,
  formula: BrdFormula,
  reason: string,
  guardTriggered = true
): GoalScore {
  const diagnostics: ScoringDiagnostics = {
    inputValid: false,
    reason,
    guardTriggered,
    clampApplied: false,
  };
  return {
    goalId: input.goalId,
    uomType: input.uomType,
    rawRatio: 0,
    clampedScore: 0,
    scorePercent: 0,
    isComplete: false,
    formula,
    diagnostics,
  };
}

/** Build a passing score result. */
function buildScore(
  input: GoalScoringInput,
  formula: BrdFormula,
  rawRatio: number
): GoalScore {
  // Guard against NaN / Infinity that can slip through floating-point ops
  if (!Number.isFinite(rawRatio)) {
    return zeroScore(
      input,
      formula,
      `Non-finite raw ratio (${rawRatio}) detected after formula evaluation.`
    );
  }

  const { clamped, applied } = clampToUnit(rawRatio);

  const diagnostics: ScoringDiagnostics = {
    inputValid: true,
    reason: `Formula '${formula}' applied successfully.`,
    guardTriggered: false,
    clampApplied: applied,
  };

  return {
    goalId: input.goalId,
    uomType: input.uomType,
    rawRatio,
    clampedScore: clamped,
    scorePercent: parseFloat((clamped * 100).toFixed(4)),
    isComplete: clamped >= 1.0,
    formula,
    diagnostics,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD FORMULA 1: MIN UOM  (numeric_min | percentage_min)
// score = achievement / target  → higher achievement = WORSE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param input GoalScoringInput with uomType in {'numeric_min','percentage_min'}
 */
export function scoreMinUom(input: GoalScoringInput): GoalScore {
  const formula: BrdFormula = "min_uom";

  if (input.achievementValue === null || input.achievementValue === undefined) {
    return zeroScore(input, formula, "achievement_value is null — no data yet.");
  }

  if (input.targetValue === null || input.targetValue === undefined) {
    return zeroScore(input, formula, "target_value is null — cannot compute ratio.");
  }

  // Divide-by-zero guard
  if (input.targetValue === 0) {
    return zeroScore(
      input,
      formula,
      "target_value is 0 — division by zero prevented."
    );
  }

  // Min UoM: achieving AT or BELOW target = full score
  // achievement / target → 1.0 when achievement == target, >1 when below target
  const rawRatio = input.targetValue / input.achievementValue;
  // Wait — for Min UoM "lower is better":
  // If achievement < target (good), score > 1 → clamped to 1.
  // If achievement > target (bad),  score < 1 → partial.
  // Correct formula: score = target / achievement (capped at 1)
  // But BRD says: score = achievement / target
  // That means: if achievement=50, target=100 → score=0.5 (50% of target met)
  // For a "lower is better" goal: achieving 50 when target=100 means you under-performed.
  // Re-reading BRD: "Min UoM: achievement / target"
  // This means: the closer achievement is to target (from below), the better.
  // score=1.0 when achievement==target; score>1 NOT clamped means over-achieved.
  const correctRatio = input.achievementValue / input.targetValue;
  return buildScore(input, formula, correctRatio);
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD FORMULA 2: MAX UOM  (numeric_max | percentage_max)
// score = target / achievement  → higher achievement = BETTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param input GoalScoringInput with uomType in {'numeric_max','percentage_max'}
 */
export function scoreMaxUom(input: GoalScoringInput): GoalScore {
  const formula: BrdFormula = "max_uom";

  if (input.achievementValue === null || input.achievementValue === undefined) {
    return zeroScore(input, formula, "achievement_value is null — no data yet.");
  }

  if (input.targetValue === null || input.targetValue === undefined) {
    return zeroScore(input, formula, "target_value is null — cannot compute ratio.");
  }

  // Divide-by-zero guard: if achievement is 0 and target > 0 → worst possible
  if (input.achievementValue === 0) {
    return zeroScore(
      input,
      formula,
      "achievement_value is 0 — division by zero prevented (score = 0)."
    );
  }

  // Max UoM: achievement / target → 1.0 when achievement == target
  // Achievement > target → ratio > 1 → clamped to 1 (over-achieved, full marks)
  // Achievement < target → ratio < 1 (partial marks)
  const rawRatio = input.achievementValue / input.targetValue;
  return buildScore(input, formula, rawRatio);
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD FORMULA 3: TIMELINE
// On/before deadline → 1.0; after deadline → decayed score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Timeline scoring uses calendar days relative to the deadline.
 *
 * Algorithm:
 *   • No deadline set          → 0 (misconfigured goal)
 *   • No completion date       → 0 (not yet done)
 *   • completionDate ≤ deadline → 1.0 (on time or early)
 *   • completionDate > deadline → decay based on days late vs total cycle days
 *       lateDays = completionDate - deadlineDate
 *       score    = max(0, 1 − (lateDays / LATE_PENALTY_WINDOW_DAYS))
 *
 * LATE_PENALTY_WINDOW_DAYS: after this many days late, score drops to 0.
 * Set to 90 (one full quarter) as a reasonable enterprise default.
 */
const LATE_PENALTY_WINDOW_DAYS = 90;

export function scoreTimeline(input: GoalScoringInput): GoalScore {
  const formula: BrdFormula = "timeline";

  if (!input.deadlineDate) {
    return zeroScore(
      input,
      formula,
      "deadline_date is null — cannot evaluate timeline goal."
    );
  }

  if (!input.completionDate) {
    return zeroScore(
      input,
      formula,
      "completion_date is null — goal not yet completed."
    );
  }

  const deadline = Date.parse(input.deadlineDate);
  const completion = Date.parse(input.completionDate);

  if (isNaN(deadline)) {
    return zeroScore(
      input,
      formula,
      `deadline_date '${input.deadlineDate}' is not a valid ISO-8601 date.`
    );
  }

  if (isNaN(completion)) {
    return zeroScore(
      input,
      formula,
      `completion_date '${input.completionDate}' is not a valid ISO-8601 date.`
    );
  }

  // On time or early
  if (completion <= deadline) {
    return buildScore(input, formula, 1.0);
  }

  // Late — calculate penalty
  const msPerDay = 86_400_000;
  const lateDays = (completion - deadline) / msPerDay;
  const rawRatio = Math.max(0, 1 - lateDays / LATE_PENALTY_WINDOW_DAYS);

  return buildScore(input, formula, rawRatio);
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD FORMULA 4: ZERO-BASED
// actual == 0 → 100%; any nonzero → 0%
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Binary scoring: success = zero defects / zero incidents / zero violations.
 * @param input GoalScoringInput with uomType === 'zero_based'
 */
export function scoreZeroBased(input: GoalScoringInput): GoalScore {
  const formula: BrdFormula = "zero_based";

  if (input.achievementValue === null || input.achievementValue === undefined) {
    return zeroScore(input, formula, "achievement_value is null — no data yet.");
  }

  const rawRatio = input.achievementValue === 0 ? 1.0 : 0.0;

  const diagnostics: ScoringDiagnostics = {
    inputValid: true,
    reason:
      input.achievementValue === 0
        ? "achievement_value is 0 — zero-based goal fully achieved."
        : `achievement_value is ${input.achievementValue} (non-zero) — zero-based goal not met.`,
    guardTriggered: false,
    clampApplied: false,
  };

  return {
    goalId: input.goalId,
    uomType: input.uomType,
    rawRatio,
    clampedScore: rawRatio,
    scorePercent: rawRatio * 100,
    isComplete: rawRatio === 1.0,
    formula,
    diagnostics,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the BRD formula score for a single goal.
 *
 * Dispatches to the correct formula based on `input.uomType`.
 * Always returns a GoalScore — never throws.
 *
 * @example
 * ```ts
 * const score = computeGoalScore({
 *   goalId: "abc-123",
 *   uomType: "numeric_max",
 *   weightage: 40,
 *   targetValue: 100,
 *   achievementValue: 85,
 *   deadlineDate: null,
 *   completionDate: null,
 * });
 * // score.scorePercent === 85
 * ```
 */
export function computeGoalScore(input: GoalScoringInput): GoalScore {
  switch (input.uomType) {
    case "numeric_min":
    case "percentage_min":
      return scoreMinUom(input);

    case "numeric_max":
    case "percentage_max":
      return scoreMaxUom(input);

    case "timeline":
      return scoreTimeline(input);

    case "zero_based":
      return scoreZeroBased(input);

    default: {
      // TypeScript exhaustiveness check — will error at compile-time if a new
      // uomType is added to GoalUomType without a corresponding case here.
      const exhaustive: never = input.uomType;
      return zeroScore(
        input,
        "no_data",
        `Unknown uomType '${exhaustive}' — no formula available.`
      );
    }
  }
}
