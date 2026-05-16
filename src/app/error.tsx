"use client";

/**
 * @file app/error.tsx
 * @description Global error boundary — catches unexpected runtime errors.
 * Must be a Client Component. Wraps the entire app below the root layout.
 */

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // TODO: Log to error reporting service (e.g., Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.digest ? `Error ID: ${error.digest}` : error.message}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
