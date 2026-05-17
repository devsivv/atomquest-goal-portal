"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NormalizedGoal, QuarterlyCheckin, QuarterlyGoalUpdate } from "@/types";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManagerFeedbackModalProps {
  goal: NormalizedGoal | null;
  checkin: QuarterlyCheckin | null;
  update: QuarterlyGoalUpdate | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (checkinId: string, feedback: string) => Promise<void>;
}

export function ManagerFeedbackModal({
  goal,
  checkin,
  update,
  isOpen,
  isPending,
  onClose,
  onConfirm
}: ManagerFeedbackModalProps) {
  const [feedback, setFeedback] = useState("");

  if (!goal || !checkin) return null;

  const handleConfirm = async () => {
    if (!checkin) return;
    await onConfirm(checkin.id, feedback);
    setFeedback("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle>Acknowledge Check-in</DialogTitle>
              <DialogDescription className="mt-0.5">
                Review progress and provide feedback to the employee.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-3">
          <div>
            <p className="font-medium">{goal.title}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline">Weightage: {goal.weightage}%</Badge>
              <Badge variant="outline">Target: {goal.target_value ?? 'N/A'}</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Reported Progress</p>
              <p className="text-lg font-bold">{checkin.progress_pct}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Actual Value</p>
              <p className="text-lg font-bold">{update?.actual_value ?? 'N/A'}</p>
            </div>
          </div>
          
          {checkin.employee_notes && (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">Employee Notes</p>
              <p className="italic text-muted-foreground">"{checkin.employee_notes}"</p>
            </div>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="manager-feedback">Manager Feedback (Optional)</Label>
          <Textarea
            id="manager-feedback"
            placeholder="Provide constructive feedback, acknowledge their effort, or suggest next steps..."
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isPending}
            className="resize-none"
          />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Acknowledge Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
