"use client";

import { CheckCircle2, Loader2, CloudOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

interface AutosaveIndicatorProps {
  status: AutosaveState;
  lastSavedAt: Date | null;
}

export function AutosaveIndicator({ status, lastSavedAt }: AutosaveIndicatorProps) {
  if (status === "idle" && !lastSavedAt) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground transition-all duration-300">
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Saving draft...</span>
        </>
      )}
      
      {status === "saved" && lastSavedAt && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}</span>
        </>
      )}

      {status === "error" && (
        <>
          <CloudOff className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Failed to save draft</span>
        </>
      )}
    </div>
  );
}
