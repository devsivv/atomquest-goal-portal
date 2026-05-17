"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { PlusCircle, Target } from "lucide-react";

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
        <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-12 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No goals planned</h3>
          <p className="mb-6 text-muted-foreground max-w-sm mx-auto">
            You haven't added any goals for this cycle yet. Start defining your objectives to track your progress.
          </p>

          <Button
            type="button"
            onClick={() => append({ ...DEFAULT_GOAL })}
            size="lg"
            className="shadow-sm"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
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