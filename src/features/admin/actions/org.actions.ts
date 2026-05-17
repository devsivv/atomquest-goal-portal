"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/org";

async function assertAdminOrHr() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "hr"].includes(profile.role)) {
    throw new Error("Only Admin or HR can perform this action.");
  }
  return { supabase, callerId: user.id };
}

// ─── Assign Role ─────────────────────────────────────────────────────────────
export async function assignRoleAction(targetUserId: string, newRole: UserRole) {
  try {
    const { supabase } = await assertAdminOrHr();
    const { error } = await supabase.rpc("assign_user_role", {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Toggle Active ────────────────────────────────────────────────────────────
export async function toggleUserActiveAction(targetUserId: string, isActive: boolean) {
  try {
    const { supabase } = await assertAdminOrHr();
    const { error } = await supabase.rpc("toggle_user_active", {
      p_target_user_id: targetUserId,
      p_is_active: isActive,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Assign Manager ───────────────────────────────────────────────────────────
export async function assignManagerAction(targetUserId: string, managerId: string | null) {
  try {
    const { supabase } = await assertAdminOrHr();
    const { error } = await supabase.rpc("assign_manager", {
      p_target_user_id: targetUserId,
      p_manager_id: managerId,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
