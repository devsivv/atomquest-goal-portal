"use client";

/**
 * @file features/manager/components/GoalReviewCard.tsx
 * @description Read-only card showing a single employee goal's details
 * with approve / reject / revision action buttons.
 *
 * Pure presentation component. All actions bubble up via discrete callbacks:
 *   onApprove(goal)
 *   onReject(goal)
 *   onRevise(goal)
 */

import { CheckCircle2, XCircle, RefreshCw, CalendarDays, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NormalizedGoal } from "@/types";
import { UOM_LABELS } from "@/features/goals/utils/uom";
import {
  GOAL_STATUS_LABELS,
  GOAL_STATUS_COLORS,
  normalizeStatus,
  isGoalDecided,
  isGoalPending,
  isGoalRevision,
} from "../utils/status.utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface GoalReviewCardProps {
  goal: NormalizedGoal;
  onApprove: (goal: NormalizedGoal) => void;
  onReject: (goal: NormalizedGoal) => void;
  onRevise: (goal: NormalizedGoal) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GoalReviewCard({
  goal,
  onApprove,
  onReject,
  onRevise,
}: GoalReviewCardProps) {
  const normalizedStatus = normalizeStatus(goal.status);
  const statusCfg = GOAL_STATUS_COLORS[normalizedStatus];
  const statusLabel = GOAL_STATUS_LABELS[normalizedStatus];

  const isDecided = isGoalDecided(normalizedStatus);
  const isPending = isGoalPending(normalizedStatus);
  const isRevision = isGoalRevision(normalizedStatus);
  void isRevision; // reserved for future revision-state UI

  return (
    <div className="group relative rounded-xl border bg-card shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 overflow-hidden">
      {/* Accent strip */}
      <div
        className={`absolute left-0 top-0 h-full w-1 transition-colors ${statusCfg.dot}`}
      />

      <div className="pl-4 pr-4 pt-4 pb-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-2">
              {goal.title}
            </h4>
            {goal.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {goal.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusCfg.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
            {statusLabel}
          </div>
        </div>

        {/* Metadata chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="rounded-md font-normal">
            {goal.thrust_area}
          </Badge>

          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {UOM_LABELS[goal.uom_type] ?? goal.uom_type}
          </span>

          {goal.target_value !== null && (
            <span className="text-muted-foreground">
              Target:{" "}
              <span className="font-medium text-foreground">{goal.target_value}</span>
            </span>
          )}

          {goal.deadline_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(goal.deadline_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}

          <span className="ml-auto font-semibold text-primary">
            {goal.weightage}%
          </span>
        </div>

        {/* Rejection / revision reason display */}
        {goal.rejected_reason && isDecided && (
          <div className="rounded-md bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Feedback: </span>
            {goal.rejected_reason}
          </div>
        )}
      </div>

      {/* Action footer — only for pending goals */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20"
            onClick={() => onRevise(goal)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Revise
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
            onClick={() => onReject(goal)}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
            onClick={() => onApprove(goal)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      )}

      {/* Already-decided state footer */}
      {isDecided && (
        <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          {normalizedStatus === "approved" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Approved
                {goal.approved_at &&
                  ` · ${new Date(goal.approved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Decision recorded</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
