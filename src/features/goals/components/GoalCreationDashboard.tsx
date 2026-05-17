"use client";

/**
 * @file features/goals/components/GoalCreationDashboard.tsx
 * @description Client orchestrator for the employee goal-planning workflow.
 *
 * ── Optimistic UI Architecture ──────────────────────────────────────────────
 *
 * BEFORE (blocking):
 *   click → await RPC (~800ms) → toast → await refetch (~300ms) → setState
 *   Total perceived latency: ~1100ms+ of blocked UI
 *
 * AFTER (optimistic):
 *   click → INSTANT setState("submitted") + toast.loading
 *          → background: await RPC
 *          → success: toast.success + reconcile from DB
 *          → failure: rollback setState + toast.error
 *   Perceived latency: ~0ms (feels instant like Linear/Vercel)
 *
 * ── Mode lifecycle (driven by DB state fetched on mount) ────────────────────
 *   "loading"   — initial fetch in progress
 *   "empty"     — no goals in DB; show add-first-goal CTA
 *   "drafting"  — JSONB anchor exists; form is pre-populated from draft_content
 *   "revision"  — manager requested revisions; form re-populated from DB rows
 *   "submitted" — goals awaiting review; read-only GoalStatusView
 *   "approved"  — goals approved & locked; read-only GoalStatusView
 *   "rejected"  — goals rejected; read-only GoalStatusView + re-edit CTA
 */

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { goalCollectionSchema } from "@/features/goals/schemas";
import { goalsService } from "@/features/goals/services/goals.service";
import { saveGoalDraftAction, submitGoalsAction } from "@/features/goals/actions/goals.actions";
import { createClient } from "@/lib/supabase/client";
import type { GoalDraftPayload } from "@/types/goals";
import type { NormalizedGoal } from "@/types";
import { GoalCreationSkeleton } from "@/components/ui/dashboard-skeletons";

import { GoalTrackerBanner } from "./GoalTrackerBanner";
import { GoalFormArray } from "./GoalFormArray";
import { AutosaveIndicator, type AutosaveState } from "./AutosaveIndicator";
import { GoalStatusView } from "./GoalStatusView";

// ─── Supabase client: singleton outside component to avoid recreation ─────────
// Creating the client inside the component body causes a new instance on every
// render, which defeats connection pooling and breaks subscription cleanup.
const supabaseClient = createClient();

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

/**
 * Build an optimistic NormalizedGoal[] from form values.
 * These are displayed instantly before the server round-trip completes.
 */
function buildOptimisticGoals(
  goals: GoalDraftPayload[],
  profileId: string,
  cycleId: string
): NormalizedGoal[] {
  const now = new Date().toISOString();
  return goals.map((g, idx) => ({
    id:                 `optimistic-${idx}`,
    profile_id:         profileId,
    cycle_id:           cycleId,
    title:              g.title ?? "Untitled Goal",
    description:        g.description ?? null,
    thrust_area:        g.thrust_area ?? "General",
    status:             "submitted" as const,
    uom_type:           g.uom_type ?? "numeric_max",
    target_value:       g.target_value != null ? Number(g.target_value) : null,
    achievement_value:  null,
    deadline_date:      g.deadline_date ?? null,
    weightage:          g.weightage != null ? Number(g.weightage) : 0,
    progress:           0,
    submitted_at:       now,
    approved_by:        null,
    approved_at:        null,
    rejected_reason:    null,
    is_locked:          false,
    is_shared:          false,
    locked_at:          null,
    locked_by:          null,
    reviewed_at:        null,
    reviewed_by:        null,
    last_review_action: null,
    last_autosaved_at:  null,
    draft_content:      null,
    deleted_at:         null,
    deleted_by:         null,
    created_by:         profileId,
    updated_by:         profileId,
    created_at:         now,
    updated_at:         now,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoalCreationDashboard({ profileId, cycleId }: GoalCreationDashboardProps) {
  const [mode, setMode] = useState<GoalMode>("loading");
  const [fetchedGoals, setFetchedGoals] = useState<NormalizedGoal[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // useTransition for non-urgent state updates (background reconcile after submit)
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Ref to track the pre-submit form state for rollback
  const preSubmitModeRef = useRef<GoalMode>("empty");
  const preSubmitGoalsRef = useRef<NormalizedGoal[]>([]);

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
          supabaseClient,
          profileId,
          cycleId
        );

        if (cancelled) return;

        const detectedMode = detectMode(goals);
        setFetchedGoals(goals);
        setMode(detectedMode);

        if (detectedMode === "drafting") {
          const anchor = goals.find((g) => g.draft_content !== null);
          const draftGoals = (anchor?.draft_content as unknown as GoalDraftPayload[]) ?? [];
          reset({ goals: draftGoals });
        } else if (detectedMode === "revision") {
          reset({ goals: goalsToDraftPayload(goals) });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("GoalCreationDashboard: failed to load goals", err);
        showToast.error({ title: "Failed to load your goals. Please refresh." });
        setMode("empty");
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
          const res = await saveGoalDraftAction(
            profileId,
            cycleId,
            value.goals as GoalDraftPayload[]
          );
          if (!res.success) throw new Error(res.error);
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

  // ─── OPTIMISTIC Submit handler ──────────────────────────────────────────────
  //
  // Timeline:
  //   T+0ms:    Capture snapshot for rollback
  //   T+0ms:    Build optimistic submitted goals from form values
  //   T+0ms:    setMode("submitted") + setFetchedGoals(optimistic) → INSTANT UI
  //   T+0ms:    toast.loading("Submitting...")
  //   T+Xms:    await submitGoalsAction() [background, non-blocking to render]
  //   T+Xms:    On success: update toast → "Submitted!" + reconcile from DB
  //   T+Xms:    On failure: rollback mode + goals + toast.error

  const onSubmit = useCallback(
    (data: FormValues) => {
      // ── 1. Snapshot current state for rollback ────────────────────────────
      preSubmitModeRef.current = mode;
      preSubmitGoalsRef.current = fetchedGoals;

      // ── 2. Build optimistic submitted goals from current form values ──────
      const optimisticGoals = buildOptimisticGoals(
        data.goals as GoalDraftPayload[],
        profileId,
        cycleId
      );

      // ── 3. INSTANT optimistic UI update — no await, no blocking ──────────
      setFetchedGoals(optimisticGoals);
      setMode("submitted");

      // ── 4. Show loading toast immediately ─────────────────────────────────
      const toastId = toast.loading("Submitting goals for review…");

      // ── 5. Background server mutation via useTransition ───────────────────
      //    useTransition marks this as non-urgent — React won't block
      //    the optimistic render to run this.
      startSubmitTransition(async () => {
        try {
          const res = await submitGoalsAction(
            profileId,
            cycleId,
            data.goals as any
          );

          if (!res.success) throw new Error(res.error);

          // ── 6a. Success: upgrade toast and reconcile from authoritative DB
          toast.success("Goals submitted for manager review!", {
            id: toastId,
            description: "Your manager will be notified shortly.",
            duration: 4000,
          });

          // Reconcile: fetch the real server state in the background.
          // This replaces the optimistic rows with canonical DB rows
          // (with real IDs, submitted_at timestamps, etc.)
          const refreshed = await goalsService.getEmployeeGoalsForCycle(
            supabaseClient,
            profileId,
            cycleId
          );
          setFetchedGoals(refreshed);
          setMode(detectMode(refreshed));

        } catch (error) {
          // ── 6b. Failure: rollback optimistic state and show error ─────────
          setFetchedGoals(preSubmitGoalsRef.current);
          setMode(preSubmitModeRef.current);

          toast.error(
            error instanceof Error ? error.message : "Submission failed. Please try again.",
            { id: toastId, duration: 5000 }
          );

          console.error("[GoalCreationDashboard] submitGoalsAction failed:", error);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profileId, cycleId, mode, fetchedGoals]
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
  const canSubmit = watchedGoals.length > 0 && totalWeightage === 100 && !isSubmitting;

  // ─── Render ─────────────────────────────────────────────────────────────────

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
              className="w-full md:w-auto min-w-[180px] gap-2 transition-all duration-200"
              disabled={!canSubmit}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? "Submitting…"
                : mode === "revision"
                ? "Re-submit for Approval"
                : "Submit for Approval"}
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
