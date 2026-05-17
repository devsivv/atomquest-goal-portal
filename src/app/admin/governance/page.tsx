import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuditService } from "@/features/admin/services/audit.service";
import { GovernanceDashboard } from "@/features/admin/components/GovernanceDashboard";

export const metadata = {
  title: "Governance | Quartiq Admin",
  description: "Audit trail and goal unlock controls.",
};

export default async function GovernancePage() {
  const supabase = await createClient();

  // Fetch governance data in parallel
  const [auditLogs, lockedGoals] = await Promise.all([
    AuditService.getRecentGovernanceEvents(supabase, 100),
    AuditService.getLockedGoals(supabase)
  ]);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Governance</h1>
          <p className="text-muted-foreground mt-2">
            Audit logs and goal lock administration.
          </p>
        </div>
      </div>
      
      <GovernanceDashboard 
        auditLogs={auditLogs} 
        lockedGoals={lockedGoals} 
      />
    </div>
  );
}
