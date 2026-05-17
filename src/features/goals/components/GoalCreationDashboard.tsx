"use client";

/**
 * @file features/goals/components/GoalCreationDashboard.tsx
 * @description Client orchestrator for the employee goal-planning workflow.
 *
 * Mode lifecycle (driven by DB state fetched on mount):
 *
 *   "loading"   — initial fetch in progress
 *   "empty"     — no goals in DB; show add-first-goal CTA
 *   "drafting"  — JSONB anchor exists; form is pre-populated from draft_content
 *   "revision"  — manager requested revisions; form re-populated from DB rows
 *   "submitted" — goals awaiting review; read-only GoalStatusView
 *   "approved"  — goals approved & locked; read-only GoalStatusView
 *   "rejected"  — goals rejected; read-only GoalStatusView + re-edit CTA
 *
 * Autosave fires in "empty" and "drafting" modes only.
 * Submission (via SECURITY DEFINER RPC) works in "empty", "drafting", and "revision".
 */

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { Loader2, PenLine } from "lucide-react";

import { goalCollectionSchema } from "@/features/goals/schemas";
import { goalsService } from "@/features/goals/services/goals.service";
import { createClient } from "@/lib/supabase/client";
import type { GoalDraftPayload } from "@/types/goals";
import type { NormalizedGoal } from "@/types";
import { GoalCreationSkeleton } from "@/components/ui/dashboard-skeletons";

import { GoalTrackerBanner } from "./GoalTrackerBanner";
import { GoalFormArray } from "./GoalFormArray";
import { AutosaveIndicator, type AutosaveState } from "./AutosaveIndicator";
import { GoalStatusView } from "./GoalStatusView";

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalMode =
  | "loading"
  | "empty"
  | "drafting"
  | "revision"
  | "submitted"
  | "approved"
  | "rejected";

interface FormValues {
  goals: GoalDraftPayload[];
}

interface GoalCreationDashboardProps {
  profileId: string;
  cycleId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert real DB goal rows back to the permissive GoalDraftPayload for RHF. */
function goalsToDraftPayload(goals: NormalizedGoal[]): GoalDraftPayload[] {
  return goals.map((g) => ({
    title:         g.title,
    thrust_area:   g.thrust_area,
    description:   g.description ?? undefined,
    uom_type:      g.uom_type,
    target_value:  g.target_value ?? undefined,
    weightage:     g.weightage,
    deadline_date: g.deadline_date ?? undefined,
  }));
}

/**
 * Determine which mode to render from a fresh DB snapshot.
 *
 * Rules:
 *  - 0 rows                        → "empty"
 *  - Any row has draft_content set → "drafting"  (JSONB anchor present)
 *  - All rows approved             → "approved"
 *  - All rows submitted/under_rev  → "submitted"
 *  - Any row revision_requested    → "revision"
 *  - All rows rejected             → "rejected"
 *  - Fallback                      → "submitted"
 */
function detectMode(goals: NormalizedGoal[]): GoalMode {
  if (goals.length === 0) return "empty";

  // JSONB anchor present — still in draft phase
  if (goals.some((g) => g.draft_content !== null)) return "drafting";

  const statuses = goals.map((g) => g.status);

  if (statuses.every((s) => s === "approved"))                   return "approved";
  if (statuses.every((s) => s === "submitted" || s === "under_review")) return "submitted";
  if (statuses.some((s)  => s === "revision_requested"))         return "revision";
  if (statuses.every((s) => s === "rejected"))                   return "rejected";

  return "submitted"; // safe fallback
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoalCreationDashboard({ profileId, cycleId }: GoalCreationDashboardProps) {
  const [mode, setMode] = useState<GoalMode>("loading");
  const [fetchedGoals, setFetchedGoals] = useState<NormalizedGoal[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const client = createClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(z.object({ goals: goalCollectionSchema })) as any,
    defaultValues: { goals: [] },
    mode: "onSubmit",
  });

  const { watch, handleSubmit, reset } = form;

  // ─── DB fetch on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      try {
        const goals = await goalsService.getEmployeeGoalsForCycle(
          client,
          profileId,
          cycleId
        );

        if (cancelled) return;

        const detectedMode = detectMode(goals);
        setFetchedGoals(goals);
        setMode(detectedMode);

        // Pre-populate the RHF form when the employee needs to (re)edit
        if (detectedMode === "drafting") {
          const anchor = goals.find((g) => g.draft_content !== null);
          const draftGoals = (anchor?.draft_content as unknown as GoalDraftPayload[]) ?? [];
          reset({ goals: draftGoals });
        } else if (detectedMode === "revision") {
          // Map real DB rows back to the permissive draft payload for editing
          reset({ goals: goalsToDraftPayload(goals) });
        }
        // "empty": form already has defaultValues: { goals: [] } — no reset needed
      } catch (err) {
        if (cancelled) return;
        console.error("GoalCreationDashboard: failed to load goals", err);
        showToast.error({ title: "Failed to load your goals. Please refresh." });
        setMode("empty"); // safe fallback — allow the employee to start fresh
      }
    }

    loadGoals();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, cycleId]);

  // ─── Autosave (drafting + empty modes only) ─────────────────────────────────

  useEffect(() => {
    if (mode !== "drafting" && mode !== "empty") return;

    const subscription = watch((value) => {
      setAutosaveStatus("saving");
      const timer = setTimeout(async () => {
        try {
          await goalsService.saveDraft(
            client,
            profileId,
            cycleId,
            value.goals as GoalDraftPayload[]
          );
          setLastSavedAt(new Date());
          setAutosaveStatus("saved");
        } catch {
          setAutosaveStatus("idle");
        }
      }, 1000);

      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, watch]);

  // ─── Submit handler ─────────────────────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        await goalsService.submitGoals(
          client,
          profileId,
          cycleId,
          data.goals as any
        );

        showToast.success({ title: "Goals submitted successfully for manager review!" });

        // Optimistically switch to the submitted view without a full reload
        const refreshed = await goalsService.getEmployeeGoalsForCycle(
          client,
          profileId,
          cycleId
        );
        setFetchedGoals(refreshed);
        setMode(detectMode(refreshed));
      } catch (error) {
        console.error(error);
        showToast.error({
          title: error instanceof Error ? error.message : "Failed to submit goals. Please try again.",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileId, cycleId]
  );

  const onError = (errors: unknown) => {
    console.error("Form validation errors:", errors);
    showToast.error({ title: "Please fix the validation errors before submitting." });
  };

  // ─── Re-edit handler (rejected state) ──────────────────────────────────────

  const handleReEdit = () => {
    reset({ goals: goalsToDraftPayload(fetchedGoals) });
    setMode("revision");
  };

  // ─── Derived form state ─────────────────────────────────────────────────────

  const watchedGoals = watch("goals");
  const totalWeightage = watchedGoals.reduce(
    (sum, g) => sum + (Number(g.weightage) || 0),
    0
  );
  const canSubmit = watchedGoals.length > 0 && totalWeightage === 100;

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Loading
  if (mode === "loading") {
    return <GoalCreationSkeleton />;
  }

  // Read-only modes — show GoalStatusView
  if (mode === "approved" || mode === "submitted") {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        <PageHeader profileId={profileId} autosaveStatus="idle" lastSavedAt={null} />
        <GoalStatusView goals={fetchedGoals} mode={mode} />
      </div>
    );
  }

  // Rejected — read-only + re-edit CTA
  if (mode === "rejected") {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        <PageHeader profileId={profileId} autosaveStatus="idle" lastSavedAt={null} />
        <GoalStatusView goals={fetchedGoals} mode="rejected" />
        <div className="flex justify-end border-t pt-6">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={handleReEdit}
          >
            <PenLine className="h-4 w-4" />
            Edit &amp; Re-submit
          </Button>
        </div>
      </div>
    );
  }

  // Editable modes: "empty" | "drafting" | "revision"
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <PageHeader
        profileId={profileId}
        autosaveStatus={autosaveStatus}
        lastSavedAt={lastSavedAt}
      />

      {/* Revision banner */}
      {mode === "revision" && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 dark:border-violet-800/40 dark:bg-violet-900/10">
          <p className="font-semibold text-violet-800 dark:text-violet-300">
            Revision Requested
          </p>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">
            Your manager has requested changes to your goals. Update the form below and re-submit.
          </p>
          {fetchedGoals.some((g) => g.rejected_reason) && (
            <ul className="mt-3 space-y-1">
              {fetchedGoals
                .filter((g) => g.rejected_reason)
                .map((g) => (
                  <li key={g.id} className="text-xs text-violet-700 dark:text-violet-400">
                    <span className="font-medium">{g.title}:</span> {g.rejected_reason}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
          <GoalTrackerBanner />
          <GoalFormArray />

          <div className="flex justify-end border-t pt-6">
            <Button
              type="submit"
              size="lg"
              className="w-full md:w-auto"
              disabled={!canSubmit}
            >
              {mode === "revision" ? "Re-submit for Approval" : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Page header sub-component ────────────────────────────────────────────────

function PageHeader({
  autosaveStatus,
  lastSavedAt,
}: {
  profileId: string;
  autosaveStatus: AutosaveState;
  lastSavedAt: Date | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Goal Planning</h1>
        <p className="text-muted-foreground mt-1">
          Define your objectives for the upcoming cycle.
        </p>
      </div>
      <AutosaveIndicator status={autosaveStatus} lastSavedAt={lastSavedAt} />
    </div>
  );
}
