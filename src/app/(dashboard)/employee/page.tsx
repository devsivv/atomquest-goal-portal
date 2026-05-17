import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NormalizedGoal } from "@/types";
import type { GoalDraftPayload } from "@/types/goals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

// Force this server component to always fetch fresh data — never serve from cache.
// This is the critical fix: without this, Next.js may cache SSR output and
// the dashboard shows stale 0-goal data even after goals are submitted.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employee Dashboard | Quartiq",
  description: "Your Quartiq goal tracking overview.",
};

export default async function EmployeeDashboardPage() {
  // Opt out of Next.js data caching entirely for this server component.
  // Required so the dashboard always reflects the latest DB state.
  noStore();

  const supabase = await createClient();
  
  // getUser() establishes the RLS context for all downstream queries.
  // Without this call, subsequent .from() queries run as anon and RLS
  // policy `goals_select_own` (profile_id = auth.uid()) returns 0 rows.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  // Fetch profile — profiles.id = auth.users.id (enforced by FK)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  // Fetch active default cycle
  const { data: activeCycle } = await supabase
    .from("goal_cycles")
    .select("id, name, start_date, end_date")
    .eq("is_default", true)
    .single();

  // ─── Fetch goals — inline query avoids service layer abstraction issues ───
  //
  // Direct query with user.id (== profile.id by FK) ensures the RLS
  // policy `profile_id = auth.uid()` resolves correctly with no intermediary.
  //
  // The RLS SELECT policy already enforces deleted_at IS NULL server-side,
  // but we add it here too for defence-in-depth and to match the index hint
  // on idx_goals_active (profile_id, cycle_id) WHERE deleted_at IS NULL.
  let rawGoals: NormalizedGoal[] = [];

  if (activeCycle) {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("profile_id", user.id)
      .eq("cycle_id", activeCycle.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[EmployeeDashboard] Goals fetch error:", error.message);
    } else {
      rawGoals = (data ?? []) as NormalizedGoal[];
    }
  }

  // ─── Resolve goalsList from raw DB rows ─────────────────────────────────
  //
  // Two possible states after the query:
  //
  // A) DRAFTING: 1 anchor row exists with draft_content = GoalDraftPayload[]
  //    The anchor itself is a placeholder (title="Cycle Planning Draft").
  //    Actual goal items live inside the JSONB array. We expand them.
  //
  // B) SUBMITTED / APPROVED / etc: 2+ real goal rows with draft_content = NULL
  //    rawGoals IS the goalsList directly.
  //
  // Note: after employee_submit_goals RPC, the anchor IS soft-deleted and 2
  // new submitted rows are inserted — so state B is the post-submission case.

  const anchorRow = rawGoals.find((g) => g.draft_content !== null);
  let goalsList: Array<Partial<NormalizedGoal> & { id: string; title: string; status: string; weightage: number; progress: number; }> = [];

  if (anchorRow) {
    // State A — drafting: expand JSONB array into display items
    const draftItems = (anchorRow.draft_content as unknown as GoalDraftPayload[]) ?? [];
    goalsList = Array.isArray(draftItems)
      ? draftItems.map((dg, idx) => ({
          id: `draft-${idx}`,
          profile_id: user.id,
          cycle_id: activeCycle?.id ?? "",
          title: dg.title || "Untitled Draft Goal",
          description: dg.description ?? null,
          thrust_area: dg.thrust_area || "General",
          status: "draft",
          uom_type: dg.uom_type,
          target_value: dg.target_value != null ? Number(dg.target_value) : null,
          achievement_value: null,
          deadline_date: dg.deadline_date ?? null,
          weightage: dg.weightage != null ? Number(dg.weightage) : 0,
          progress: 0,
          created_at: anchorRow.created_at,
          updated_at: anchorRow.updated_at,
        }))
      : [];
  } else {
    // State B — submitted/approved/etc: use real rows directly
    goalsList = rawGoals;
  }


  // Calculate statistics
  const totalGoals = goalsList.length;
  const completedGoals = goalsList.filter(
    (g) => g.status === "completed" || g.progress === 100
  ).length;

  const inProgressGoals = goalsList.filter(
    (g) =>
      g.status !== "completed" &&
      g.status !== "rejected" &&
      g.status !== "archived"
  ).length;

  // Calculate Overdue goals
  let overdueCount = 0;
  const now = new Date();
  goalsList.forEach((g) => {
    if (g.deadline_date && g.status !== "completed") {
      const deadline = new Date(g.deadline_date);
      if (deadline < now) {
        overdueCount++;
      }
    }
  });

  // Format cycle dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: {
        label: "Draft",
        className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/30",
      },
      submitted: {
        label: "Awaiting Review",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/40 dark:border-amber-500/20",
      },
      under_review: {
        label: "Under Review",
        className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/40 dark:border-blue-500/20",
      },
      revision_requested: {
        label: "Revision Requested",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200/40 dark:border-purple-500/20",
      },
      approved: {
        label: "Approved",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-500/20",
      },
      rejected: {
        label: "Rejected",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/40 dark:border-rose-500/20",
      },
      completed: {
        label: "Completed",
        className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-500/20",
      },
    };

    const config = statusMap[status] || {
      label: status,
      className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    };
    return (
      <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full font-medium ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 animate-in fade-in duration-500">
      {/* Welcome header with premium accents */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Welcome back, {profile.full_name}
            </h1>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-sm flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground/75" />
            Active Cycle: <span className="font-semibold text-foreground/90">{activeCycle?.name || "None"}</span>
            {activeCycle && (
              <span className="text-xs text-muted-foreground/60">
                ({formatDate(activeCycle.start_date)} – {formatDate(activeCycle.end_date)})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="default" className="shadow-md font-medium gap-2">
            <Link href="/employee/plan">
              <Target className="h-4 w-4" />
              Plan Goals
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Goals */}
        <Card className="bg-card/45 backdrop-blur-md border border-border/50 hover:border-border/80 transition-all duration-300 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-300">
            <Target className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Goals</CardTitle>
            <div className="p-2 rounded-lg bg-zinc-100/50 dark:bg-zinc-800/40">
              <Layers className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{totalGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">Defined for this cycle</p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="bg-card/45 backdrop-blur-md border border-border/50 hover:border-border/80 transition-all duration-300 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-300">
            <TrendingUp className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{inProgressGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">Actively tracking progress</p>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="bg-card/45 backdrop-blur-md border border-border/50 hover:border-border/80 transition-all duration-300 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-300">
            <CheckCircle2 className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{completedGoals}</div>
            <p className="text-xs text-muted-foreground mt-1">Fully checked off & verified</p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="bg-card/45 backdrop-blur-md border border-border/50 hover:border-border/80 transition-all duration-300 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-300">
            <AlertTriangle className="h-24 w-24" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending past target date</p>
          </CardContent>
        </Card>
      </div>

      {/* Main dashboard content */}
      <Card className="bg-card/45 backdrop-blur-md border border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 pb-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Recent Goals</CardTitle>
              <CardDescription>
                Detailed overview of objectives and milestones for the active cycle.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1 bg-background/50">
              <Link href="/employee/plan">
                Manage All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {goalsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-xl border border-dashed border-border/60 bg-muted/10 animate-in fade-in duration-500">
              <div className="p-4 rounded-full bg-muted/60 mb-4">
                <Target className="h-10 w-10 text-muted-foreground/80" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No goals planned yet</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Get started on the active cycle by laying out your professional development milestones.
              </p>
              <Button asChild size="sm" className="mt-5 font-semibold gap-2 shadow-sm">
                <Link href="/employee/plan">
                  <Plus className="h-4 w-4" />
                  Define Your First Goal
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {goalsList.map((goal) => (
                <Card key={goal.id} className="bg-background/40 hover:bg-background/80 dark:hover:bg-zinc-900/40 border border-border/50 hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
                  <div className="p-5 flex flex-col h-full justify-between gap-4">
                    {/* Goal Header */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-primary/5 text-primary border border-primary/10">
                          {goal.thrust_area}
                        </Badge>
                        {getStatusBadge(goal.status)}
                      </div>
                      <h4 className="font-bold text-foreground line-clamp-2 text-base pt-1 group-hover:text-primary transition-colors duration-300">
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    {/* Goal Progress and Details */}
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-foreground">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-1.5" />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground/80">Weight:</span>
                          <span>{goal.weightage}%</span>
                        </div>
                        {goal.deadline_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>Deadline: {formatDate(goal.deadline_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
