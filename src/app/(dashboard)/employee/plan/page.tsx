import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authService } from "@/features/auth/services/auth.service";
import { GoalCreationDashboard } from "@/features/goals/components/GoalCreationDashboard";
import { ROUTES } from "@/constants";

export const metadata: Metadata = {
  title: "Plan Goals | AtomQuest",
  description: "Plan and submit your enterprise goals for the current cycle.",
};

export default async function EmployeeGoalPlanningPage() {
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-6">
        No active goal cycle found. Please contact an administrator.
      </div>
    );
  }

  return (
    <div className="py-6">
      <GoalCreationDashboard 
        profileId={profile.id} 
        cycleId={activeCycle.id} 
      />
    </div>
  );
}
