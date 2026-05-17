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

  // Find the active cycle to pass to the dashboard
  const { data: cycle } = await supabase
    .from("performance_cycles")
    .select("id")
    .eq("status", "active")
    .single();

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
