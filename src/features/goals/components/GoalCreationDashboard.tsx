"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { goalCollectionSchema } from "@/features/goals/schemas";
import type { GoalDraftPayload } from "@/types/goals";

import { GoalTrackerBanner } from "./GoalTrackerBanner";
import { GoalFormArray } from "./GoalFormArray";
import { AutosaveIndicator, type AutosaveState } from "./AutosaveIndicator";

interface FormValues {
  goals: GoalDraftPayload[];
}

export function GoalCreationDashboard() {
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // We initialize the form using the loose Draft types so React Hook Form
  // doesn't block partial saves, but we bind the STRICT goalCollectionSchema 
  // via the Zod resolver for the final `handleSubmit`.
  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({ goals: goalCollectionSchema })
    ) as any,
    defaultValues: {
      goals: [],
    },
    mode: "onSubmit", // Only validate strict rules on submit
  });

  const { watch, handleSubmit } = form;

  // --- Autosave Logic ---
  // Watches the entire form state. In a real app, you would debounce this
  // and send `values.goals` to the `goalsService` to update the `draft_content` JSONB column.
  useEffect(() => {
    const subscription = watch((value) => {
      // Simulate debounce & save
      setAutosaveStatus("saving");
      
      const timer = setTimeout(() => {
        // In production: await goalsService.saveDraft(value.goals)
        setLastSavedAt(new Date());
        setAutosaveStatus("saved");
      }, 1000);

      return () => clearTimeout(timer);
    });
    
    return () => subscription.unsubscribe();
  }, [watch]);

  // --- Final Submission ---
  const onSubmit = async (data: FormValues) => {
    try {
      // At this point, Zod has successfully validated `data` against `goalCollectionSchema`.
      // It perfectly matches `GoalSubmissionPayload[]`.
      console.log("Valid submission payload:", data);
      
      // In production: await goalsService.submitCycleGoals(data.goals)
      toast.success("Goals submitted successfully for manager review!");
    } catch (error) {
      toast.error("Failed to submit goals. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goal Planning</h1>
          <p className="text-muted-foreground mt-1">
            Define your objectives for the upcoming cycle.
          </p>
        </div>
        <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} />
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <GoalTrackerBanner />
          
          <GoalFormArray />

          <div className="flex justify-end border-t pt-6">
            <Button 
              type="submit" 
              size="lg" 
              className="w-full md:w-auto"
              disabled={watch("goals").length === 0 || watch("goals").reduce((sum, g) => sum + (Number(g.weightage) || 0), 0) !== 100}
            >
              Submit for Approval
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
