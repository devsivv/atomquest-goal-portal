/**
 * @file features/quarterly/hooks/useManagerQuarterlyWorkflow.ts
 * @description Hook to fetch and manage quarterly workflow state for a manager's team.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { quarterlyService } from "../services/quarterly.service";
import { managerService } from "@/features/manager/services/manager.service";
import { 
  QuarterlyCheckin, 
  QuarterlyGoalUpdate,
  QuarterLabel,
} from "@/types";
import { TeamMemberGoalGroup } from "@/features/manager/types/manager.types";

export interface TeamMemberQuarterlyState extends TeamMemberGoalGroup {
  checkins: QuarterlyCheckin[];
  updates: QuarterlyGoalUpdate[];
  totalGoals: number;
  submittedCount: number;
  acknowledgedCount: number;
  draftCount: number;
  notStartedCount: number;
}

export function useManagerQuarterlyWorkflow(managerId: string, cycleId: string, quarter: QuarterLabel) {
  const supabase = createClient();
  const [teamStates, setTeamStates] = useState<TeamMemberQuarterlyState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflowData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch team submitted goals (use managerService, it already maps by profile)
      const groups = await managerService.getTeamSubmittedGoals(supabase, cycleId);
      
      // 2. Fetch quarterly data for the entire team
      const { checkins, updates } = await quarterlyService.getTeamQuarterlyData(supabase, managerId, quarter);
      
      // 3. Map checkins and updates to each team member
      const enrichedGroups: TeamMemberQuarterlyState[] = groups.map(group => {
        // Only include approved/completed goals for tracking
        const approvedGoals = group.goals.filter(g => g.status === "approved" || g.status === "completed");
        const memberCheckins = checkins.filter(c => c.employee_id === group.profileId);
        const memberUpdates = updates.filter(u => u.employee_id === group.profileId);
        
        let submittedCount = 0;
        let acknowledgedCount = 0;
        let draftCount = 0;
        let notStartedCount = 0;

        approvedGoals.forEach(goal => {
          const c = memberCheckins.find(c => c.goal_id === goal.id);
          if (!c) notStartedCount++;
          else if (c.checkin_status === "draft") draftCount++;
          else if (c.checkin_status === "submitted") submittedCount++;
          else if (c.checkin_status === "acknowledged") acknowledgedCount++;
        });

        return {
          ...group,
          goals: approvedGoals, // overwrite with only approved goals
          checkins: memberCheckins,
          updates: memberUpdates,
          totalGoals: approvedGoals.length,
          submittedCount,
          acknowledgedCount,
          draftCount,
          notStartedCount
        };
      });

      setTeamStates(enrichedGroups);
    } catch (err: any) {
      setError(err.message || "Failed to load manager tracking data");
    } finally {
      setIsLoading(false);
    }
  }, [managerId, cycleId, quarter, supabase]);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  const acknowledgeCheckin = async (checkinId: string, score: number | null, feedback: string | null) => {
    try {
      const updatedCheckin = await quarterlyService.acknowledgeCheckin(supabase, {
        p_checkin_id: checkinId,
        p_manager_id: managerId,
        p_manager_score: score,
        p_manager_feedback: feedback
      });
      
      // Optimistic update
      setTeamStates(prev => prev.map(group => {
        const checkinIndex = group.checkins.findIndex(c => c.id === checkinId);
        if (checkinIndex === -1) return group;
        
        const newCheckins = [...group.checkins];
        newCheckins[checkinIndex] = updatedCheckin;
        
        // recompute counts
        let submittedCount = 0;
        let acknowledgedCount = 0;
        let draftCount = 0;
        let notStartedCount = 0;

        group.goals.forEach(goal => {
          const c = newCheckins.find(c => c.goal_id === goal.id);
          if (!c) notStartedCount++;
          else if (c.checkin_status === "draft") draftCount++;
          else if (c.checkin_status === "submitted") submittedCount++;
          else if (c.checkin_status === "acknowledged") acknowledgedCount++;
        });

        return {
          ...group,
          checkins: newCheckins,
          submittedCount,
          acknowledgedCount,
          draftCount,
          notStartedCount
        };
      }));
      
      return updatedCheckin;
    } catch (err: any) {
      throw new Error(err.message || "Failed to acknowledge check-in");
    }
  };

  return {
    teamStates,
    isLoading,
    error,
    refetch: fetchWorkflowData,
    acknowledgeCheckin
  };
}
