import { Skeleton } from "./skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>
      <Skeleton className="h-10 w-[120px]" />
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <Skeleton className="h-4 w-[100px] mb-4" />
      <Skeleton className="h-8 w-[60px] mb-2" />
      <Skeleton className="h-3 w-[140px]" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm h-[400px] flex flex-col gap-4">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    </div>
  );
}
