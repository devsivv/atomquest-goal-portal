"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CycleService } from "../services/cycle.service";
import { PerformanceCycleSchema, type CycleFormValues } from "../schemas/cycle.schema";

/**
 * Creates a new performance cycle and its 4 quarters
 */
export async function createPerformanceCycleAction(data: CycleFormValues) {
  try {
    const supabase = await createClient();
    
    // Auth & RBAC Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Profile Role Check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !['admin', 'hr'].includes(profile.role)) {
      throw new Error("Only Administrators can create performance cycles");
    }

    // Validate Input
    const parsed = PerformanceCycleSchema.parse(data);

    // Call Service
    const cycle = await CycleService.createCycle(
      supabase,
      {
        name: parsed.name,
        start_date: parsed.start_date,
        end_date: parsed.end_date,
      },
      parsed.windows.map(w => ({
        quarter: w.quarter,
        start_date: w.start_date,
        end_date: w.end_date,
        submission_deadline: w.submission_deadline,
        review_deadline: w.review_deadline
      }))
    );

    revalidatePath("/admin/cycles");
    return { success: true, cycle };
  } catch (error: any) {
    console.error("Failed to create cycle:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Activates a cycle, automatically archiving any previously active cycle
 */
export async function activateCycleAction(cycleId: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    await CycleService.activateCycle(supabase, cycleId);
    
    revalidatePath("/admin/cycles");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to activate cycle:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Archives a cycle manually
 */
export async function archiveCycleAction(cycleId: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    await CycleService.archiveCycle(supabase, cycleId);
    
    revalidatePath("/admin/cycles");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to archive cycle:", error);
    return { success: false, error: error.message };
  }
}
