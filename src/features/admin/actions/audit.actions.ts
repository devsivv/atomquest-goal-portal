"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function unlockGoalAction(goalId: string, reason: string) {
  if (!reason || reason.trim().length < 10) {
    return { error: "Unlock reason must be at least 10 characters." };
  }

  const supabase = await createClient();

  // Call the secure RPC
  const { error } = await supabase.rpc("unlock_goal", {
    p_goal_id: goalId,
    p_reason: reason.trim(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/governance");
  return { success: true };
}
