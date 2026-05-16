import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manager Dashboard",
  description: "Team performance and goal approval overview.",
};

export default function ManagerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here is your team&apos;s goal performance and pending approvals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Team Members</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Average Team Progress</p>
          <p className="mt-1 text-2xl font-bold">—</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Team Goals Overview</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manager specific components will render here.
        </p>
      </div>
    </div>
  );
}
