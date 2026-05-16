"use server";

/**
 * @file features/auth/actions/auth.actions.ts
 * @description Server Actions for authentication (Login, Register, Logout).
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "../types/auth.schema";
import { ROUTES } from "@/constants";
import { authService } from "../services/auth.service";
import { getDashboardRouteByRole } from "../utils/roles";

export async function loginAction(data: LoginInput) {
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    return { error: "Invalid form data." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Fetch profile to determine role-based redirect
  const profile = await authService.getCurrentProfile();
  const redirectRoute = profile ? getDashboardRouteByRole(profile.role) : ROUTES.HOME;

  revalidatePath("/", "layout");
  redirect(redirectRoute);
}

export async function registerAction(data: RegisterInput) {
  const result = registerSchema.safeParse(data);
  if (!result.success) {
    return { error: "Invalid form data." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.full_name,
        employee_id: result.data.employee_id,
        department: result.data.department,
        designation: result.data.designation,
        // The DB trigger fn_handle_new_user automatically assigns role = 'employee'
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Same logic as login for consistency (though a new user is always an employee)
  const profile = await authService.getCurrentProfile();
  const redirectRoute = profile ? getDashboardRouteByRole(profile.role) : ROUTES.HOME;

  revalidatePath("/", "layout");
  redirect(redirectRoute);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  revalidatePath("/", "layout");
  redirect(ROUTES.LOGIN);
}
