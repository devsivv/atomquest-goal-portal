import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authService } from "@/features/auth/services/auth.service";
import { GoalCreationDashboard } from "@/features/goals/components";
import { ROUTES } from "@/constants";

export const metadata: Metadata = {
  title: "Goals",
  description: "Create, manage, and track your goals.",
};

export default async function GoalsPage() {
  const profile = await authService.getCurrentProfile();
  if (!profile) redirect(ROUTES.LOGIN);

  const supabase = await createClient();
  const { data: activeCycle } = await supabase
    .from("goal_cycles")
    .select("id")
    .eq("is_default", true)
    .single();

  if (!activeCycle) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400 mb-6">
        No active goal cycle found. Please contact an administrator.
      </div>
    );
  }

  return (
    <GoalCreationDashboard 
      profileId={profile.id} 
      cycleId={activeCycle.id} 
    />
  );
}
