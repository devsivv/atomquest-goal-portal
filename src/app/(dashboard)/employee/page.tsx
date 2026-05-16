import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employee Dashboard",
  description: "Your AtomQuest goal tracking overview.",
};

export default function EmployeeDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s your personal goal progress overview.
        </p>
      </div>

      {/* Stats grid — DashboardStats component will go here */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          "Total Goals",
          "In Progress",
          "Completed",
          "Overdue",
        ].map((label) => (
          <div key={label} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">—</p>
          </div>
        ))}
      </div>

      {/* Recent goals — GoalsList component will go here */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recent Goals</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Goals list will render here.
        </p>
      </div>
    </div>
  );
}
