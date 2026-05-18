/**
 * @file features/goals/services/goals.service.ts
 * @description Goals feature — Supabase data access layer.
 * All database queries for Goals live here. No business logic in components.
 *
 * Pattern: Accept a Supabase client as a parameter so this works in both
 * Server Components (server client) and Client Components (browser client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  NormalizedGoal,
  GoalSubmissionPayload,
  GoalUpdatePayload,
  GoalDraftPayload
} from "@/types";

const TABLE = "goals";

export const goalsService = {
  /** Fetch all goals for the authenticated user */
  async getAll(
    client: SupabaseClient
  ): Promise<NormalizedGoal[]> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  },

  /**
   * Fetch ALL active goal rows for a specific employee + cycle.
   * Returns both draft anchors + submitted relational rows.
   */
  async getEmployeeGoalsForCycle(
    client: SupabaseClient,
    profileId: string,
    cycleId: string
  ): Promise<NormalizedGoal[]> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("profile_id", profileId)
      .eq("cycle_id", cycleId)
      .is("deleted_at", null)
      .in("status", [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "revision_requested",
        "rejected"
      ])
      .order("created_at", {
        ascending: true
      });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  },

  /** Fetch a single goal by ID */
  async getById(
    client: SupabaseClient,
    id: string
  ): Promise<NormalizedGoal | null> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Retrieve existing draft_content for the current employee/cycle.
   * Only active draft anchors should be reconstructed.
   */
  async getDraftGoals(
    client: SupabaseClient,
    profileId: string,
    cycleId: string
  ): Promise<GoalDraftPayload[]> {
    const { data, error } = await client
      .from(TABLE)
      .select("draft_content")
      .eq("profile_id", profileId)
      .eq("cycle_id", cycleId)
      .eq("status", "draft")
      .is("deleted_at", null)
      .not("draft_content", "is", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return (
      (data?.draft_content as GoalDraftPayload[]) ??
      []
    );
  },

  /**
   * Persist partial GoalDraftPayload[] into draft_content JSONB.
   * Uses a single anchor record for autosave.
   */
  async saveDraft(
    client: SupabaseClient,
    profileId: string,
    cycleId: string,
    goals: GoalDraftPayload[]
  ): Promise<void> {
    const {
      data: existing,
      error: lookupError
    } = await client
      .from(TABLE)
      .select("id")
      .eq("profile_id", profileId)
      .eq("cycle_id", cycleId)
      .eq("status", "draft")
      .is("deleted_at", null)
      .not("draft_content", "is", null)
      .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    const timestamp = new Date().toISOString();

    if (existing) {
      const { error } = await client
        .from(TABLE)
        .update({
          draft_content: goals,
          last_autosaved_at: timestamp,
          updated_at: timestamp
        } as GoalUpdatePayload)
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await client
        .from(TABLE)
        .insert({
          profile_id: profileId,
          cycle_id: cycleId,
          title: "Cycle Planning Draft",
          thrust_area: "General",
          weightage: 10,
          target_value: 100,
          uom_type: "numeric",
          status: "draft",
          draft_content: goals,
          last_autosaved_at: timestamp,
          created_by: profileId,
          updated_by: profileId,
          created_at: timestamp,
          updated_at: timestamp
        });

      if (error) {
        throw new Error(error.message);
      }
    }
  },

  /**
   * Final goal submission via SECURITY DEFINER RPC
   */
  async submitGoals(
    client: SupabaseClient,
    profileId: string,
    cycleId: string,
    goals: GoalSubmissionPayload[]
  ): Promise<boolean> {
    const { error } = await client.rpc(
      "employee_submit_goals",
      {
        p_profile_id: profileId,
        p_cycle_id: cycleId,
        p_goals: goals
      }
    );

    if (error) {
      console.error(
        "[goalsService.submitGoals] RPC FAILED:",
        error
      );

      throw new Error(error.message);
    }

    return true;
  },

  /**
   * Review (approve / reject / request revision) a submitted goal via SECURITY DEFINER RPC.
   * @returns The updated goal row returned by the RPC.
   */
  async reviewGoal(
    client: SupabaseClient,
    goalId: string,
    status: string,
    comment: string,
    rejectedReason: string
  ): Promise<NormalizedGoal> {
    const { data, error } = await client.rpc(
      "review_employee_goal",
      {
        p_goal_id: goalId,
        p_status: status,
        p_comment: comment,
        p_rejected_reason: rejectedReason
      }
    );

    if (error) {
      console.error(
        "[goalsService.reviewGoal] RPC FAILED:",
        error
      );

      throw new Error(error.message);
    }

    return data as NormalizedGoal;
  },

  /** Soft delete a goal */
  async softDelete(
    client: SupabaseClient,
    goalId: string
  ): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq("id", goalId);

    if (error) {
      throw new Error(error.message);
    }
  }
};