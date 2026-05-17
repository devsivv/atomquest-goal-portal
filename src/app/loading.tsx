/**
 * @file app/loading.tsx
 * @description Global loading UI — shown during page transitions and suspense.
 * Replace with a skeleton UI that matches your layout for better UX.
 */

import { QuarterlyDashboardSkeleton } from "@/components/ui/dashboard-skeletons";

export default function GlobalLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <QuarterlyDashboardSkeleton />
      </div>
    </div>
  );
}
