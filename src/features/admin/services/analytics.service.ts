import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OrgCompletionKpis,
  EmployeeSubmissionRow,
  CheckinCompletionRow,
  OverdueApprovalRow,
  DeptHeatmapRow,
  ManagerEffectivenessRow,
} from "@/types/analytics";
import type { QuarterLabel } from "@/types/cycles";

export const AdminAnalyticsService = {
  // ─── KPI Overview ──────────────────────────────────────────────────────────
  async getOrgKpis(
    client: SupabaseClient,
    cycleId: string
  ): Promise<OrgCompletionKpis> {
    // Parallel queries for speed
    const [profilesRes, goalsRes, checkinsRes] = await Promise.all([
      client
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),

      client
        .from("goals")
        .select("id, status, profile_id, submitted_at")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null),

      client
        .from("quarterly_checkins")
        .select("progress_pct")
        .is("deleted_at", null),
    ]);

    const totalEmployees = profilesRes.count ?? 0;
    const goals = goalsRes.data ?? [];
    const checkins = checkinsRes.data ?? [];

    const submittedGoals = goals.filter((g) =>
      ["submitted", "under_review", "approved", "rejected", "revision_requested"].includes(g.status)
    ).length;

    const approvedGoals = goals.filter((g) =>
      g.status === "approved" || g.status === "completed"
    ).length;

    const pendingApprovalGoals = goals.filter((g) =>
      g.status === "submitted" || g.status === "under_review"
    ).length;

    // Overdue = submitted > 5 days ago and still pending
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const overdueApprovals = goals.filter(
      (g) =>
        (g.status === "submitted" || g.status === "under_review") &&
        g.submitted_at &&
        new Date(g.submitted_at) < fiveDaysAgo
    ).length;

    const uniqueSubmitters = new Set(
      goals
        .filter((g) => g.status !== "draft")
        .map((g) => g.profile_id)
    ).size;

    const submissionRate =
      totalEmployees > 0 ? Math.round((uniqueSubmitters / totalEmployees) * 100) : 0;

    const avgGoalProgress =
      checkins.length > 0
        ? Math.round(
            checkins.reduce((sum, c) => sum + (Number(c.progress_pct) || 0), 0) /
              checkins.length
          )
        : 0;

    return {
      totalEmployees,
      totalGoals: goals.length,
      submittedGoals,
      approvedGoals,
      pendingApprovalGoals,
      overdueApprovals,
      submissionRate,
      avgGoalProgress,
    };
  },

  // ─── Employee Submission Rows ──────────────────────────────────────────────
  async getEmployeeSubmissionStatus(
    client: SupabaseClient,
    cycleId: string
  ): Promise<EmployeeSubmissionRow[]> {
    const { data: goals, error } = await client
      .from("goals")
      .select(`
        id, status, profile_id,
        profile:profiles!profile_id(
          id, full_name, employee_id, department,
          manager:manager_id(full_name)
        )
      `)
      .eq("cycle_id", cycleId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    // Group by profile
    const map = new Map<string, EmployeeSubmissionRow>();
    for (const goal of goals ?? []) {
      const p = goal.profile as any;
      if (!p) continue;
      if (!map.has(p.id)) {
        map.set(p.id, {
          profileId: p.id,
          fullName: p.full_name,
          employeeId: p.employee_id,
          department: p.department,
          managerName: p.manager?.full_name ?? null,
          totalGoals: 0,
          submittedCount: 0,
          approvedCount: 0,
          pendingCount: 0,
          hasSubmitted: false,
        });
      }
      const row = map.get(p.id)!;
      row.totalGoals++;
      if (goal.status !== "draft") { row.submittedCount++; row.hasSubmitted = true; }
      if (goal.status === "approved" || goal.status === "completed") row.approvedCount++;
      if (goal.status === "submitted" || goal.status === "under_review") row.pendingCount++;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    );
  },

  // ─── Quarterly Check-in Completion ────────────────────────────────────────
  async getCheckinCompletion(
    client: SupabaseClient,
    quarter: QuarterLabel
  ): Promise<CheckinCompletionRow[]> {
    const { data: checkins, error } = await client
      .from("quarterly_checkins")
      .select(`
        id, checkin_status, progress_pct, created_at, updated_at, quarter,
        employee_id,
        employee:profiles!employee_id(id, full_name, department),
        acknowledger:acknowledged_by(full_name)
      `)
      .eq("quarter", quarter)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (checkins ?? []).map((c: any) => ({
      profileId: c.employee?.id ?? c.employee_id,
      fullName: c.employee?.full_name ?? "Unknown",
      department: c.employee?.department ?? null,
      quarter: c.quarter as QuarterLabel,
      checkinStatus: c.checkin_status,
      progressPct: c.progress_pct !== null ? Number(c.progress_pct) : null,
      submittedAt: c.updated_at,
      acknowledgedBy: c.acknowledger?.full_name ?? null,
    }));
  },

  // ─── Overdue Approvals ────────────────────────────────────────────────────
  async getOverdueApprovals(
    client: SupabaseClient,
    cycleId: string,
    thresholdDays = 5
  ): Promise<OverdueApprovalRow[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - thresholdDays);

    const { data, error } = await client
      .from("goals")
      .select(`
        id, title, status, submitted_at,
        employee:profiles!profile_id(
          full_name, department,
          manager:manager_id(full_name)
        )
      `)
      .eq("cycle_id", cycleId)
      .in("status", ["submitted", "under_review"])
      .lt("submitted_at", cutoff.toISOString())
      .is("deleted_at", null)
      .order("submitted_at", { ascending: true });

    if (error) throw new Error(error.message);

    const now = Date.now();
    return (data ?? []).map((g: any) => {
      const submittedAt = g.submitted_at ?? "";
      const ms = submittedAt ? now - new Date(submittedAt).getTime() : 0;
      const daysOverdue = Math.floor(ms / (1000 * 60 * 60 * 24));
      return {
        goalId: g.id,
        goalTitle: g.title,
        employeeName: g.employee?.full_name ?? "Unknown",
        department: g.employee?.department ?? null,
        managerName: g.employee?.manager?.full_name ?? null,
        submittedAt,
        daysOverdue,
        status: g.status,
      };
    });
  },

  // ─── Department Heatmap ───────────────────────────────────────────────────
  async getDepartmentHeatmap(
    client: SupabaseClient,
    cycleId: string
  ): Promise<DeptHeatmapRow[]> {
    // Fetch all goals + profiles + checkins in one sweep
    const { data: goals, error: gErr } = await client
      .from("goals")
      .select(`
        id, status, profile_id,
        profile:profiles!profile_id(department)
      `)
      .eq("cycle_id", cycleId)
      .is("deleted_at", null);

    if (gErr) throw new Error(gErr.message);

    const { data: checkins, error: cErr } = await client
      .from("quarterly_checkins")
      .select("goal_id, quarter, progress_pct")
      .is("deleted_at", null);

    if (cErr) throw new Error(cErr.message);

    // Checkin lookup by goal_id
    const checkinMap = new Map<string, Record<string, number>>();
    for (const c of checkins ?? []) {
      if (!checkinMap.has(c.goal_id)) checkinMap.set(c.goal_id, {});
      checkinMap.get(c.goal_id)![c.quarter] = Number(c.progress_pct) || 0;
    }

    // Aggregate by department
    const deptMap = new Map<string, DeptHeatmapRow>();
    const employeeDepts = new Map<string, string>();

    for (const g of goals ?? []) {
      const dept = (g.profile as any)?.department ?? "Unassigned";
      employeeDepts.set(g.profile_id, dept);

      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          totalEmployees: 0,
          submittedGoals: 0,
          approvedGoals: 0,
          q1Progress: 0,
          q2Progress: 0,
          q3Progress: 0,
          q4Progress: 0,
          avgProgress: 0,
        });
      }
      const row = deptMap.get(dept)!;
      if (g.status !== "draft") row.submittedGoals++;
      if (g.status === "approved" || g.status === "completed") row.approvedGoals++;

      const qMap = checkinMap.get(g.id) ?? {};
      row.q1Progress += qMap["Q1"] ?? 0;
      row.q2Progress += qMap["Q2"] ?? 0;
      row.q3Progress += qMap["Q3"] ?? 0;
      row.q4Progress += qMap["Q4"] ?? 0;
    }

    // Count distinct employees per dept
    const deptEmployeeCounts = new Map<string, Set<string>>();
    for (const [pid, dept] of employeeDepts.entries()) {
      if (!deptEmployeeCounts.has(dept)) deptEmployeeCounts.set(dept, new Set());
      deptEmployeeCounts.get(dept)!.add(pid);
    }

    return Array.from(deptMap.values()).map((row) => {
      const empSet = deptEmployeeCounts.get(row.department);
      row.totalEmployees = empSet?.size ?? 0;
      const total = row.q1Progress + row.q2Progress + row.q3Progress + row.q4Progress;
      row.avgProgress = row.totalEmployees > 0 ? Math.round(total / 4) : 0;
      return row;
    });
  },

  // ─── Manager Effectiveness ────────────────────────────────────────────────
  async getManagerEffectiveness(
    client: SupabaseClient,
    cycleId: string
  ): Promise<ManagerEffectivenessRow[]> {
    const { data: goals, error: gErr } = await client
      .from("goals")
      .select(`
        id, status, submitted_at, reviewed_at,
        profile:profiles!profile_id(
          manager_id,
          manager:manager_id(id, full_name)
        )
      `)
      .eq("cycle_id", cycleId)
      .is("deleted_at", null);

    if (gErr) throw new Error(gErr.message);

    const { data: checkins, error: cErr } = await client
      .from("quarterly_checkins")
      .select("id, checkin_status, acknowledged_by, employee_id")
      .is("deleted_at", null);

    if (cErr) throw new Error(cErr.message);

    // Map manager_id → checkin ack stats
    const mgrCheckinMap = new Map<string, { total: number; acked: number }>();
    for (const c of checkins ?? []) {
      if (!c.acknowledged_by) continue;
      if (!mgrCheckinMap.has(c.acknowledged_by)) mgrCheckinMap.set(c.acknowledged_by, { total: 0, acked: 0 });
      mgrCheckinMap.get(c.acknowledged_by)!.total++;
      if (c.checkin_status === "acknowledged") mgrCheckinMap.get(c.acknowledged_by)!.acked++;
    }

    const mgrMap = new Map<string, ManagerEffectivenessRow>();

    for (const g of goals ?? []) {
      const p = g.profile as any;
      const mgr = p?.manager;
      if (!mgr) continue;

      if (!mgrMap.has(mgr.id)) {
        mgrMap.set(mgr.id, {
          managerId: mgr.id,
          managerName: mgr.full_name,
          teamSize: 0,
          pendingReviews: 0,
          avgReviewDays: 0,
          approvedCount: 0,
          rejectedCount: 0,
          ackRate: 0,
        });
      }

      const row = mgrMap.get(mgr.id)!;
      row.teamSize++;
      if (g.status === "submitted" || g.status === "under_review") row.pendingReviews++;
      if (g.status === "approved" || g.status === "completed") {
        row.approvedCount++;
        if (g.submitted_at && g.reviewed_at) {
          const days =
            (new Date(g.reviewed_at).getTime() - new Date(g.submitted_at).getTime()) /
            (1000 * 60 * 60 * 24);
          // running average
          row.avgReviewDays =
            row.approvedCount === 1
              ? days
              : (row.avgReviewDays * (row.approvedCount - 1) + days) / row.approvedCount;
        }
      }
      if (g.status === "rejected" || g.status === "revision_requested") row.rejectedCount++;
    }

    // Ack rate from checkins
    for (const [mgrId, row] of mgrMap.entries()) {
      const ackStats = mgrCheckinMap.get(mgrId);
      row.ackRate =
        ackStats && ackStats.total > 0
          ? Math.round((ackStats.acked / ackStats.total) * 100)
          : 0;
      row.avgReviewDays = Math.round(row.avgReviewDays * 10) / 10;
    }

    return Array.from(mgrMap.values()).sort((a, b) => b.teamSize - a.teamSize);
  },
};
