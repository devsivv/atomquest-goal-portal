"use client";

/**
 * @file features/manager/components/ApprovalActionModal.tsx
 * @description Modal dialog for approve / reject / request-revision actions.
 *
 * - Approve: optional comment field (positive feedback to employee)
 * - Reject: mandatory reason + optional additional comment
 * - Request Revision: mandatory reason + optional additional comment
 *
 * Calls onConfirm(goalId, action, reason?, comment?) — the dashboard
 * orchestrator maps these to the appropriate RPC function.
 */

import { useState, useTransition } from "react";
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
import { CheckCircle2, XCircle, RefreshCw, Loader2, MessageSquare } from "lucide-react";
import type { NormalizedGoal } from "@/types";

export type ApprovalAction = "approve" | "reject" | "request_revision";

interface ApprovalActionModalProps {
  goal: NormalizedGoal | null;
  action: ApprovalAction | null;
  onClose: () => void;
  /** reason = mandatory for reject/revision; comment = optional for all */
  onConfirm: (
    goalId: string,
    action: ApprovalAction,
    reason?: string,
    comment?: string
  ) => Promise<void>;
}

interface ActionConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  ctaLabel: string;
  ctaClass: string;
  requiresReason: boolean;
  reasonLabel: string;
  reasonPlaceholder: string;
  hasOptionalComment: boolean;
  commentLabel: string;
  commentPlaceholder: string;
}

const ACTION_CONFIG: Record<ApprovalAction, ActionConfig> = {
  approve: {
    title: "Approve Goal",
    description:
      "Confirm approval. The goal will be locked immediately. Optionally leave feedback for the employee.",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    ctaLabel: "Approve Goal",
    ctaClass: "bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500",
    requiresReason: false,
    reasonLabel: "",
    reasonPlaceholder: "",
    hasOptionalComment: true,
    commentLabel: "Approval Feedback (Optional)",
    commentPlaceholder: "Great work! This goal is well-defined and aligned with team objectives...",
  },
  reject: {
    title: "Reject Goal",
    description:
      "This goal will be rejected. Provide a clear reason so the employee can understand the decision.",
    icon: XCircle,
    iconClass: "text-red-500",
    ctaLabel: "Reject Goal",
    ctaClass: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500",
    requiresReason: true,
    reasonLabel: "Rejection Reason *",
    reasonPlaceholder: "Explain why this goal is being rejected and what fundamentally needs to change...",
    hasOptionalComment: true,
    commentLabel: "Additional Feedback (Optional)",
    commentPlaceholder: "Any additional context or guidance for the employee...",
  },
  request_revision: {
    title: "Request Revision",
    description:
      "Ask the employee to revise and re-submit this goal. Provide specific, actionable guidance.",
    icon: RefreshCw,
    iconClass: "text-amber-500",
    ctaLabel: "Send for Revision",
    ctaClass: "bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-500",
    requiresReason: true,
    reasonLabel: "Revision Instructions *",
    reasonPlaceholder: "Describe exactly what needs to change before re-submission...",
    hasOptionalComment: true,
    commentLabel: "Additional Guidance (Optional)",
    commentPlaceholder: "Any examples or references that might help the employee revise...",
  },
};

export function ApprovalActionModal({
  goal,
  action,
  onClose,
  onConfirm,
}: ApprovalActionModalProps) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const isOpen = !!goal && !!action;
  const config = action ? ACTION_CONFIG[action] : null;
  const Icon = config?.icon;

  const canConfirm =
    !isPending &&
    config &&
    (!config.requiresReason || reason.trim().length >= 10);

  function handleClose() {
    if (isPending) return;
    setReason("");
    setComment("");
    onClose();
  }

  function handleConfirm() {
    if (!goal || !action || !canConfirm) return;
    startTransition(async () => {
      await onConfirm(
        goal.id,
        action,
        reason.trim() || undefined,
        comment.trim() || undefined
      );
      setReason("");
      setComment("");
      onClose();
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && config && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className={`h-5 w-5 ${config.iconClass}`} />
              </div>
            )}
            <div>
              <DialogTitle>{config?.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {config?.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Goal context card */}
        {goal && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-medium leading-snug line-clamp-2">{goal.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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

        <div className="space-y-4">
          {/* Mandatory reason (reject / revision only) */}
          {config?.requiresReason && (
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
          {config?.hasOptionalComment && (
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
                This comment will be visible to the employee and saved in the
                approval timeline.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className={config?.ctaClass}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config?.ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
