"use client";

/**
 * @file features/manager/components/ApprovalActionModal.tsx
 * @description Manager review modal — approve / reject / request-revision.
 *
 * Calls reviewGoalAction directly and emits sonner toasts on success/error.
 * Optional onSuccess callback lets the parent orchestrator refresh local state.
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { reviewGoalAction } from "@/features/goals/actions/goals.actions";
import type { NormalizedGoal } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalAction = "approve" | "reject" | "request_revision";

const ACTION_TO_STATUS: Record<ApprovalAction, string> = {
  approve: "approved",
  reject: "rejected",
  request_revision: "revision_requested",
};

interface ApprovalActionModalProps {
  /** Goal being reviewed. Pass null to close the modal. */
  goal: NormalizedGoal | null;
  /** Pre-selected action; the user can switch tabs inside the modal. */
  action: ApprovalAction | null;
  employeeName?: string;
  onClose: () => void;
  /** Called after a successful RPC — use to refresh parent state. */
  onSuccess?: (updatedGoal: NormalizedGoal) => void;
}

// ─── Action config ────────────────────────────────────────────────────────────

interface ActionConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  ctaLabel: string;
  ctaVariantClass: string;
  requiresReason: boolean;
  reasonLabel: string;
  reasonPlaceholder: string;
  commentLabel: string;
  commentPlaceholder: string;
}

const ACTION_CONFIG: Record<ApprovalAction, ActionConfig> = {
  approve: {
    title: "Approve Goal",
    description:
      "Goal will be locked immediately. Optionally leave feedback for the employee.",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    ctaLabel: "Approve Goal",
    ctaVariantClass:
      "bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500",
    requiresReason: false,
    reasonLabel: "",
    reasonPlaceholder: "",
    commentLabel: "Approval Feedback (Optional)",
    commentPlaceholder:
      "Well-defined goal, aligned with team objectives…",
  },
  reject: {
    title: "Reject Goal",
    description:
      "Provide a clear reason so the employee understands the decision.",
    icon: XCircle,
    iconClass: "text-red-500",
    ctaLabel: "Reject Goal",
    ctaVariantClass:
      "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
    requiresReason: true,
    reasonLabel: "Rejection Reason *",
    reasonPlaceholder:
      "Explain why this goal is being rejected and what fundamentally needs to change…",
    commentLabel: "Additional Feedback (Optional)",
    commentPlaceholder: "Any additional context or guidance…",
  },
  request_revision: {
    title: "Request Revision",
    description:
      "Ask the employee to revise and re-submit. Provide specific, actionable guidance.",
    icon: RefreshCw,
    iconClass: "text-amber-500",
    ctaLabel: "Send for Revision",
    ctaVariantClass:
      "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500",
    requiresReason: true,
    reasonLabel: "Revision Instructions *",
    reasonPlaceholder:
      "Describe exactly what needs to change before re-submission…",
    commentLabel: "Additional Guidance (Optional)",
    commentPlaceholder: "Examples or references that might help…",
  },
};

const ACTION_TABS: { key: ApprovalAction; label: string }[] = [
  { key: "approve", label: "Approve" },
  { key: "reject", label: "Reject" },
  { key: "request_revision", label: "Request Revision" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ApprovalActionModal({
  goal,
  action: initialAction,
  employeeName,
  onClose,
  onSuccess,
}: ApprovalActionModalProps) {
  const [activeAction, setActiveAction] = useState<ApprovalAction>(
    initialAction ?? "approve"
  );
  useEffect(() => {
  if (initialAction) {
    setActiveAction(initialAction);
  }
}, [initialAction]);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

 
  const config = ACTION_CONFIG[activeAction];
  const Icon = config.icon;

  const canSubmit =
    !isPending &&
    (!config.requiresReason || reason.trim().length >= 10);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleTabChange(tab: ApprovalAction) {
    if (isPending) return;
    setActiveAction(tab);
    setReason("");
    setComment("");
  }

  function handleClose() {
    if (isPending) return;
    setReason("");
    setComment("");
    onClose();
  }

  function handleConfirm() {
    if (!goal || !canSubmit) return;

    startTransition(async () => {
      const status = ACTION_TO_STATUS[activeAction];
      const result = await reviewGoalAction(
        goal.id,
        status,
        comment.trim(),
        reason.trim()
      );

      if (!result.success) {
        toast.error("Action failed", {
          description: result.error ?? "An unexpected error occurred.",
        });
        return;
      }

      const actionLabels: Record<ApprovalAction, string> = {
        approve: "approved",
        reject: "rejected",
        request_revision: "sent for revision",
      };

      toast.success(`Goal ${actionLabels[activeAction]}`, {
        description: employeeName
          ? `${employeeName}'s goal has been ${actionLabels[activeAction]}.`
          : "The goal status has been updated.",
      });

      onSuccess?.(result.data as NormalizedGoal);
      setReason("");
      setComment("");
      onClose();
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
<Dialog
  open={!!initialAction}
  onOpenChange={(open) => {
    if (!open) {
      handleClose();
    }
  }}
>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Goal context card */}
        {goal && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-medium leading-snug line-clamp-2">
              {goal.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {employeeName && (
                <>
                  <span className="font-medium text-foreground">
                    {employeeName}
                  </span>
                  <span>·</span>
                </>
              )}
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {goal.thrust_area}
              </span>
              <span>·</span>
              <span>{goal.weightage}% weightage</span>
              {goal.deadline_date && (
                <>
                  <span>·</span>
                  <span>
                    Due{" "}
                    {new Date(goal.deadline_date).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {ACTION_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              disabled={isPending}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeAction === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Mandatory reason (reject / revision only) */}
          {config.requiresReason && (
            <div className="space-y-1.5">
              <Label htmlFor="action-reason" className="text-sm font-medium">
                {config.reasonLabel}
              </Label>
              <Textarea
                id="action-reason"
                placeholder={config.reasonPlaceholder}
                className="resize-none text-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
              />
              {reason.length > 0 && reason.trim().length < 10 && (
                <p className="text-xs text-muted-foreground">
                  At least 10 characters required ({reason.trim().length}/10)
                </p>
              )}
            </div>
          )}

          {/* Optional comment (all actions) */}
          <div className="space-y-1.5">
            <Label
              htmlFor="action-comment"
              className="text-sm font-medium flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              {config.commentLabel}
            </Label>
            <Textarea
              id="action-comment"
              placeholder={config.commentPlaceholder}
              className="resize-none text-sm"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Visible to the employee and saved in the approval timeline.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className={config.ctaVariantClass}
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
