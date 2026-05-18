import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin sub-layout — RBAC guard only.
 *
 * The parent (dashboard)/layout.tsx already wraps ALL dashboard routes in
 * <DashboardShell> (sidebar + header). This layout must NOT render another
 * shell; doing so causes duplicated sidebars and nested layout wrappers.
 *
 * Responsibility: verify the current user has admin or hr role, then pass
 * children straight through to the already-established shell above.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin" && profile.role !== "hr") {
    redirect("/employee");
  }

  // ✅ No DashboardShell here — parent layout already provides it.
  return <>{children}</>;
}
