import { SupabaseClient } from "@supabase/supabase-js";
import { AuditLogRecord } from "@/types/audit";

export const AuditService = {
  /**
   * Get the most recent high-value audit events (UNLOCK, APPROVE, REJECT, DELETE).
   */
  async getRecentGovernanceEvents(client: SupabaseClient, limit = 50): Promise<AuditLogRecord[]> {
    const { data, error } = await client
      .from("audit_logs")
      .select(`
        id, table_name, record_id, action, old_values, new_values, created_at,
        actor:profiles!changed_by(id, full_name, role)
      `)
      .in("action", ["UNLOCK", "APPROVE", "REJECT", "DELETE", "LOCK", "SUBMIT"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    // If we want to enrich goal titles, we fetch the goals for record_ids
    const goalIds = data
      .filter((d: any) => d.table_name === "goals")
      .map((d: any) => d.record_id);

    if (goalIds.length === 0) return data as unknown as AuditLogRecord[];

    const { data: goals, error: gError } = await client
      .from("goals")
      .select(`
        id, title,
        profile:profiles!profile_id(full_name),
        cycle:goal_cycles!cycle_id(name)
      `)
      .in("id", goalIds);

    if (gError) throw new Error(gError.message);

    const goalMap = new Map(goals.map((g: any) => [g.id, {
      title: g.title,
      owner_name: g.profile?.full_name ?? "Unknown",
      cycle_name: g.cycle?.name ?? "Unknown"
    }]));

    return data.map((d: any) => {
      const enriched = { ...d };
      if (d.table_name === "goals" && goalMap.has(d.record_id)) {
        enriched.target_goal = goalMap.get(d.record_id);
      }
      return enriched;
    }) as unknown as AuditLogRecord[];
  },

  /**
   * Get all locked goals that could potentially be unlocked.
   */
  async getLockedGoals(client: SupabaseClient) {
    const { data, error } = await client
      .from("goals")
      .select(`
        id, title, is_locked, status,
        profile:profiles!profile_id(full_name, department),
        cycle:goal_cycles!cycle_id(name)
      `)
      .eq("is_locked", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },
};
