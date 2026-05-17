import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminAnalyticsService } from "@/features/admin/services/analytics.service";
import { CycleService } from "@/features/admin/services/cycle.service";
import { OrgCompletionDashboard } from "@/features/admin/components/OrgCompletionDashboard";

export const metadata = {
  title: "Org Analytics | Quartiq Admin",
  description: "Organisation-wide goal completion, check-in tracking and manager effectiveness.",
};

export default async function OrgAnalyticsPage() {
  const supabase = await createClient();

  const cycles = await CycleService.getAll(supabase);
  const activeCycle = cycles.find((c) => c.status === "active") ?? cycles[0] ?? null;

  if (!activeCycle) {
    return (
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Org Analytics</h1>
          <p className="text-muted-foreground mt-2">
            No active performance cycle found. Create and activate a cycle first.
          </p>
        </div>
      </div>
    );
  }

  // Parallel fetch all analytics data
  const [kpis, submissions, overdue, heatmap, managers] = await Promise.all([
    AdminAnalyticsService.getOrgKpis(supabase, activeCycle.id),
    AdminAnalyticsService.getEmployeeSubmissionStatus(supabase, activeCycle.id),
    AdminAnalyticsService.getOverdueApprovals(supabase, activeCycle.id),
    AdminAnalyticsService.getDepartmentHeatmap(supabase, activeCycle.id),
    AdminAnalyticsService.getManagerEffectiveness(supabase, activeCycle.id),
  ]);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Org Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Cycle:{" "}
            <span className="font-semibold text-foreground">{activeCycle.name}</span>
          </p>
        </div>
      </div>
      <OrgCompletionDashboard
        kpis={kpis}
        submissions={submissions}
        overdue={overdue}
        heatmap={heatmap}
        managers={managers}
        cycleName={activeCycle.name}
      />
    </div>
  );
}
