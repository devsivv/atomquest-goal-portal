import { createClient } from "@/lib/supabase/server";
import { CycleService } from "@/features/admin/services/cycle.service";
import { CyclesDashboard } from "@/features/admin/components/CyclesDashboard";
import { Suspense } from "react";

export const metadata = {
  title: "Performance Cycles | Quartiq Admin",
  description: "Manage and configure performance evaluation cycles.",
};

export default async function CyclesPage() {
  const supabase = await createClient();
  const cycles = await CycleService.getAll(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Cycles</h1>
        <p className="text-muted-foreground mt-2">
          Manage the active quarterly execution cycles and timeline configurations.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 w-full animate-pulse bg-muted rounded-xl" />}>
        <CyclesDashboard initialCycles={cycles} />
      </Suspense>
    </div>
  );
}
