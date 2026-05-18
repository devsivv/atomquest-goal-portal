/**
 * @file app/(dashboard)/manager/page.tsx
 * @description Manager Dashboard — Server Component.
 *
 * Data flow:
 * 1. Server fetches the manager's profile (already validated by layout).
 * 2. Fetches the active goal cycle.
 * 3. Fetches all submitted team goals via managerService (RLS-scoped).
 * 4. Passes pre-fetched data to the Client Orchestrator (ManagerApprovalDashboard).
 *
 * No client-side data fetching on initial load — instant paint from server data.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authService } from "@/features/auth/services/auth.service";
import { managerService } from "@/features/manager/services/manager.service";
import { ManagerApprovalDashboard } from "@/features/manager/components";
import { ROUTES } from "@/constants";

export const metadata: Metadata = {
  title: "Team Goal Review — Quartiq",
  description:
    "Review, approve, and manage your team's submitted performance goals.",
};

export default async function ManagerDashboardPage() {
  // ── Auth & Role Guard ──────────────────────────────────────────────────────
  const profile = await authService.getCurrentProfile();
  if (!profile) redirect(ROUTES.LOGIN);

  // Only managers and admins should access this page
  if (profile.role !== "manager" && profile.role !== "admin") {
    redirect("/employee");
  }

  const supabase = await createClient();

  // ── Fetch Active Cycle ─────────────────────────────────────────────────────
  const { data: activeCycle } = await supabase
    .from("goal_cycles")
    .select("id, name, cycle_type, status, start_date, end_date")
    .eq("is_default", true)
    .single();

  // ── Fetch Team Goals ───────────────────────────────────────────────────────
  let teamGroups: Awaited<ReturnType<typeof managerService.getTeamSubmittedGoals>> = [];

  if (activeCycle) {
    try {
      teamGroups = await managerService.getTeamSubmittedGoals(
        supabase,
        activeCycle.id,
        // Filter to this manager's direct reports only.
        // Admins see all teams (no manager_id filter).
        profile.role === "manager" ? profile.id : undefined
      );
    } catch (err) {
      // Log but don't crash — render empty state in the dashboard
      console.error("[ManagerDashboardPage] Failed to fetch team goals:", err);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">

      {/* Cycle context bar */}
      {activeCycle && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm mb-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-medium">Active Cycle:</span>
            <span className="text-muted-foreground">{activeCycle.name}</span>
          </div>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-muted-foreground capitalize">
            {activeCycle.status}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-muted-foreground text-xs">
            {new Date(activeCycle.start_date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" – "}
            {new Date(activeCycle.end_date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {!activeCycle && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400 mb-6">
          No active goal cycle found. Please ask your admin to configure one.
        </div>
      )}

      {/* Client orchestrator — receives SSR data */}
      <ManagerApprovalDashboard
        initialGroups={teamGroups}
        managerId={profile.id}
        cycleId={activeCycle?.id ?? ""}
      />
    </div>
  );
}
