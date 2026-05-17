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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/10">
      <div className="w-full max-w-md bg-card rounded-xl border shadow-lg p-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-2">
          <svg className="h-8 w-8 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            System Error Encountered
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A critical error occurred while rendering this page. Our engineering team has been notified.
          </p>
          <div className="mt-4 p-3 bg-muted rounded-md text-xs text-left overflow-auto max-h-32 border font-mono text-muted-foreground">
            {error.digest ? `Error ID: ${error.digest}\n` : ""}
            {error.message}
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Attempt Recovery
          </button>
        </div>
      </div>
    </div>
  );
}
