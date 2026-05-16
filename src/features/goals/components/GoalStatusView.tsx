"use client";

/**
 * @file features/goals/components/GoalStatusView.tsx
 * @description Read-only display of an employee's goals when they are in a
 * non-editable lifecycle state (submitted, approved, rejected, revision_requested).
 *
 * Derives all behaviour from goal.status and goal.is_locked.
 * No editing, no deletion — pure informational view.
 */

import {
  CheckCircle2,
  Clock,
  Lock,
  XCircle,
  RefreshCw,
  CalendarDays,
  Target,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UOM_LABELS } from "@/features/goals/utils/uom";
import type { NormalizedGoal } from "@/types";
import type { GoalStatus } from "@/types/goals/enums";

// ─── Status config ────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  icon: React.ReactNode;
  badge: string;       // Tailwind classes for badge container
  strip: string;       // Tailwind class for the left accent strip
};

const STATUS_CONFIG: Partial<Record<GoalStatus, StatusConfig>> = {
  submitted: {
    label: "Awaiting Review",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400",
    strip: "bg-amber-400",
  },
  under_review: {
    label: "Under Review",
    icon: <Clock className="h-3.5 w-3.5 text-blue-500" />,
    badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/10 dark:text-blue-400",
    strip: "bg-blue-400",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/10 dark:text-emerald-400",
    strip: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-400",
    strip: "bg-red-500",
  },
  revision_requested: {
    label: "Revision Requested",
    icon: <RefreshCw className="h-3.5 w-3.5 text-violet-500" />,
    badge: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/40 dark:bg-violet-900/10 dark:text-violet-400",
    strip: "bg-violet-500",
  },
};

const FALLBACK_CONFIG: StatusConfig = {
  label: "Draft",
  icon: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  badge: "border-border bg-muted text-muted-foreground",
  strip: "bg-muted-foreground/30",
};

// ─── Single goal card ─────────────────────────────────────────────────────────

function GoalStatusCard({ goal }: { goal: NormalizedGoal }) {
  const cfg = STATUS_CONFIG[goal.status] ?? FALLBACK_CONFIG;

  return (
    <div className="relative rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Accent strip */}
      <div className={`absolute left-0 top-0 h-full w-1 ${cfg.strip}`} />

      <div className="pl-4 pr-4 pt-4 pb-3 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-2">
                {goal.title}
              </h4>
              {goal.is_locked && (
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Goal is locked" />
              )}
            </div>
            {goal.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {goal.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.badge}`}
          >
            {cfg.icon}
            {cfg.label}
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
            <span>
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
            <BarChart3 className="inline h-3 w-3 mr-0.5" />
            {goal.weightage}%
          </span>
        </div>

        {/* Rejection / revision reason */}
        {goal.rejected_reason && (
          <div className="rounded-md bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Manager feedback: </span>
            {goal.rejected_reason}
          </div>
        )}

        {/* Approval timestamp */}
        {goal.status === "approved" && goal.approved_at && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Approved on{" "}
            {new Date(goal.approved_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page-level banner per mode ───────────────────────────────────────────────

type ViewMode = "submitted" | "approved" | "rejected" | "revision";

const MODE_BANNER: Record<
  ViewMode,
  { title: string; description: string; className: string }
> = {
  submitted: {
    title: "Goals Submitted — Awaiting Manager Review",
    description:
      "Your goals have been submitted and are pending review. You will be notified once your manager has reviewed them.",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300",
  },
  approved: {
    title: "Goals Approved & Locked 🎉",
    description:
      "All your goals have been approved and are now locked for this cycle. Contact an administrator if any changes are needed.",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/10 dark:text-emerald-300",
  },
  rejected: {
    title: "Goals Rejected",
    description:
      "Your goals have been rejected. Review the manager's feedback below and re-submit after making corrections.",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300",
  },
  revision: {
    title: "Revision Requested by Manager",
    description:
      "Your manager has requested changes. Review the feedback below, update your goals in the form, and re-submit.",
    className:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/40 dark:bg-violet-900/10 dark:text-violet-300",
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

interface GoalStatusViewProps {
  goals: NormalizedGoal[];
  mode: ViewMode;
}

export function GoalStatusView({ goals, mode }: GoalStatusViewProps) {
  const banner = MODE_BANNER[mode];
  const totalWeightage = goals.reduce((s, g) => s + (g.weightage ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Mode banner */}
      <div className={`rounded-xl border px-5 py-4 ${banner.className}`}>
        <p className="font-semibold">{banner.title}</p>
        <p className="mt-1 text-sm opacity-90">{banner.description}</p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>
          <span className="font-semibold text-foreground">{goals.length}</span>{" "}
          goal{goals.length !== 1 ? "s" : ""}
        </span>
        <span>
          Total weightage:{" "}
          <span
            className={`font-semibold ${
              totalWeightage === 100 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {totalWeightage}%
          </span>
        </span>
      </div>

      {/* Goal cards */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {goals.map((goal) => (
          <GoalStatusCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
