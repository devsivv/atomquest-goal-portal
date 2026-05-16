import type { GoalDraftPayload } from "@/types/goals";

export const DEFAULT_GOAL: GoalDraftPayload = {
  thrust_area: "",
  title: "",
  description: "",
  uom_type: "numeric_max",
  target_value: undefined,
  weightage: 0,
};