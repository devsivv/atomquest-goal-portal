import { createClient } from "@/lib/supabase/server";
import { CycleService } from "@/features/admin/services/cycle.service";
import { ExportCenterDashboard } from "@/features/admin/components/ExportCenterDashboard";

export const metadata = {
  title: "Reports & Exports | Quartiq Admin",
  description: "Download organization-wide metrics and performance reports.",
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const cycles = await CycleService.getAll(supabase);
  const activeCycle = cycles.find((c) => c.status === "active") ?? cycles[0] ?? null;

  if (!activeCycle) {
    return (
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Center</h1>
          <p className="text-muted-foreground mt-2">
            No active performance cycle found. Create and activate a cycle first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Center</h1>
          <p className="text-muted-foreground mt-2">
            Generate and download executive reports for cycle <span className="font-semibold text-foreground">{activeCycle.name}</span>.
          </p>
        </div>
      </div>
      
      <ExportCenterDashboard activeCycleName={activeCycle.name} />
    </div>
  );
}
