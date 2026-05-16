"use client";

/**
 * @file features/manager/components/ManagerApprovalDashboard.tsx
 * @description Client orchestrator for the Manager Approval Workflow.
 *
 * Responsibilities:
 *  - Holds UI state for the modal (which goal, which action).
 *  - Applies optimistic updates after each approval action.
 *  - Calls managerService methods (RPC-backed) for DB mutations.
 *  - No Redux/Zustand — local state only (mirrors GoalCreationDashboard).
 */

import { useState, useTransition, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCw, ClipboardList } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

import { ManagerStatsBanner } from "./ManagerStatsBanner";
import { TeamMemberReviewPanel } from "./TeamMemberReviewPanel";
import {
  ApprovalActionModal,
  type ApprovalAction,
} from "./ApprovalActionModal";

import { managerService } from "../services/manager.service";
import type { TeamMemberGoalGroup } from "../types/manager.types";
import type { NormalizedGoal } from "@/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManagerApprovalDashboardProps {
  /** Pre-fetched by the Server Component parent. */
  initialGroups: TeamMemberGoalGroup[];
  /** Current manager's profile ID — required by reject/revision RPCs. */
  managerId: string;
  /** Active cycle ID — used for bulk-approve queries. */
  cycleId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManagerApprovalDashboard({
  initialGroups,
  managerId,
  cycleId,
}: ManagerApprovalDashboardProps) {
  // Optimistic local copy — starts from server-fetched data.
  const [groups, setGroups] = useState<TeamMemberGoalGroup[]>(initialGroups);

  // Modal state.
  const [modalGoal, setModalGoal] = useState<NormalizedGoal | null>(null);
  const [modalAction, setModalAction] = useState<ApprovalAction | null>(null);

  const [isPending, startTransition] = useTransition();

  // ─── Supabase browser client (memoised — created once per render tree) ─────
  const client = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // ─── Optimistic update helpers ────────────────────────────────────────────

  /** Patch a single goal in local state after a mutation. */
  const applyOptimisticGoalUpdate = useCallback((updated: NormalizedGoal) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.profileId !== updated.profile_id) return group;

        const updatedGoals = group.goals.map((g) =>
          g.id === updated.id ? updated : g
        );

        return {
          ...group,
          goals: updatedGoals,
          isFullyReviewed: updatedGoals.every(
            (g) =>
              g.status === "approved" ||
              g.status === "rejected" ||
              g.status === "completed"
          ),
        };
      })
    );
  }, []);

  /** Mark all pending goals for a profile as approved in local state. */
  const applyBulkApproveOptimistic = useCallback(
    (profileId: string) => {
      const now = new Date().toISOString();
      setGroups((prev) =>
        prev.map((group) => {
          if (group.profileId !== profileId) return group;

          const updatedGoals = group.goals.map((g) =>
            g.status === "submitted" || g.status === "under_review"
              ? ({
                  ...g,
                  status: "approved" as const,
                  approved_by: managerId,
                  approved_at: now,
                  is_locked: true,
                } satisfies NormalizedGoal)
              : g
          );

          return { ...group, goals: updatedGoals, isFullyReviewed: true };
        })
      );
    },
    [managerId]
  );

  // ─── Modal helpers ────────────────────────────────────────────────────────

  function openModal(goal: NormalizedGoal, action: ApprovalAction) {
    setModalGoal(goal);
    setModalAction(action);
  }

  function closeModal() {
    setModalGoal(null);
    setModalAction(null);
  }

  // ─── Single-goal confirmation ─────────────────────────────────────────────

  const handleConfirm = useCallback(
    async (goalId: string, action: ApprovalAction, reason?: string) => {
      startTransition(async () => {
        try {
          if (action === "approve") {
            // approveGoal: (client, goalId, comment?) — no managerId
            await managerService.approveGoal(client, goalId);

            // Optimistic patch: find the goal and mark it approved.
            const targetGoal = groups
              .flatMap((g) => g.goals)
              .find((g) => g.id === goalId);

            if (targetGoal) {
              applyOptimisticGoalUpdate({
                ...targetGoal,
                status: "approved",
                approved_by: managerId,
                approved_at: new Date().toISOString(),
                is_locked: true,
              } as NormalizedGoal);
            }

            toast.success("Goal approved and locked successfully.");
          } else if (action === "reject") {
            // rejectGoal: (client, goalId, managerId, reason, comment?)
            const updated = await managerService.rejectGoal(
              client,
              goalId,
              managerId,
              reason ?? "No reason provided."
            );
            applyOptimisticGoalUpdate(updated);
            toast.info("Goal rejected. Employee will be notified.");
          } else {
            // requestRevision: (client, goalId, managerId, reason, comment?)
            const updated = await managerService.requestRevision(
              client,
              goalId,
              managerId,
              reason ?? "Please revise your goal."
            );
            applyOptimisticGoalUpdate(updated);
            toast.success("Revision requested.");
          }

          closeModal();
        } catch (error) {
          console.error(error);
          toast.error(
            error instanceof Error ? error.message : "Action failed. Please retry."
          );
        }
      });
    },
    [groups, client, managerId, applyOptimisticGoalUpdate]
  );

  // ─── Bulk approval ────────────────────────────────────────────────────────

  const handleApproveAll = useCallback(
    (profileId: string) => {
      startTransition(async () => {
        try {
          // approveAllGoalsForEmployee: (client, profileId, cycleId) — no managerId
          await managerService.approveAllGoalsForEmployee(
            client,
            profileId,
            cycleId
          );

          applyBulkApproveOptimistic(profileId);
          toast.success("All goals approved successfully.");
        } catch (error) {
          console.error(error);
          toast.error(
            error instanceof Error ? error.message : "Bulk approval failed."
          );
        }
      });
    },
    [client, cycleId, applyBulkApproveOptimistic]
  );

  // ─── Computed stats ───────────────────────────────────────────────────────

  const stats = managerService.computeStats(groups);
  const isEmpty = groups.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Goal Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve your team&apos;s submitted goals for the active cycle.
          </p>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-full border px-3 py-1.5 bg-muted/50 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </div>
        )}
      </div>

      {/* KPI banner */}
      <ManagerStatsBanner stats={stats} />

      {/* Review queue */}
      {isEmpty ? (
        <EmptyQueue />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Review Queue
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({groups.length} team member{groups.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="text-xs text-muted-foreground">
              {stats.pendingReviewCount > 0 ? (
                <span className="text-amber-600 font-medium">
                  {stats.pendingReviewCount} goal
                  {stats.pendingReviewCount !== 1 ? "s" : ""} awaiting review
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">
                  All goals reviewed ✓
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <TeamMemberReviewPanel
                key={group.profileId}
                group={group}
                onApproveAll={() => handleApproveAll(group.profileId)}
                onApprove={(goal) => openModal(goal, "approve")}
                onReject={(goal) => openModal(goal, "reject")}
                onRevise={(goal) => openModal(goal, "revise")}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approval action modal */}
      <ApprovalActionModal
        open={!!modalGoal && !!modalAction}
        action={modalAction}
        goal={modalGoal}
        onClose={closeModal}
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No Submissions Yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Your team hasn&apos;t submitted any goals for this cycle yet. You&apos;ll
        see their goals here once they submit for review.
      </p>
    </div>
  );
}