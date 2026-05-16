"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GoalFormRow } from "./GoalFormRow";

import { GOAL_LIMITS } from "@/features/goals/schemas";
import { DEFAULT_GOAL } from "@/features/goals/constants/defaultGoal";

import type { GoalDraftPayload } from "@/types/goals";

export function GoalFormArray() {
  const { control } = useFormContext<{
    goals: GoalDraftPayload[];
  }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "goals",
  });

  const canAddMore =
    fields.length < GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE;

  return (
    <div className="space-y-6">
      {fields.map((field, index) => (
        <GoalFormRow
          key={field.id}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}

      {fields.length === 0 && (
        <div className="rounded-lg border-2 border-dashed bg-muted/20 p-12 text-center">
          <p className="mb-4 text-muted-foreground">
            No goals added yet. Start planning your cycle!
          </p>

          <Button
            type="button"
            onClick={() => append({ ...DEFAULT_GOAL })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Your First Goal
          </Button>
        </div>
      )}

      {fields.length > 0 && (
        <div className="flex flex-col items-center justify-center pb-12 pt-4 space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full max-w-sm border-dashed"
            onClick={() => append({ ...DEFAULT_GOAL })}
            disabled={!canAddMore}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {canAddMore ? "Add Another Goal" : "Goal Limit Reached"}
          </Button>
          {!canAddMore && (
            <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
              Maximum of {GOAL_LIMITS.MAX_GOALS_PER_EMPLOYEE} goals allowed per cycle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}