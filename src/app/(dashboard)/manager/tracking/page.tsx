import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ManagerQuarterlyDashboard } from "@/features/quarterly/components/manager/ManagerQuarterlyDashboard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Team Quarterly Review | Quartiq",
  description: "Review and acknowledge team quarterly check-ins.",
};

export default async function ManagerTrackingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find the active cycle robustly
  const { data: cycles, error: cycleError } = await supabase
    .from("goal_cycles")
    .select("id, status, is_default")
    .or("status.eq.active,is_default.eq.true")
    .order("is_default", { ascending: false })
    .limit(1);

  const cycle = cycles?.[0] || null;

  console.log("[ManagerTrackingPage] Cycle resolution:", {
    found: !!cycle,
    cycleId: cycle?.id,
    rawCyclesLength: cycles?.length,
    error: cycleError?.message
  });

  if (cycleError) {
    console.error("[ManagerTrackingPage] Active cycle fetch error:", cycleError);
  }

  if (!cycle) {
    return (
      <div className="max-w-6xl mx-auto py-6">
        <h2 className="text-2xl font-bold">No active performance cycle found.</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <ManagerQuarterlyDashboard managerId={user.id} cycleId={cycle.id} />
    </div>
  );
}
