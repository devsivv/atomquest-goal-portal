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
  async getAll(client: SupabaseClient): Promise<NormalizedGoal[]> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /**
   * Fetch ALL active (non-deleted) goal rows for a specific employee + cycle.
   * Returns both the JSONB draft anchor and submitted/approved relational rows.
   * Used by GoalCreationDashboard to determine which mode to render.
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
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Fetch a single goal by ID */
  async getById(client: SupabaseClient, id: string): Promise<NormalizedGoal | null> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /** 
   * Retrieve existing draft_content for the current employee/cycle.
   * We look for the "Anchor" record that holds the JSONB array.
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
      .not("draft_content", "is", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data?.draft_content as unknown as GoalDraftPayload[]) ?? [];
  },

  /** 
   * Persist partial GoalDraftPayload[] into draft_content JSONB.
   * This implements the autosave strategy by using a single anchor record.
   */
  async saveDraft(
    client: SupabaseClient, 
    profileId: string, 
    cycleId: string, 
    goals: GoalDraftPayload[]
  ): Promise<void> {
    // Check if an anchor record already exists for this cycle
    const { data: existing } = await client
      .from(TABLE)
      .select("id")
      .eq("profile_id", profileId)
      .eq("cycle_id", cycleId)
      .not("draft_content", "is", null)
      .maybeSingle();

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

      if (error) throw new Error(error.message);
    } else {
      // Create a placeholder "Anchor" record to hold the draft list
      // Using minimal valid fields to bypass NOT NULL constraints
      const { error } = await client
        .from(TABLE)
        .insert({
          profile_id: profileId,
          cycle_id: cycleId,
          title: "Cycle Planning Draft",
          thrust_area: "General",
          weightage: 10,
          status: "draft",
          draft_content: goals,
          last_autosaved_at: timestamp,
          created_by: profileId
        });

      if (error) throw new Error(error.message);
    }
  },

  /** 
   * Update existing draft JSONB safely. 
   * Alias for saveDraft to match workflow terminology.
   */
  async updateDraft(
    client: SupabaseClient, 
    profileId: string, 
    cycleId: string, 
    goals: GoalDraftPayload[]
  ): Promise<void> {
    return this.saveDraft(client, profileId, cycleId, goals);
  },

  /**
   * Finalize employee goal submission via SECURITY DEFINER RPC.
   *
   * Delegates the soft-delete + INSERT to `employee_submit_goals` so that
   * all ownership validation and DML runs under the DB-owner role,
   * bypassing the PostgREST RLS "INSERT → SELECT" edge cases that
   * caused persistent failures with the client-side approach.
   *
   * Preserves: autosave, validation, audit logging, manager workflows,
   * soft-delete lifecycle.
   */
  async submitGoals(
    client: SupabaseClient,
    profileId: string,
    cycleId: string,
    goals: GoalSubmissionPayload[]
  ): Promise<void> {
    // Verify session exists — authentication only, no auth/profile comparison.
    // Ownership is validated inside the RPC itself.
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error("Authentication failed or missing session.");

    console.log("=== EMPLOYEE SUBMIT RPC — DIAGNOSTICS ===");
    console.log("auth.uid():", user.id);
    console.log("profileId arg:", profileId);
    console.log("cycleId arg:", cycleId);
    console.log("Goal count:", goals.length);
    console.log("Payload:", JSON.stringify(goals, null, 2));

    const { data, error } = await client.rpc("employee_submit_goals", {
      p_profile_id: profileId,
      p_cycle_id:   cycleId,
      p_goals:      goals,   // Supabase serialises this to JSONB automatically
    });

    console.log("=== EMPLOYEE SUBMIT RPC — RESPONSE ===");
    console.log({ data, error });

    if (error) throw new Error(error.message);
  },

  /** Update an existing goal (standard relational update) */
  async update(
    client: SupabaseClient,
    id: string,
    input: GoalUpdatePayload
  ): Promise<NormalizedGoal> {
    const { data, error } = await client
      .from(TABLE)
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /** Delete a goal by ID */
  async remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};
