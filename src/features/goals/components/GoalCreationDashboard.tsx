"use client";

/**
 * @file features/goals/components/GoalCreationDashboard.tsx
 * @description Client orchestrator for the employee goal-planning workflow.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 *
 * VALIDATION STRATEGY (two-stage):
 *   Stage 1 — RHF uses goalDraftCollectionSchema (permissive) for live field
 *             validation and autosave. This keeps the form always submittable
 *             at the UI level without spurious "required" errors on untouched
 *             fields.
 *   Stage 2 — onSubmit() manually runs goalCollectionSchema (strict) via
 *             safeParse() to get precise field-level error messages. On
 *             failure it sets field errors via form.setError() so they appear
 *             inline. This replaces the broken "Form validation errors: {}"
 *             pattern caused by resolver/type mismatch.
 *
 * OPTIMISTIC UI:
 *   click → INSTANT setState("submitted") + toast.loading
 *          → background: await RPC via useTransition
 *          → success: toast.success + reconcile from DB
 *          → failure: rollback setState + toast.error
 *
 * ── Mode lifecycle ──────────────────────────────────────────────────────────
 *   "loading"   — initial fetch in progress
 *   "empty"     — no goals in DB; show add-first-goal CTA
 *   "drafting"  — JSONB anchor exists; form pre-populated from draft_content
 *   "revision"  — manager requested revisions; form re-populated from DB rows
 *   "submitted" — goals awaiting review; read-only GoalStatusView
 *   "approved"  — goals approved & locked; read-only GoalStatusView
 *   "rejected"  — goals rejected; read-only GoalStatusView + re-edit CTA
 */

import { useState, useEffect, useTransition, useRef } from "react";
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
import type { GoalDraftPayload, GoalSubmissionPayload } from "@/types/goals";
import type { NormalizedGoal } from "@/types";
import { GoalCreationSkeleton } from "@/components/ui/dashboard-skeletons";

import { GoalTrackerBanner } from "./GoalTrackerBanner";
import { GoalFormArray } from "./GoalFormArray";
import { AutosaveIndicator, type AutosaveState } from "./AutosaveIndicator";
import { GoalStatusView } from "./GoalStatusView";

// ─── Supabase client singleton (outside component avoids re-creation) ─────────
const supabaseClient = createClient();

// ─── Permissive collection schema for RHF resolver ───────────────────────────
// Using a minimal inline schema instead of importing goalDraftSchema because
// z.coerce.number().or(z.string()) infers as `unknown` which breaks the RHF
// Resolver generic. This schema uses explicit union types that TS can reason about.
const permissiveGoalSchema = z.object({
  title:         z.string().optional(),
  description:   z.string().nullable().optional(),
  thrust_area:   z.string().optional(),
  uom_type:      z.string().optional(),
  weightage:     z.union([z.number(), z.string()]).optional(),
  target_value:  z.union([z.number(), z.string()]).nullable().optional(),
  deadline_date: z.string().nullable().optional(),
});

const draftCollectionSchema = z.object({
  goals: z.array(permissiveGoalSchema),
});
type DraftFormValues = z.infer<typeof draftCollectionSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalMode =
  | "loading"
  | "empty"
  | "drafting"
  | "revision"
  | "submitted"
  | "approved"
  | "rejected";

interface GoalCreationDashboardProps {
  profileId: string;
  cycleId: string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

function detectMode(goals: NormalizedGoal[]): GoalMode {
  if (goals.length === 0) return "empty";
  if (goals.some((g) => g.draft_content !== null)) return "drafting";

  const statuses = goals.map((g) => g.status);
  if (statuses.every((s) => s === "approved"))                         return "approved";
  if (statuses.every((s) => s === "submitted" || s === "under_review")) return "submitted";
  if (statuses.some((s)  => s === "revision_requested"))               return "revision";
  if (statuses.every((s) => s === "rejected"))                         return "rejected";
  return "submitted";
}

function buildOptimisticGoals(
  goals: GoalSubmissionPayload[],
  profileId: string,
  cycleId: string
): NormalizedGoal[] {
  const now = new Date().toISOString();
  return goals.map((g, idx) => ({
    id:                 `optimistic-${idx}`,
    profile_id:         profileId,
    cycle_id:           cycleId,
    title:              g.title,
    description:        g.description,
    thrust_area:        g.thrust_area,
    status:             "submitted" as const,
    uom_type:           g.uom_type,
    target_value:       g.target_value,
    achievement_value:  null,
    deadline_date:      g.deadline_date ?? null,
    weightage:          g.weightage,
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
  const [mode, setMode]               = useState<GoalMode>("loading");
  const [fetchedGoals, setFetchedGoals] = useState<NormalizedGoal[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Rollback refs — hold the pre-submit snapshot so failure can restore state
  const preSubmitModeRef  = useRef<GoalMode>("empty");
  const preSubmitGoalsRef = useRef<NormalizedGoal[]>([]);

  // ─── Form (permissive draft schema for live editing) ──────────────────────
  const form = useForm<DraftFormValues>({
    resolver:      zodResolver(draftCollectionSchema),
    defaultValues: { goals: [] },
    mode:          "onChange",   // real-time feedback on individual fields
  });

  const { watch, reset, setError, getValues, formState } = form;

  // ─── Initial data load ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const goals = await goalsService.getEmployeeGoalsForCycle(
          supabaseClient,
          profileId,
          cycleId
        );
        if (cancelled) return;

        const detected = detectMode(goals);
        setFetchedGoals(goals);
        setMode(detected);

        if (detected === "drafting") {
          const anchor    = goals.find((g) => g.draft_content !== null);
          const drafts    = (anchor?.draft_content as unknown as GoalDraftPayload[]) ?? [];
          reset({ goals: drafts });
        } else if (detected === "revision") {
          reset({ goals: goalsToDraftPayload(goals) });
        }
      } catch {
        if (cancelled) return;
        showToast.error({ title: "Failed to load your goals. Please refresh." });
        setMode("empty");
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, cycleId]);

  // ─── Autosave (drafting + empty modes only) ───────────────────────────────

  useEffect(() => {
    if (mode !== "drafting" && mode !== "empty") return;

    const sub = watch((value) => {
      setAutosaveStatus("saving");
      const timer = setTimeout(async () => {
        try {
          const res = await saveGoalDraftAction(
            profileId,
            cycleId,
            (value.goals ?? []) as GoalDraftPayload[]
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

    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Submit — two-stage validation + optimistic UI ────────────────────────
  //
  // Stage 1: RHF's permissive resolver passes through to this handler.
  // Stage 2: We run goalCollectionSchema.safeParse() manually to get strict
  //          validation with field-level errors mapped back into RHF state.
  //
  // Optimistic flow:
  //   T+0ms:  Strict validation passes
  //   T+0ms:  Snapshot state for rollback
  //   T+0ms:  Build optimistic NormalizedGoal[] from validated data
  //   T+0ms:  setMode("submitted") + setFetchedGoals(optimistic) — INSTANT
  //   T+0ms:  toast.loading()
  //   T+Xms:  submitGoalsAction() runs inside startSubmitTransition
  //   T+Xms:  On success: upgrade toast + reconcile from DB
  //   T+Xms:  On failure: rollback state + toast.error

  function handleFormSubmit() {
    // ── Stage 2: Strict submission validation ──────────────────────────────
    const rawValues = getValues("goals");

    const parsed = goalCollectionSchema.safeParse(rawValues);

    if (!parsed.success) {
      // Map Zod issues back to RHF field paths for inline display
      parsed.error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (path && path !== "root") {
          // e.g. "0.title", "1.weightage"
          const fieldPath = `goals.${path}` as any;
          setError(fieldPath, { message: err.message });
        }
      });
      // Surface any array-level (root) error as a global toast
      const rootErr = parsed.error.issues.find((e) => e.path.includes("root") || e.path.length === 0);
      showToast.error({
        title: rootErr?.message ?? "Please fix the highlighted errors before submitting.",
      });
      return; // Stop — do NOT optimistically update or call the server
    }

    const validatedGoals: GoalSubmissionPayload[] = parsed.data;

    // ── Snapshot for rollback ─────────────────────────────────────────────
    preSubmitModeRef.current  = mode;
    preSubmitGoalsRef.current = fetchedGoals;

    // ── Build optimistic view ─────────────────────────────────────────────
    const optimisticGoals = buildOptimisticGoals(validatedGoals, profileId, cycleId);

    // ── Instant optimistic state transition ───────────────────────────────
    setFetchedGoals(optimisticGoals);
    setMode("submitted");

    // ── Loading toast ─────────────────────────────────────────────────────
    const toastId = toast.loading("Submitting goals for review…");

    // ── Background server mutation via useTransition ───────────────────────
    startSubmitTransition(async () => {
      try {
        const res = await submitGoalsAction(profileId, cycleId, validatedGoals);
        if (!res.success) throw new Error(res.error);

        // Success: upgrade loading toast in-place
        toast.success("Goals submitted for manager review!", {
          id:          toastId,
          description: "Your manager will be notified shortly.",
          duration:    4000,
        });

        // Reconcile: replace optimistic rows with authoritative DB rows
        const refreshed = await goalsService.getEmployeeGoalsForCycle(
          supabaseClient,
          profileId,
          cycleId
        );
        setFetchedGoals(refreshed);
        setMode(detectMode(refreshed));

      } catch (error) {
        // Failure: rollback to pre-submit state
        setFetchedGoals(preSubmitGoalsRef.current);
        setMode(preSubmitModeRef.current);

        toast.error(
          error instanceof Error ? error.message : "Submission failed. Please try again.",
          { id: toastId, duration: 5000 }
        );
      }
    });
  }

  // ─── Re-edit handler (rejected state) ────────────────────────────────────

  function handleReEdit() {
    reset({ goals: goalsToDraftPayload(fetchedGoals) });
    setMode("revision");
  }

  // ─── Derived submit guard ─────────────────────────────────────────────────
  // canSubmit only gates the button — strict validation runs on click.
  const watchedGoals    = watch("goals");
  const totalWeightage  = watchedGoals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);
  const canSubmit       = watchedGoals.length > 0 && totalWeightage === 100 && !isSubmitting;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (mode === "loading") return <GoalCreationSkeleton />;

  if (mode === "approved" || mode === "submitted") {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        <PageHeader autosaveStatus="idle" lastSavedAt={null} />
        <GoalStatusView goals={fetchedGoals} mode={mode} />
      </div>
    );
  }

  if (mode === "rejected") {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-24">
        <PageHeader autosaveStatus="idle" lastSavedAt={null} />
        <GoalStatusView goals={fetchedGoals} mode="rejected" />
        <div className="flex justify-end border-t pt-6">
          <Button type="button" size="lg" variant="outline" className="gap-2" onClick={handleReEdit}>
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
      <PageHeader autosaveStatus={autosaveStatus} lastSavedAt={lastSavedAt} />

      {mode === "revision" && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 dark:border-violet-800/40 dark:bg-violet-900/10">
          <p className="font-semibold text-violet-800 dark:text-violet-300">Revision Requested</p>
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-400">
            Your manager has requested changes to your goals. Update the form below and re-submit.
          </p>
          {fetchedGoals.some((g) => g.rejected_reason) && (
            <ul className="mt-3 space-y-1">
              {fetchedGoals.filter((g) => g.rejected_reason).map((g) => (
                <li key={g.id} className="text-xs text-violet-700 dark:text-violet-400">
                  <span className="font-medium">{g.title}:</span> {g.rejected_reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Form {...form}>
        {/* Use a plain div + manual submit — bypasses RHF's handleSubmit()  */}
        {/* so we can run two-stage validation without the resolver blocking */}
        <div className="space-y-8">
          <GoalTrackerBanner />
          <GoalFormArray />

          <div className="flex justify-end border-t pt-6">
            <Button
              type="button"
              size="lg"
              className="w-full md:w-auto min-w-[180px] gap-2 transition-all duration-200"
              disabled={!canSubmit}
              onClick={handleFormSubmit}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? "Submitting…"
                : mode === "revision"
                ? "Re-submit for Approval"
                : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({
  autosaveStatus,
  lastSavedAt,
}: {
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
