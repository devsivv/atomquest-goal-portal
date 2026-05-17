/**
 * @file features/quarterly/hooks/useQuarterlyWorkflow.ts
 * @description React hook to fetch and manage quarterly workflow state.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { quarterlyService } from "../services/quarterly.service";
import { goalsService } from "@/features/goals/services/goals.service";
import { buildQuarterlyWorkflowState } from "@/features/scoring/utils/quarterlyWorkflow";
import type { 
  NormalizedGoal, 
  QuarterlyCheckin, 
  QuarterlyGoalUpdate,
  QuarterLabel,
  QuarterlyWorkflowState,
  UpsertCheckinPayload
} from "@/types";

export function useQuarterlyWorkflow(employeeId: string, quarter: QuarterLabel) {
  const supabase = createClient();
  const [goals, setGoals] = useState<NormalizedGoal[]>([]);
  const [checkins, setCheckins] = useState<QuarterlyCheckin[]>([]);
  const [updates, setUpdates] = useState<QuarterlyGoalUpdate[]>([]);
  
  const [workflowState, setWorkflowState] = useState<QuarterlyWorkflowState | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflowData = useCallback(async () => {
    if (!employeeId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all goals for the user to find approved ones
      const userGoals = await goalsService.getAll(supabase);
      
      // Fetch checkins and updates for the specific quarter
      const { checkins: fetchedCheckins, updates: fetchedUpdates } = 
        await quarterlyService.getEmployeeCheckins(supabase, employeeId, quarter);

      setGoals(userGoals);
      setCheckins(fetchedCheckins);
      setUpdates(fetchedUpdates);

      // Build workflow state
      const state = buildQuarterlyWorkflowState(
        employeeId, 
        quarter, 
        userGoals, 
        fetchedCheckins, 
        fetchedUpdates
      );
      setWorkflowState(state);
    } catch (err: any) {
      setError(err.message || "Failed to load quarterly data");
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, quarter, supabase]);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  const upsertCheckin = async (payload: UpsertCheckinPayload) => {
    try {
      // Optimistic update could go here, but for safety we await the server
      const updatedCheckin = await quarterlyService.upsertCheckin(supabase, payload);
      
      // Update local state
      setCheckins(prev => {
        const index = prev.findIndex(c => c.id === updatedCheckin.id || c.goal_id === updatedCheckin.goal_id);
        if (index >= 0) {
          const newArr = [...prev];
          newArr[index] = updatedCheckin;
          return newArr;
        }
        return [...prev, updatedCheckin];
      });

      // Rebuild workflow state
      setWorkflowState(prev => {
        if (!prev) return prev;
        
        // Manual shallow rebuild for quick UI update
        return buildQuarterlyWorkflowState(
          employeeId,
          quarter,
          goals,
          checkins.map(c => c.goal_id === updatedCheckin.goal_id ? updatedCheckin : c).concat(
            checkins.find(c => c.goal_id === updatedCheckin.goal_id) ? [] : [updatedCheckin]
          ),
          updates
        );
      });
      
      return updatedCheckin;
    } catch (err: any) {
      throw new Error(err.message || "Failed to save check-in");
    }
  };

  return {
    workflowState,
    isLoading,
    error,
    refetch: fetchWorkflowData,
    upsertCheckin
  };
}
