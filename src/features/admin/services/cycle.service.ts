import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerformanceCycle, CycleWithWindows, CycleWindow } from "@/types/cycles";

export const CycleService = {
  /**
   * Fetch all cycles, typically for an admin list
   */
  async getAll(client: SupabaseClient): Promise<PerformanceCycle[]> {
    const { data, error } = await client
      .from("goal_cycles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data as PerformanceCycle[];
  },

  /**
   * Fetch a cycle with its quarters (windows)
   */
  async getByIdWithWindows(client: SupabaseClient, id: string): Promise<CycleWithWindows | null> {
    const { data, error } = await client
      .from("goal_cycles")
      .select(`
        *,
        windows:cycle_windows(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }
    
    // Sort windows by quarter (Q1, Q2, Q3, Q4)
    data.windows.sort((a: CycleWindow, b: CycleWindow) => a.quarter.localeCompare(b.quarter));

    return data as CycleWithWindows;
  },

  /**
   * Create a new cycle along with its windows
   */
  async createCycle(
    client: SupabaseClient,
    cycleData: {
      name: string;
      start_date: string;
      end_date: string;
    },
    windowsData: Array<Omit<CycleWindow, "id" | "cycle_id">>
  ): Promise<CycleWithWindows> {
    // 1. Insert cycle
    const { data: cycle, error: cycleError } = await client
      .from("goal_cycles")
      .insert([cycleData])
      .select()
      .single();

    if (cycleError) throw new Error(cycleError.message);

    // 2. Insert windows
    const windowsWithCycleId = windowsData.map(w => ({
      ...w,
      cycle_id: cycle.id
    }));

    const { data: windows, error: windowsError } = await client
      .from("cycle_windows")
      .insert(windowsWithCycleId)
      .select();

    if (windowsError) throw new Error(windowsError.message);

    return {
      ...cycle,
      windows: windows.sort((a: CycleWindow, b: CycleWindow) => a.quarter.localeCompare(b.quarter))
    } as CycleWithWindows;
  },

  /**
   * Activating a cycle via RPC (Transaction)
   */
  async activateCycle(client: SupabaseClient, cycleId: string): Promise<void> {
    const { error } = await client.rpc("activate_performance_cycle", {
      p_cycle_id: cycleId
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Manually archive a cycle
   */
  async archiveCycle(client: SupabaseClient, cycleId: string): Promise<void> {
    const { error } = await client
      .from("goal_cycles")
      .update({ status: 'archived' })
      .eq("id", cycleId);

    if (error) throw new Error(error.message);
  }
};
