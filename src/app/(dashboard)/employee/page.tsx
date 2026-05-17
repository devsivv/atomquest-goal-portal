import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { goalsService } from "@/features/goals/services/goals.service";
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

export const metadata: Metadata = {
  title: "Employee Dashboard | Quartiq",
  description: "Your Quartiq goal tracking overview.",
};

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  
  // Call getUser() to verify session and set Authorization header for subsequent RLS queries
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[EmployeeDashboard] Auth error or no user found:", authError);
    redirect("/login");
  }

  console.log("[EmployeeDashboard] Logged in user ID:", user.id);

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("[EmployeeDashboard] Profile fetch error:", profileError);
    redirect("/login");
  }

  console.log("[EmployeeDashboard] Profile name:", profile.full_name);

  // Fetch active default cycle
  const { data: activeCycle, error: cycleError } = await supabase
    .from("goal_cycles")
    .select("id, name, start_date, end_date")
    .eq("is_default", true)
    .single();

  if (cycleError) {
    console.error("[EmployeeDashboard] Active cycle fetch error:", cycleError);
  }

  console.log("[EmployeeDashboard] Active cycle:", activeCycle);

  // Fetch goals for active cycle
  const rawGoals = activeCycle
    ? await goalsService.getEmployeeGoalsForCycle(supabase, profile.id, activeCycle.id)
    : [];

  console.log(`[EmployeeDashboard] Scoped raw goals fetched: ${rawGoals.length}`);

  // Parse draft goals if currently in drafting phase (JSONB anchor has draft_content)
  const hasDraft = rawGoals.some((g) => g.draft_content !== null);
  let goalsList = rawGoals;

  if (hasDraft) {
    const anchor = rawGoals.find((g) => g.draft_content !== null);
    const draftPayloads = (anchor?.draft_content as any) ?? [];
    console.log(`[EmployeeDashboard] Anchor draft found with ${draftPayloads.length} items`);
    goalsList = draftPayloads.map((dg: any, idx: number) => ({
      id: `draft-${idx}`,
      profile_id: profile.id,
      cycle_id: activeCycle?.id || "",
      title: dg.title || "Untitled Draft Goal",
      description: dg.description ?? null,
      thrust_area: dg.thrust_area || "General",
      status: "draft",
      uom_type: dg.uom_type || "numeric_max",
      target_value: dg.target_value ? Number(dg.target_value) : null,
      achievement_value: null,
      deadline_date: dg.deadline_date ?? null,
      weightage: dg.weightage ? Number(dg.weightage) : 0,
      progress: 0,
      created_at: anchor?.created_at || new Date().toISOString(),
      updated_at: anchor?.updated_at || new Date().toISOString(),
    }));
  }

  console.log(`[EmployeeDashboard] Final parsed goals count: ${goalsList.length}`);

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
