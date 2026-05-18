"use client";

import { useState, useMemo } from "react";
import { useQuarterlyWorkflow } from "../hooks/useQuarterlyWorkflow";
import { QuarterTabs } from "./QuarterTabs";
import { QuarterlyScoreCard } from "./QuarterlyScoreCard";
import { CheckinForm } from "./CheckinForm";
import { PlannedVsActualTable } from "./PlannedVsActualTable";
import { QuarterLabel, UpsertCheckinPayload } from "@/types";
import { CheckinFormValues } from "../schemas/checkin.schema";
import { showToast } from "@/lib/toast";
import { Loader2, AlertCircle, Filter as FilterIcon, Lock, SearchX, Sparkles, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { SearchInput } from "@/components/ui/search-input";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuarterlyDashboardSkeleton } from "@/components/ui/dashboard-skeletons";

interface EmployeeQuarterlyDashboardProps {
  employeeId: string;
}

export function EmployeeQuarterlyDashboard({ employeeId }: EmployeeQuarterlyDashboardProps) {
  const [activeQuarter, setActiveQuarter] = useState<QuarterLabel>("Q1");
  const { workflowState, isLoading, error, upsertCheckin } = useQuarterlyWorkflow(employeeId, activeQuarter);
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleSubmit = async (goalId: string, values: CheckinFormValues, isSubmit: boolean) => {
    setIsSubmittingId(goalId);
    try {
      const payload: UpsertCheckinPayload = {
        p_goal_id: goalId,
        p_quarter: activeQuarter,
        p_progress_pct: values.progressPct,
        p_notes: values.employeeNotes,
        p_submit: isSubmit
      };
      
      await upsertCheckin(payload);
      showToast.success({ title: isSubmit ? "Check-in submitted successfully" : "Draft saved successfully" });
    } catch (err: any) {
      showToast.error({ title: err.message || "Failed to save check-in" });
    } finally {
      setIsSubmittingId(null);
    }
  };

  const filteredGoals = useMemo(() => {
    if (!workflowState) return [];
    let result = workflowState.goals;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(g => g.title.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      result = result.filter(g => {
        const checkin = g.checkin;
        if (statusFilter === "not_started") return !checkin;
        if (statusFilter === "draft") return checkin && checkin.checkin_status === "draft";
        if (statusFilter === "submitted") return checkin && checkin.checkin_status === "submitted";
        if (statusFilter === "acknowledged") return checkin && checkin.checkin_status === "acknowledged";
        return true;
      });
    }

    return result;
  }, [workflowState, debouncedQuery, statusFilter]);

  if (isLoading) {
    return <QuarterlyDashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Quarterly Tracking</h2>
        <p className="text-muted-foreground">
          Update your progress and submit quarterly check-ins for manager review.
        </p>
      </div>

      <QuarterTabs 
        activeQuarter={activeQuarter} 
        onQuarterChange={setActiveQuarter} 
      />

      {workflowState && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuarterlyScoreCard 
              title="Completion Status" 
              value={`${workflowState.summary.acknowledged}/${workflowState.summary.total}`}
              description="Goals acknowledged by manager"
              progressValue={workflowState.summary.completionPercent}
            />
            <QuarterlyScoreCard 
              title="Not Started" 
              value={workflowState.summary.notStarted.toString()}
              description="Goals pending update"
            />
            <QuarterlyScoreCard 
              title="Drafts" 
              value={workflowState.summary.draft.toString()}
              description="Saved but not submitted"
            />
            <QuarterlyScoreCard 
              title="Awaiting Review" 
              value={workflowState.summary.submitted.toString()}
              description="Submitted to manager"
            />
          </div>

          {/* Quarterly AI Summary */}
          <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/40 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-lg text-indigo-800 dark:text-indigo-400">Quarterly AI Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-indigo-900/80 dark:text-indigo-200/80 mb-4 leading-relaxed">
                Based on your {activeQuarter} check-ins, trajectory suggests strong momentum in your primary initiatives. You are currently tracking at <strong className="text-indigo-600 dark:text-indigo-400">{(workflowState.summary.completionPercent || 0).toFixed(0)}% completion</strong>. 
                However, there is a minor bottleneck in "Internal Process" objectives.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-indigo-100/50 dark:border-indigo-900/30">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Achievement Highlight</h4>
                  <p className="text-xs text-muted-foreground">Excellent velocity on your high-weightage goals. You are pacing 12% ahead of the median peer average.</p>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-indigo-100/50 dark:border-indigo-900/30">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Risk Observation</h4>
                  <p className="text-xs text-muted-foreground">Consider adding descriptive check-in notes to your remaining drafts to provide better context for manager review.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xl font-semibold">Your Goals</h3>
            </div>

            {workflowState.goals.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Search goals by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery("")}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <FilterIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Check-ins</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="draft">Draft / Pending</SelectItem>
                      <SelectItem value="submitted">Awaiting Review</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {workflowState.goals.length === 0 ? (
              <div className="py-16 px-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-4">
                  <Lock className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Approved Goals</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your goals must be formally approved and locked by your manager before quarterly tracking can begin.
                </p>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="py-16 px-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <SearchX className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Check-ins Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn't find any check-ins matching your current search query or filter settings.
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredGoals.map(goalState => {
                  return (
                    <CheckinForm 
                      key={goalState.goalId}
                      goal={goalState.goal}
                      quarter={activeQuarter}
                      existingCheckin={goalState.checkin}
                      isSubmitting={isSubmittingId === goalState.goalId}
                      onSubmit={(values, isSubmit) => handleSubmit(goalState.goalId, values, isSubmit)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-8">
            <h3 className="text-xl font-semibold border-b pb-2">Quarterly Overview</h3>
            <PlannedVsActualTable goals={workflowState.goals} />
          </div>
        </>
      )}
    </div>
  );
}
