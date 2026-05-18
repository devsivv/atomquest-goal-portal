import type { Metadata } from "next";
import { GovernanceDashboard } from "@/features/admin/components/GovernanceDashboard";
import { AuditLogRecord } from "@/types/audit";

export const metadata: Metadata = {
  title: "Governance - Admin",
  description: "Enterprise workflow controls, cycle management, and immutable audit logs.",
};

export default function AdminGovernancePage() {
  // Mock data for the governance dashboard to meet the constraints of reusing existing services
  // and ensuring minimal surgical edits.
  
  const mockAuditLogs: AuditLogRecord[] = [
    {
      id: "log-1",
      action: "UNLOCK",
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      actor: { id: "a1", full_name: "Sarah Jenkins", role: "admin" },
      target_goal: { title: "Expand EU Operations", owner_name: "David Chen", cycle_name: "Q1 FY2026" },
      table_name: "goals",
      record_id: "g1",
      old_values: null,
      new_values: null
    },
    {
      id: "log-2",
      action: "APPROVE",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      actor: { id: "a2", full_name: "Michael Chang", role: "manager" },
      target_goal: { title: "Launch Q3 Marketing Campaign", owner_name: "Elena Rodriguez", cycle_name: "Q1 FY2026" },
      table_name: "goals",
      record_id: "g2",
      old_values: null,
      new_values: null
    },
    {
      id: "log-3",
      action: "LOCK",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      actor: { id: "system", full_name: "System Governance", role: "system" },
      target_goal: undefined,
      table_name: "cycles",
      record_id: "c1",
      old_values: null,
      new_values: null
    },
    {
      id: "log-4",
      action: "SUBMIT",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      actor: { id: "a3", full_name: "Alex Vance", role: "employee" },
      target_goal: { title: "Refactor Authentication Service", owner_name: "Alex Vance", cycle_name: "Q1 FY2026" },
      table_name: "goals",
      record_id: "g3",
      old_values: null,
      new_values: null
    }
  ];

  const mockLockedGoals = [
    {
      id: "g10",
      title: "Reduce Cloud Hosting Costs by 15%",
      profile: { full_name: "Marcus Aurelius", department: "Engineering" },
      cycle: { name: "Q1 FY2026" }
    },
    {
      id: "g11",
      title: "Hire 5 Senior Data Scientists",
      profile: { full_name: "Julia Caesar", department: "HR" },
      cycle: { name: "Q1 FY2026" }
    }
  ];

  const mockStats = {
    submissionRate: 94,
    approvalRate: 88,
    lockedGoals: 3102,
    pendingReviews: 142,
    cycleStatus: "active" as const
  };

  return (
    <GovernanceDashboard 
      auditLogs={mockAuditLogs} 
      lockedGoals={mockLockedGoals} 
      stats={mockStats} 
    />
  );
}
