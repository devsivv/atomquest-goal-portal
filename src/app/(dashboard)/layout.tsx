/**
 * @file app/(dashboard)/layout.tsx
 * @description Dashboard route group layout — wraps all authenticated pages.
 * Add Sidebar, Navbar, and session guard here.
 *
 * This layout is separate from (auth) — each group has its own shell.
 */

import { redirect } from "next/navigation";
import { ROUTES } from "@/constants";
import { authService } from "@/features/auth/services/auth.service";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await authService.getCurrentProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
