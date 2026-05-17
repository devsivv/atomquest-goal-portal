import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px] max-w-[80vw]" />
      </div>
      <Skeleton className="h-9 w-[100px] hidden sm:block" />
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent className="pt-4">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function MetricsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="border-b px-6 py-4 flex gap-4 bg-muted/30">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="flex items-center gap-4 px-6 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex justify-end pt-4 border-t">
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

export function QuarterlyDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHeaderSkeleton />
      <div className="flex gap-2 border-b pb-4">
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
        <Skeleton className="h-10 w-20 rounded-md" />
      </div>
      <MetricsGridSkeleton count={4} />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm mb-6">
          <Skeleton className="h-10 flex-1 w-full" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
        <TableSkeleton rows={4} columns={5} />
      </div>
    </div>
  );
}

export function GoalCreationSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <DashboardHeaderSkeleton />
      <Card className="shadow-sm border-muted/60">
        <CardContent className="p-6">
          <FormSkeleton />
        </CardContent>
      </Card>
      <Card className="shadow-sm border-muted/60 opacity-60">
        <CardContent className="p-6">
          <FormSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
