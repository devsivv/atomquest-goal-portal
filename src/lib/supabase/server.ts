/**
 * @file supabase/server.ts
 * @description Server-side Supabase client.
 * Use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes auth cookies via next/headers — never call from the browser.
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/server"
 *   const supabase = await createClient()
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Middleware handles cookie refresh instead.
          }
        },
      },
    }
  );
}
