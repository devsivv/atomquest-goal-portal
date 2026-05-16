"use client";

/**
 * @file features/manager/components/TeamMemberReviewPanel.tsx
 * @description Collapsible panel showing one team member's goal set.
 * Renders employee identity, weightage summary, and all GoalReviewCards.
 * Supports bulk-approve when all goals are pending.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  UserCircle,
  BadgeCheck,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { TeamMemberGoalGroup } from "../types/manager.types";
import type { NormalizedGoal } from "@/types";
import { GoalReviewCard } from "./GoalReviewCard";
import { isGoalPending } from "../utils/status.utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TeamMemberReviewPanelProps {
  group: TeamMemberGoalGroup;
  /** Called when the manager clicks Approve on a single goal. */
  onApprove: (goal: NormalizedGoal) => void;
  /** Called when the manager clicks Reject on a single goal. */
  onReject: (goal: NormalizedGoal) => void;
  /** Called when the manager clicks Revise on a single goal. */
  onRevise: (goal: NormalizedGoal) => void;
  /** Called when the manager clicks Approve All for this employee. */
  onApproveAll: (profileId: string) => void;
  /** Whether a transition is currently in flight (disables bulk CTA). */
  isPending?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamMemberReviewPanel({
  group,
  onApprove,
  onReject,
  onRevise,
  onApproveAll,
  isPending = false,
}: TeamMemberReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!group.isFullyReviewed);

  const pendingCount = group.goals.filter((g) => isGoalPending(g.status)).length;
  const approvedCount = group.goals.filter((g) => g.status === "approved").length;
  const totalGoals = group.goals.length;

  const reviewProgress =
    totalGoals > 0 ? Math.round(((totalGoals - pendingCount) / totalGoals) * 100) : 0;

  const allPending = pendingCount === totalGoals;
  const allDone = group.isFullyReviewed;

  return (
    <div
      className={`rounded-2xl border bg-card shadow-sm transition-all duration-300 overflow-hidden ${
        allDone
          ? "border-emerald-200 dark:border-emerald-800/50"
          : "border-border"
      }`}
    >
      {/* Panel header — click to expand/collapse */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
          {/* Avatar */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg select-none">
            {group.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={group.avatarUrl}
                alt={group.fullName}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              group.fullName.charAt(0).toUpperCase()
            )}
            {allDone && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <BadgeCheck className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground leading-none">
                {group.fullName}
              </span>
              <span className="text-xs text-muted-foreground font-mono bg-muted rounded px-1.5 py-0.5">
                {group.employeeId}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <UserCircle className="h-3 w-3 shrink-0" />
              <span>{group.designation}</span>
              <span>·</span>
              <span>{group.department}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground shrink-0">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground leading-none">{totalGoals}</p>
              <p className="mt-0.5">Goals</p>
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-bold leading-none ${
                  pendingCount > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {pendingCount}
              </p>
              <p className="mt-0.5">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground leading-none">
                {group.totalWeightage}%
              </p>
              <p className="mt-0.5">Weightage</p>
            </div>
          </div>

          {/* Chevron */}
          <div className="ml-2 shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <Progress
            value={reviewProgress}
            className={`h-1 rounded-none ${
              allDone
                ? "[&>div]:bg-emerald-500"
                : "[&>div]:bg-primary"
            }`}
          />
        </div>
      </button>

      {/* Expandable goal list */}
      {isExpanded && (
        <div className="px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Bulk Approve CTA */}
          {allPending && totalGoals > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-900/10">
              <div className="text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  Approve all {totalGoals} goals at once?
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                  Total weightage: {group.totalWeightage}%
                </p>
              </div>
              <Button
                size="sm"
                disabled={isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 disabled:opacity-60"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveAll(group.profileId);
                }}
              >
                <CheckCheck className="h-4 w-4" />
                Approve All
              </Button>
            </div>
          )}

          {/* Individual goal cards */}
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {group.goals.map((goal) => (
              <GoalReviewCard
                key={goal.id}
                goal={goal}
                onApprove={onApprove}
                onReject={onReject}
                onRevise={onRevise}
              />
            ))}
          </div>

          {/* Completion summary */}
          {allDone && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/10 dark:text-emerald-400">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              All goals reviewed · {approvedCount} approved
            </div>
          )}
        </div>
      )}
    </div>
  );
}
