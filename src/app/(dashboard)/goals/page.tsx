import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals",
  description: "Manage and track all your goals.",
};

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground">
            Create, manage, and track your goals.
          </p>
        </div>
        {/* CreateGoalButton will go here */}
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          + New Goal
        </button>
      </div>

      {/* GoalsList component from @/features/goals/components will go here */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Goals list will render here.
        </p>
      </div>
    </div>
  );
}
