import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "System administration and reporting.",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the admin console. Manage cycles, users, and system settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Active Goal Cycle</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">System Health</p>
          <p className="mt-1 text-2xl font-bold text-green-500">Normal</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Administrative Actions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin tools (cycle management, user roles) will render here.
        </p>
      </div>
    </div>
  );
}
