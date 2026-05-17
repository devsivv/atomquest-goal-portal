"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Users, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Search, BarChart3, Activity,
} from "lucide-react";
import type {
  OrgCompletionKpis,
  EmployeeSubmissionRow,
  OverdueApprovalRow,
  DeptHeatmapRow,
  ManagerEffectivenessRow,
} from "@/types/analytics";
import { format, parseISO } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function heatColor(pct: number) {
  if (pct === 0) return "bg-muted";
  if (pct < 40) return "bg-rose-500/70 dark:bg-rose-500/60";
  if (pct < 70) return "bg-amber-400/80 dark:bg-amber-400/70";
  if (pct < 90) return "bg-emerald-400/80 dark:bg-emerald-400/70";
  return "bg-emerald-500 dark:bg-emerald-500";
}

function kpiCard(
  label: string,
  value: string | number,
  sub: string,
  Icon: React.ComponentType<{ className?: string }>,
  color: string,
  bg: string
) {
  return (
    <Card className="shadow-sm border-border transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  kpis: OrgCompletionKpis;
  submissions: EmployeeSubmissionRow[];
  overdue: OverdueApprovalRow[];
  heatmap: DeptHeatmapRow[];
  managers: ManagerEffectivenessRow[];
  cycleName: string;
}

export function OrgCompletionDashboard({ kpis, submissions, overdue, heatmap, managers }: Props) {
  const [subSearch, setSubSearch] = useState("");
  const [mgrSearch, setMgrSearch] = useState("");

  const filteredSubs = submissions.filter(
    (s) =>
      !subSearch ||
      s.fullName.toLowerCase().includes(subSearch.toLowerCase()) ||
      (s.department ?? "").toLowerCase().includes(subSearch.toLowerCase())
  );

  const filteredMgrs = managers.filter(
    (m) => !mgrSearch || m.managerName.toLowerCase().includes(mgrSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCard("Submission Rate", `${kpis.submissionRate}%`, `${kpis.totalEmployees} employees`, TrendingUp,
          "text-primary", "bg-primary/10")}
        {kpiCard("Goals Approved", kpis.approvedGoals, `of ${kpis.totalGoals} total goals`, CheckCircle2,
          "text-emerald-600 dark:text-emerald-400", "bg-emerald-500/10")}
        {kpiCard("Pending Review", kpis.pendingApprovalGoals, "awaiting manager action", Clock,
          kpis.pendingApprovalGoals > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          kpis.pendingApprovalGoals > 0 ? "bg-amber-500/10" : "bg-muted")}
        {kpiCard("Overdue Approvals", kpis.overdueApprovals, ">5 days without action", AlertTriangle,
          kpis.overdueApprovals > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
          kpis.overdueApprovals > 0 ? "bg-red-500/10" : "bg-muted")}
      </div>

      {/* ── Org Progress Bar ─────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">Organisation-wide Goal Progress</p>
              <p className="text-sm text-muted-foreground">Average across all active check-ins</p>
            </div>
            <span className="text-3xl font-bold">{kpis.avgGoalProgress}%</span>
          </div>
          <Progress value={kpis.avgGoalProgress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Department Heatmap ───────────────────────────────────────────── */}
      <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Department Velocity Heatmap</CardTitle>
          <CardDescription>Quarterly progress by department</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {heatmap.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No department data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-center">Employees</th>
                  <th className="px-5 py-3 text-center">Q1</th>
                  <th className="px-5 py-3 text-center">Q2</th>
                  <th className="px-5 py-3 text-center">Q3</th>
                  <th className="px-5 py-3 text-center">Q4</th>
                  <th className="px-5 py-3 text-center">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {heatmap.map((row) => (
                  <tr key={row.department} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{row.department}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{row.totalEmployees}</td>
                    {[row.q1Progress, row.q2Progress, row.q3Progress, row.q4Progress].map((val, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        <div
                          title={`${Math.round(val)}%`}
                          className={`h-8 w-full rounded-md ${heatColor(val)} cursor-default transition-all hover:ring-2 ring-ring ring-offset-1 ring-offset-background`}
                        />
                      </td>
                    ))}
                    <td className="px-5 py-3 text-center">
                      <Badge variant="secondary" className="text-xs">{row.avgProgress}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Two-column: Overdue + Manager Effectiveness ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Overdue Approvals */}
        <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" /> Overdue Approvals
            </CardTitle>
            <CardDescription>Goals pending review for more than 5 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-80">
            {overdue.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                All approvals are on time.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Goal</th>
                    <th className="px-4 py-3 text-center">Days Overdue</th>
                    <th className="px-4 py-3 text-left">Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {overdue.map((row) => (
                    <tr key={row.goalId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.employeeName}</p>
                        <p className="text-muted-foreground/70">{row.department ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[140px] truncate" title={row.goalTitle}>
                        {row.goalTitle}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="outline"
                          className={`${row.daysOverdue > 10 ? "border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10" : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"}`}
                        >
                          {row.daysOverdue}d
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.managerName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Manager Effectiveness */}
        <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Manager Effectiveness
                </CardTitle>
                <CardDescription>Review velocity and acknowledgement rates</CardDescription>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filter managers…"
                value={mgrSearch}
                onChange={(e) => setMgrSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-80">
            {filteredMgrs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No manager data yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Manager</th>
                    <th className="px-4 py-3 text-center">Team</th>
                    <th className="px-4 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-center">Avg Days</th>
                    <th className="px-4 py-3 text-center">Ack Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMgrs.map((m) => (
                    <tr key={m.managerId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{m.managerName}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{m.teamSize}</td>
                      <td className="px-4 py-3 text-center">
                        {m.pendingReviews > 0 ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                            {m.pendingReviews}
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={m.avgReviewDays > 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {m.avgReviewDays > 0 ? `${m.avgReviewDays}d` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1.5">
                          <Progress value={m.ackRate} className="h-1.5 flex-1" />
                          <span className="text-muted-foreground w-8 text-right">{m.ackRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Employee Submission Table ─────────────────────────────────────── */}
      <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Employee Submission Status
              </CardTitle>
              <CardDescription>Goal submission and approval breakdown per employee</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search employees…"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredSubs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No employee data for this cycle.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Department</th>
                  <th className="px-5 py-3 text-left hidden lg:table-cell">Manager</th>
                  <th className="px-5 py-3 text-center">Goals</th>
                  <th className="px-5 py-3 text-center">Submitted</th>
                  <th className="px-5 py-3 text-center">Approved</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubs.map((row) => (
                  <tr key={row.profileId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {row.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{row.fullName}</p>
                          {row.employeeId && <p className="text-xs text-muted-foreground">{row.employeeId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">{row.department ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden lg:table-cell">{row.managerName ?? "—"}</td>
                    <td className="px-5 py-3 text-center">{row.totalGoals}</td>
                    <td className="px-5 py-3 text-center">{row.submittedCount}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={row.approvedCount === row.totalGoals && row.totalGoals > 0
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : ""}>
                        {row.approvedCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {row.totalGoals === 0 ? (
                        <Badge variant="outline" className="text-xs">No Goals</Badge>
                      ) : !row.hasSubmitted ? (
                        <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">Not Submitted</Badge>
                      ) : row.pendingCount > 0 ? (
                        <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10">In Review</Badge>
                      ) : row.approvedCount === row.totalGoals ? (
                        <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">All Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Partial</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
