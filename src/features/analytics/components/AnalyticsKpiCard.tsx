import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface AnalyticsKpiCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function AnalyticsKpiCard({ title, value, trend, trendLabel, icon, className }: AnalyticsKpiCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-1 hover:border-primary/30", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground bg-muted/50 p-2 rounded-full">{icon}</div>}
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {trend !== undefined && (
            <div className="flex items-center text-xs mt-1">
              <span className={cn(
                "flex items-center font-medium px-1.5 py-0.5 rounded-full bg-opacity-10",
                isPositive ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30" : 
                isNegative ? "text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30" : 
                "text-muted-foreground bg-muted"
              )}>
                {isPositive && <ArrowUpIcon className="mr-1 h-3 w-3" />}
                {isNegative && <ArrowDownIcon className="mr-1 h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
              {trendLabel && <span className="ml-2 text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
