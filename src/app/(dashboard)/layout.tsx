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
import { LogoutButton } from "@/features/auth/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await authService.getCurrentProfile();

  if (!profile) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — will be extracted to @/components/layout/Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/40 lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-bold text-primary">AtomQuest</span>
        </div>
        <nav className="flex-1 px-4 py-6">
          {/* NavItems will go here */}
          <p className="text-xs text-muted-foreground">Navigation coming soon</p>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar — will be extracted to @/components/layout/Navbar */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <p className="text-sm font-medium">Dashboard</p>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{profile.role}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
