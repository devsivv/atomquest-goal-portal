"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { goalsService } from "../services/goals.service";
import type { GoalDraftPayload, GoalSubmissionPayload } from "@/types";

/**
 * Saves or updates an employee's goal draft
 */
export async function saveGoalDraftAction(
  profileId: string,
  cycleId: string,
  goals: GoalDraftPayload[]
) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Perform DB Mutation
    await goalsService.saveDraft(supabase, profileId, cycleId, goals);

    // Revalidate paths to clear Next.js cache
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/goals");

    return { success: true };
  } catch (error: any) {
    console.error("saveGoalDraftAction failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Finalizes employee goal submission via Security Definer RPC
 */
export async function submitGoalsAction(
  profileId: string,
  cycleId: string,
  goals: GoalSubmissionPayload[]
) {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Perform DB Mutation (RPC-backed)
    await goalsService.submitGoals(supabase, profileId, cycleId, goals);

    // Revalidate all related dashboard, planning, and review paths
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/employee/tracking");
    revalidatePath("/goals");
    revalidatePath("/manager");

    return { success: true };
  } catch (error: any) {
    console.error("submitGoalsAction failed:", error);
    return { success: false, error: error.message };
  }
}
