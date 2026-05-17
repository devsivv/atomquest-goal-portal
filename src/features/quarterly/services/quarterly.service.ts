/**
 * @file features/quarterly/services/quarterly.service.ts
 * @description Quarterly Tracking — Supabase data access layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { 
  QuarterlyCheckin, 
  QuarterlyGoalUpdate,
  QuarterLabel,
  UpsertCheckinPayload
} from "@/types";

export const quarterlyService = {
  /** Fetch all check-ins for an employee for a specific quarter */
  async getEmployeeCheckins(
    client: SupabaseClient,
    employeeId: string,
    quarter: QuarterLabel
  ): Promise<{ checkins: QuarterlyCheckin[], updates: QuarterlyGoalUpdate[] }> {
    const { data: checkins, error: checkinsError } = await client
      .from("quarterly_checkins")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("quarter", quarter)
      .is("deleted_at", null);

    if (checkinsError) throw new Error(checkinsError.message);

    let updates: QuarterlyGoalUpdate[] = [];
    if (checkins && checkins.length > 0) {
      const checkinIds = checkins.map((c: any) => c.id);
      const { data: updateData, error: updatesError } = await client
        .from("quarterly_goal_updates")
        .select("*")
        .in("checkin_id", checkinIds)
        .is("deleted_at", null);

      if (updatesError) throw new Error(updatesError.message);
      updates = updateData || [];
    }

    return { 
      checkins: checkins || [], 
      updates 
    };
  },

  /** Fetch all check-ins and updates for an employee across ALL quarters (for history) */
  async getAllEmployeeCheckins(
    client: SupabaseClient,
    employeeId: string
  ): Promise<{ checkins: QuarterlyCheckin[], updates: QuarterlyGoalUpdate[] }> {
    const { data: checkins, error: checkinsError } = await client
      .from("quarterly_checkins")
      .select("*")
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (checkinsError) throw new Error(checkinsError.message);

    let updates: QuarterlyGoalUpdate[] = [];
    if (checkins && checkins.length > 0) {
      const checkinIds = checkins.map((c: any) => c.id);
      const { data: updateData, error: updatesError } = await client
        .from("quarterly_goal_updates")
        .select("*")
        .in("checkin_id", checkinIds)
        .is("deleted_at", null);

      if (updatesError) throw new Error(updatesError.message);
      updates = updateData || [];
    }

    return { 
      checkins: checkins || [], 
      updates 
    };
  },

  /** Upsert a quarterly check-in (draft or submit) */
  async upsertCheckin(
    client: SupabaseClient,
    payload: UpsertCheckinPayload
  ): Promise<QuarterlyCheckin> {
    const { data, error } = await client.rpc("upsert_quarterly_checkin", {
      p_goal_id: payload.p_goal_id,
      p_quarter: payload.p_quarter,
      p_progress_pct: payload.p_progress_pct,
      p_notes: payload.p_notes || null,
      p_submit: payload.p_submit || false,
    });

    if (error) throw new Error(error.message);
    return data as QuarterlyCheckin;
  },

  /** Fetch all check-ins for a manager's team */
  async getTeamQuarterlyData(
    client: SupabaseClient,
    managerId: string,
    quarter: QuarterLabel
  ): Promise<{ checkins: QuarterlyCheckin[], updates: QuarterlyGoalUpdate[] }> {
    const { data: teamProfiles, error: profilesError } = await client
      .from("profiles")
      .select("id")
      .eq("manager_id", managerId)
      .eq("is_active", true);

    if (profilesError) throw new Error(profilesError.message);
    
    const teamIds = teamProfiles?.map(p => p.id) || [];
    if (teamIds.length === 0) return { checkins: [], updates: [] };

    const { data: checkins, error: checkinsError } = await client
      .from("quarterly_checkins")
      .select("*")
      .in("employee_id", teamIds)
      .eq("quarter", quarter)
      .is("deleted_at", null);

    if (checkinsError) throw new Error(checkinsError.message);

    let updates: QuarterlyGoalUpdate[] = [];
    if (checkins && checkins.length > 0) {
      const checkinIds = checkins.map((c: any) => c.id);
      const { data: updateData, error: updatesError } = await client
        .from("quarterly_goal_updates")
        .select("*")
        .in("checkin_id", checkinIds)
        .is("deleted_at", null);

      if (updatesError) throw new Error(updatesError.message);
      updates = updateData || [];
    }

    return { 
      checkins: checkins || [], 
      updates 
    };
  },

  /** Fetch all check-ins for a manager's team across all quarters (for analytics) */
  async getAllTeamQuarterlyData(
    client: SupabaseClient,
    managerId: string
  ): Promise<{ checkins: QuarterlyCheckin[], updates: QuarterlyGoalUpdate[] }> {
    const { data: teamProfiles, error: profilesError } = await client
      .from("profiles")
      .select("id")
      .eq("manager_id", managerId)
      .eq("is_active", true);

    if (profilesError) throw new Error(profilesError.message);
    
    const teamIds = teamProfiles?.map(p => p.id) || [];
    if (teamIds.length === 0) return { checkins: [], updates: [] };

    const { data: checkins, error: checkinsError } = await client
      .from("quarterly_checkins")
      .select("*")
      .in("employee_id", teamIds)
      .is("deleted_at", null);

    if (checkinsError) throw new Error(checkinsError.message);

    let updates: QuarterlyGoalUpdate[] = [];
    if (checkins && checkins.length > 0) {
      const checkinIds = checkins.map((c: any) => c.id);
      const { data: updateData, error: updatesError } = await client
        .from("quarterly_goal_updates")
        .select("*")
        .in("checkin_id", checkinIds)
        .is("deleted_at", null);

      if (updatesError) throw new Error(updatesError.message);
      updates = updateData || [];
    }

    return { 
      checkins: checkins || [], 
      updates 
    };
  },

  /** Manager acknowledges a submitted check-in */
  async acknowledgeCheckin(
    client: SupabaseClient,
    payload: {
      p_checkin_id: string;
      p_manager_id: string;
      p_manager_score?: number | null;
      p_manager_feedback?: string | null;
    }
  ): Promise<QuarterlyCheckin> {
    const { data, error } = await client.rpc("acknowledge_quarterly_checkin", {
      p_checkin_id: payload.p_checkin_id,
      p_manager_id: payload.p_manager_id,
      p_manager_score: payload.p_manager_score || null,
      p_manager_feedback: payload.p_manager_feedback || null,
    });

    if (error) throw new Error(error.message);
    return data as QuarterlyCheckin;
  }
};
