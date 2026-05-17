"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { goalsService } from "../services/goals.service";
import type { GoalDraftPayload, GoalSubmissionPayload } from "@/types";

/**
 * Saves or updates an employee's goal draft.
 *
 * NOTE:
 * No revalidatePath here — autosave is client-driven and the
 * dashboard uses force-dynamic, so cache invalidation on every
 * autosave keystroke is unnecessary overhead.
 */
export async function saveGoalDraftAction(
  profileId: string,
  cycleId: string,
  goals: GoalDraftPayload[]
) {
  try {
    const supabase = await createClient();

    // Auth Check
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("[saveGoalDraftAction] Saving draft:", {
      profileId,
      cycleId,
      goalsCount: goals.length
    });

    await goalsService.saveDraft(
      supabase,
      profileId,
      cycleId,
      goals
    );

    console.log("[saveGoalDraftAction] Draft saved successfully");

    return {
      success: true
    };
  } catch (error: any) {
    console.error(
      "[saveGoalDraftAction] FAILED:",
      error
    );

    return {
      success: false,
      error: error.message
    };
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
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // FORENSIC LOGGING
    console.log("[submitGoalsAction] Submitting goals payload:", {
      profileId,
      cycleId,
      goalsCount: goals.length,
      goals
    });

    // Perform DB Mutation (RPC-backed)
    await goalsService.submitGoals(
      supabase,
      profileId,
      cycleId,
      goals
    );

    console.log(
      "[submitGoalsAction] RPC completed successfully"
    );

    // Revalidate related routes
    revalidatePath("/employee");
    revalidatePath("/employee/plan");
    revalidatePath("/employee/tracking");
    revalidatePath("/goals");
    revalidatePath("/manager");

    console.log(
      "[submitGoalsAction] Revalidation completed"
    );

    return {
      success: true
    };
  } catch (error: any) {
    console.error(
      "[submitGoalsAction] FAILED:",
      error
    );

    return {
      success: false,
      error: error.message
    };
  }
}