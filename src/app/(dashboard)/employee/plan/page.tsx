import type { Metadata } from "next";
import { GoalCreationDashboard } from "@/features/goals/components/GoalCreationDashboard";

export const metadata: Metadata = {
  title: "Plan Goals | AtomQuest",
  description: "Plan and submit your enterprise goals for the current cycle.",
};

export default function EmployeeGoalPlanningPage() {
  return (
    <div className="py-6">
      <GoalCreationDashboard />
    </div>
  );
}
