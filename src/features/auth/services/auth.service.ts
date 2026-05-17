/**
 * @file features/auth/services/auth.service.ts
 * @description Server-side service to fetch the current authenticated user and profile.
 * Use this in Server Components and Layouts.
 */

import { createClient } from "@/lib/supabase/server";

export const authService = {
  /** Gets the current Supabase Auth User object */
  async getCurrentUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Ensure email verification is confirmed before returning user
    if (!user.email_confirmed_at) {
      return null;
    }
    
    return user;
  },

  /** Gets the application Profile record for the logged-in user */
  async getCurrentProfile() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    
    // We can use generic any for now, or Database type if generated
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[getCurrentProfile] Error:", error.message);
      return null;
    }

    return data;
  }
};
