/**
 * @file features/goals/utils/uom.ts
 * @description Utilities for Goal Unit of Measurement (UOM) display and logic.
 */

import type { GoalUomType } from "@/types";

export const UOM_LABELS: Record<GoalUomType, string> = {
  numeric_max: "Numeric (Higher is Better)",
  numeric_min: "Numeric (Lower is Better)",
  percentage_max: "Percentage (Higher is Better)",
  percentage_min: "Percentage (Lower is Better)",
  timeline: "Timeline / Milestone",
  zero_based: "Zero-Based Target",
};

/** Returns true if the UOM uses a numeric target_value */
export function uomHasTarget(uom: GoalUomType): boolean {
  return uom !== "timeline" && uom !== "zero_based";
}

/** Returns true if higher achievement_value = better result */
export function uomIsHigherBetter(uom: GoalUomType): boolean {
  return uom === "numeric_max" || uom === "percentage_max";
}
