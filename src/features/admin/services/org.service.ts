import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserProfileWithManager, OrgStats } from "@/types/org";

export const OrgService = {
  /**
   * Fetch all profiles with their manager's name, ordered by name.
   * Used by admin directory table.
   */
  async getAllUsers(client: SupabaseClient): Promise<UserProfileWithManager[]> {
    const { data, error } = await client
      .from("profiles")
      .select(`
        id, full_name, employee_id, department, designation,
        avatar_url, role, manager_id, is_active, created_at, updated_at,
        manager:manager_id (
          id, full_name, role
        )
      `)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as UserProfileWithManager[];
  },

  /**
   * Fetch only active managers — used to populate the manager assignment dropdown.
   */
  async getActiveManagers(client: SupabaseClient): Promise<Pick<UserProfile, 'id' | 'full_name' | 'role'>[]> {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["manager", "admin", "hr"])
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Pick<UserProfile, 'id' | 'full_name' | 'role'>[];
  },

  /**
   * Compute dashboard KPI stats from already-fetched profiles.
   * Pure computation — no DB call.
   */
  computeOrgStats(users: UserProfile[]): OrgStats {
    return users.reduce<OrgStats>(
      (acc, u) => {
        acc.totalUsers++;
        if (u.is_active) acc.activeUsers++; else acc.inactiveUsers++;
        if (u.role === "manager") acc.managers++;
        else if (u.role === "employee") acc.employees++;
        else acc.adminsAndHr++;
        return acc;
      },
      { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, managers: 0, employees: 0, adminsAndHr: 0 }
    );
  },
};
