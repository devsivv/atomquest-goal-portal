"use client";

/**
 * @file components/providers/index.tsx
 * @description Root client-side provider tree.
 * Wrap the app with: QueryClientProvider, ThemeProvider.
 * Add new providers here — never scatter them across layout files.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { getQueryClient } from "@/lib/query-client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // getQueryClient() returns the browser singleton safely
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" richColors />
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
