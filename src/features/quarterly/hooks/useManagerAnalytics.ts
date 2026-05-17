import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { quarterlyService } from "../services/quarterly.service";
import { managerService } from "@/features/manager/services/manager.service";
import { generateManagerAnalytics, AnalyticsData } from "../utils/analytics";

export function useManagerAnalytics(managerId: string, cycleId: string) {
  const supabase = createClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAnalytics() {
      try {
        setIsLoading(true);
        // 1. Fetch all goals for team
        const groups = await managerService.getTeamSubmittedGoals(supabase, cycleId);
        
        // Flatten goals and map profiles
        const allGoals: import("@/types").NormalizedGoal[] = [];
        const profilesMap: Record<string, string> = {};
        
        groups.forEach(g => {
          profilesMap[g.profileId] = g.fullName;
          // Include approved or completed goals
          allGoals.push(...g.goals.filter(goal => goal.status === "approved" || goal.status === "completed"));
        });

        // 2. Fetch all checkins across all quarters
        const { checkins } = await quarterlyService.getAllTeamQuarterlyData(supabase, managerId);

        // 3. Generate analytics
        const analytics = generateManagerAnalytics(allGoals, checkins, profilesMap);

        if (isMounted) {
          setData(analytics);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load analytics");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAnalytics();
    return () => { isMounted = false; };
  }, [managerId, cycleId, supabase]);

  return { data, isLoading, error };
}
