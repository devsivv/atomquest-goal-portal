"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { managerService } from "../services/manager.service";

/**
 * Approves a single goal
 */
export async function approveGoalAction(goalId: string, comment?: string) {
  try {
    const supabase = await createClient();

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // DB Mutation
    await managerService.approveGoal(supabase, goalId, comment);

    // Invalidate caches
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/goals");
    revalidatePath("/manager");

    return { success: true };
  } catch (error: any) {
    console.error("approveGoalAction failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Rejects a single goal
 */
export async function rejectGoalAction(
  goalId: string,
  managerId: string,
  reason: string,
  comment?: string
) {
  try {
    const supabase = await createClient();

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // DB Mutation
    const updated = await managerService.rejectGoal(
      supabase,
      goalId,
      managerId,
      reason,
      comment
    );

    // Invalidate caches
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/goals");
    revalidatePath("/manager");

    return { success: true, updated };
  } catch (error: any) {
    console.error("rejectGoalAction failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Requests revisions on a goal
 */
export async function requestRevisionAction(
  goalId: string,
  managerId: string,
  reason: string,
  comment?: string
) {
  try {
    const supabase = await createClient();

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // DB Mutation
    const updated = await managerService.requestRevision(
      supabase,
      goalId,
      managerId,
      reason,
      comment
    );

    // Invalidate caches
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/goals");
    revalidatePath("/manager");

    return { success: true, updated };
  } catch (error: any) {
    console.error("requestRevisionAction failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Approves all submitted/under_review goals for an employee bulk-wise
 */
export async function approveAllGoalsAction(profileId: string, cycleId: string) {
  try {
    const supabase = await createClient();

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // DB Mutation
    await managerService.approveAllGoalsForEmployee(supabase, profileId, cycleId);

    // Invalidate caches
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/goals");
    revalidatePath("/manager");

    return { success: true };
  } catch (error: any) {
    console.error("approveAllGoalsAction failed:", error);
    return { success: false, error: error.message };
  }
}
