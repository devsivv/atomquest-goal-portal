/**
 * @file types/goals/scoring.ts
 * @description TypeScript domain contracts for the Quartiq Scoring Engine.
 *
 * Design principles:
 *  - Every public function input/output is fully typed — no implicit `any`.
 *  - Formulas are BRD-faithful: Min UoM, Max UoM, Timeline, Zero-Based.
 *  - Score values are always in the range [0, 1] internally and are
 *    converted to [0, 100] only at the presentation boundary.
 *  - WeightedScore accumulates individual goal scores across a cycle.
 */

import type { GoalUomType } from "./enums";

// ─────────────────────────────────────────────────────────────────────────────
// 1. RAW SCORING INPUTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All data required by the scoring engine for a single goal.
 * Sourced from: goals row + quarterly_goal_updates row.
 */
export interface GoalScoringInput {
  /** Unique goal identifier — carried through for traceability. */
  goalId: string;

  /** BRD formula selector. */
  uomType: GoalUomType;

  /** Employee's goal contribution weight (0–100, must sum to 100 across cycle). */
  weightage: number; // percentage points

  /** Numeric target set at goal-creation time. Null for timeline / zero_based. */
  targetValue: number | null;

  /** Actual measured achievement. Null when not yet reported. */
  achievementValue: number | null;

  // ── Timeline-specific fields ─────────────────────────────────────────────
  /** ISO-8601 date the employee committed to complete the goal. */
  deadlineDate: string | null;

  /** ISO-8601 actual completion date. Null if not yet completed. */
  completionDate: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INDIVIDUAL GOAL SCORE OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of computing the BRD formula score for one goal.
 *
 * `rawRatio`    — unclamped calculation result (may exceed 1.0 or be negative).
 * `clampedScore`— final value clamped to [0.0, 1.0].
 * `scorePercent`— `clampedScore * 100`, ready for display.
 */
export interface GoalScore {
  goalId: string;
  uomType: GoalUomType;
  rawRatio: number; // unclamped — useful for diagnostics
  clampedScore: number; // [0, 1]
  scorePercent: number; // [0, 100]
  isComplete: boolean; // true when score >= 1.0 (100%)
  formula: BrdFormula; // which formula branch was executed
  diagnostics: ScoringDiagnostics;
}

/** BRD formula branch labels — for audit/display. */
export type BrdFormula =
  | "min_uom" // achievement / target  (lower is better)
  | "max_uom" // target / achievement  (higher is better)
  | "timeline" // date-based completion score
  | "zero_based" // binary: actual=0 → 100%, else 0%
  | "no_data"; // no achievement value present — score = 0

/** Machine-readable explanation of how a score was derived. */
export interface ScoringDiagnostics {
  inputValid: boolean;
  reason: string; // human-readable explanation
  guardTriggered: boolean; // true if a divide-by-zero or null guard fired
  clampApplied: boolean; // true if raw ratio was outside [0,1]
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WEIGHTED / AGGREGATE SCORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weighted score contribution for a single goal within a cycle aggregate.
 * `contribution` = clampedScore × (weightage / 100).
 */
export interface WeightedGoalContribution {
  goalId: string;
  weightage: number; // raw points (e.g. 30)
  weightFraction: number; // weightage / 100  (e.g. 0.30)
  goalScore: GoalScore;
  contribution: number; // weightFraction × clampedScore
}

/**
 * Final aggregated cycle score for an employee.
 * Sum of all goal contributions (bounded to [0, 1]).
 */
export interface CycleScore {
  employeeId: string;
  cycleId: string;
  quarter: QuarterLabel;

  /** Individual goal contributions (sorted by weightage desc for readability). */
  goalContributions: WeightedGoalContribution[];

  /** Sum of all weightFraction values — should equal 1.0 if goals are 100%. */
  totalWeightCovered: number;

  /** Raw sum of contributions (may be < 1 if some goals have no data). */
  rawAggregateScore: number;

  /** Normalized to the weight actually covered (prevents penalising missing data). */
  normalizedScore: number; // rawAggregateScore / totalWeightCovered

  /** Final display-ready score [0, 100]. */
  finalScorePercent: number;

  /** Metadata about the computation. */
  meta: CycleScoreMeta;
}

export interface CycleScoreMeta {
  goalsScored: number;
  goalsWithNoData: number;
  computedAt: string; // ISO-8601
  isPartial: boolean; // true if some goals still have null achievement
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. QUARTERLY SCORING SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

/** Quarter enum mirrors PostgreSQL quarter_label. */
export type QuarterLabel = "Q1" | "Q2" | "Q3" | "Q4";

/**
 * Persisted quarterly score snapshot.
 * Written after all check-ins for a quarter are acknowledged.
 */
export interface QuarterlyScoreSnapshot {
  id: string;
  employeeId: string;
  cycleId: string;
  quarter: QuarterLabel;
  cycleScore: CycleScore;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROGRESS PERCENTAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of the progress percentage calculation for a single goal.
 * Distinct from GoalScore: progress is the "how far along" metric,
 * whereas score incorporates the BRD formula direction (min/max).
 */
export interface GoalProgress {
  goalId: string;
  progressPercent: number; // [0, 100] — display-safe
  progressLabel: ProgressLabel;
  daysRemaining: number | null; // null for non-timeline goals
  isOverdue: boolean;
}

export type ProgressLabel =
  | "Not Started"
  | "In Progress"
  | "On Track"
  | "At Risk"
  | "Overdue"
  | "Completed";

// ─────────────────────────────────────────────────────────────────────────────
// 6. VALIDATION RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured result from the server-side scoring validators.
 * Mirrors the Zod SafeParseReturnType pattern for familiarity.
 */
export interface ScoringValidationResult {
  success: boolean;
  errors: ScoringValidationError[];
  warnings: ScoringValidationWarning[];
}

export interface ScoringValidationError {
  field: string;
  code: ScoringErrorCode;
  message: string;
}

export interface ScoringValidationWarning {
  field: string;
  message: string;
}

export type ScoringErrorCode =
  | "NULL_TARGET" // target_value is null for a UOM that requires it
  | "NULL_ACHIEVEMENT" // achievement_value is null (treated as score=0)
  | "NEGATIVE_VALUE" // negative number where not allowed
  | "INVALID_WEIGHTAGE" // weightage outside (0, 100]
  | "WEIGHTAGE_SUM_MISMATCH" // sum of weightages ≠ 100
  | "INVALID_DATE" // unparseable ISO-8601 date
  | "MISSING_DEADLINE" // timeline UOM with no deadline_date
  | "DIVISION_BY_ZERO" // target=0 in a formula that divides by it
  | "UNKNOWN_UOM"; // uomType not in GoalUomType union
