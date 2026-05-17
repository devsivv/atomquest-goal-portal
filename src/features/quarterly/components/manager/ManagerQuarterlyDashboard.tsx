"use client";

import { useState, useMemo } from "react";
import { useManagerQuarterlyWorkflow } from "../../hooks/useManagerQuarterlyWorkflow";
import { QuarterTabs } from "../QuarterTabs";
import { TeamCheckinTable } from "./TeamCheckinTable";
import { ManagerFeedbackModal } from "./ManagerFeedbackModal";
import { TeamCompletionCard } from "./TeamCompletionCard";
import { QuarterLabel, NormalizedGoal, QuarterlyCheckin, QuarterlyGoalUpdate } from "@/types";
import { showToast } from "@/lib/toast";
import { Loader2, AlertCircle, ChevronDown, ChevronRight, Filter as FilterIcon, Users, SearchX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { determineGoalHealth } from "../../utils/health";
import { ManagerAnalyticsSection } from "./analytics/ManagerAnalyticsSection";

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

interface ManagerQuarterlyDashboardProps {
  managerId: string;
  cycleId: string;
}

export function ManagerQuarterlyDashboard({ managerId, cycleId }: ManagerQuarterlyDashboardProps) {
  const [activeQuarter, setActiveQuarter] = useState<QuarterLabel>("Q1");
  const { teamStates, isLoading, error, acknowledgeCheckin } = useManagerQuarterlyWorkflow(managerId, cycleId, activeQuarter);
  
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<NormalizedGoal | null>(null);
  const [selectedCheckin, setSelectedCheckin] = useState<QuarterlyCheckin | null>(null);
  const [selectedUpdate, setSelectedUpdate] = useState<QuarterlyGoalUpdate | null>(null);

  const toggleProfile = (profileId: string) => {
    setExpandedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleReviewClick = (goal: NormalizedGoal, checkin: QuarterlyCheckin, update: QuarterlyGoalUpdate | null) => {
    setSelectedGoal(goal);
    setSelectedCheckin(checkin);
    setSelectedUpdate(update);
    setModalOpen(true);
  };

  const handleAcknowledge = async (checkinId: string, feedback: string) => {
    setIsSubmitting(true);
    try {
      await acknowledgeCheckin(checkinId, null, feedback || null);
      showToast.success({ title: "Check-in acknowledged successfully" });
      setModalOpen(false);
    } catch (err: any) {
      showToast.error({ title: err.message || "Failed to acknowledge check-in" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Search & Filter Logic ────────────────────────────────────────────────
  const filteredTeamStates = useMemo(() => {
    let result = teamStates;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(member => 
        member.fullName.toLowerCase().includes(q) ||
        member.goals.some(g => g.title.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(member => {
        if (statusFilter === "pending_review") return member.submittedCount > 0;
        if (statusFilter === "acknowledged") return member.acknowledgedCount > 0;
        return true;
      });
    }

    return result;
  }, [teamStates, debouncedQuery, statusFilter]);

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

  // Aggregate stats
  let totalTeamGoals = 0;
  let totalAwaitingReview = 0;
  let totalAcknowledged = 0;
  let totalDrafts = 0;
  let totalStalled = 0;
  let totalAtRisk = 0;

  teamStates.forEach(member => {
    totalTeamGoals += member.totalGoals;
    totalAwaitingReview += member.submittedCount;
    totalAcknowledged += member.acknowledgedCount;
    totalDrafts += member.draftCount;
    
    member.goals.forEach(goal => {
      const checkin = member.checkins.find(c => c.goal_id === goal.id);
      const health = determineGoalHealth(goal, checkin);
      if (health === "stalled") totalStalled++;
      if (health === "at_risk") totalAtRisk++;
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Team Quarterly Review</h2>
        <p className="text-muted-foreground">
          Review and acknowledge your team's quarterly progress check-ins.
        </p>
      </div>

      {/* Executive Analytics Section */}
      <ManagerAnalyticsSection managerId={managerId} cycleId={cycleId} />

      <QuarterTabs 
        activeQuarter={activeQuarter} 
        onQuarterChange={setActiveQuarter} 
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <TeamCompletionCard 
          title="Team Goals" 
          value={totalTeamGoals} 
          subtext="Total goals" 
        />
        <TeamCompletionCard 
          title="Awaiting Review" 
          value={totalAwaitingReview} 
          subtext="Pending approval" 
        />
        <TeamCompletionCard 
          title="Acknowledged" 
          value={totalAcknowledged} 
          subtext="Reviewed check-ins" 
        />
        <TeamCompletionCard 
          title="Drafts / Pending" 
          value={totalTeamGoals - totalAwaitingReview - totalAcknowledged} 
          subtext="Not submitted" 
        />
        <TeamCompletionCard 
          title="Stalled" 
          value={totalStalled} 
          subtext="Zero progress / overdue" 
        />
        <TeamCompletionCard 
          title="At Risk" 
          value={totalAtRisk} 
          subtext="Progress lagging" 
        />
      </div>

      {/* Search and Filters */}
      {teamStates.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
          <div className="w-full sm:max-w-md">
            <SearchInput
              placeholder="Search by employee or goal title..."
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
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold border-b pb-2">Team Submissions</h3>
        
        {teamStates.length === 0 ? (
          <div className="py-16 px-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Submissions Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No team members have active tracking data for the selected quarter.
            </p>
          </div>
        ) : filteredTeamStates.length === 0 ? (
          <div className="py-16 px-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <SearchX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Try adjusting your search query or status filter to find team members.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTeamStates.map((member) => {
              const isExpanded = expandedProfiles.has(member.profileId);
              const initials = member.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              
              let memberStalled = 0;
              let memberAtRisk = 0;
              member.goals.forEach(goal => {
                const checkin = member.checkins.find(c => c.goal_id === goal.id);
                const health = determineGoalHealth(goal, checkin);
                if (health === "stalled") memberStalled++;
                if (health === "at_risk") memberAtRisk++;
              });
              
              return (
                <div key={member.profileId} className="border rounded-lg bg-card shadow-sm overflow-hidden">
                  {/* Header Row */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleProfile(member.profileId)}
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">{member.fullName}</h4>
                        <p className="text-sm text-muted-foreground">{member.designation}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-muted-foreground">Status</span>
                        <div className="flex gap-2 mt-1">
                          {memberStalled > 0 && (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                              {memberStalled} stalled
                            </Badge>
                          )}
                          {memberAtRisk > 0 && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-400">
                              {memberAtRisk} at risk
                            </Badge>
                          )}
                          {member.submittedCount > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {member.submittedCount} to review
                            </Badge>
                          )}
                          {member.acknowledgedCount > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              {member.acknowledgedCount} done
                            </Badge>
                          )}
                          {member.submittedCount === 0 && member.acknowledgedCount === 0 && (
                            <span className="text-muted-foreground italic">No submissions</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t bg-muted/10">
                      <div className="mt-4">
                        <TeamCheckinTable 
                          goals={member.goals}
                          checkins={member.checkins}
                          updates={member.updates}
                          onReviewClick={handleReviewClick}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ManagerFeedbackModal 
        goal={selectedGoal}
        checkin={selectedCheckin}
        update={selectedUpdate}
        isOpen={modalOpen}
        isPending={isSubmitting}
        onClose={() => setModalOpen(false)}
        onConfirm={handleAcknowledge}
      />
    </div>
  );
}
