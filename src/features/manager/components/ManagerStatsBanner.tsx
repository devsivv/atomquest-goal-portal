"use client";

/**
 * @file features/manager/components/ManagerStatsBanner.tsx
 * @description Top-level KPI banner for the manager dashboard.
 * Shows live stats: team count, pending reviews, approved, rejected.
 * Pure presentation — receives data from the Dashboard orchestrator.
 */

import { Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { ManagerDashboardStats } from "../types/manager.types";

interface ManagerStatsBannerProps {
  stats: ManagerDashboardStats;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

function StatCard({ label, value, icon: Icon, colorClass, bgClass }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${colorClass}`}>
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgClass}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
      </div>
    </div>
  );
}

export function ManagerStatsBanner({ stats }: ManagerStatsBannerProps) {
  const statCards: StatCardProps[] = [
    {
      label: "Team Members",
      value: stats.totalTeamMembers,
      icon: Users,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
    },
    {
      label: "Pending Review",
      value: stats.pendingReviewCount,
      icon: Clock,
      colorClass: stats.pendingReviewCount > 0 ? "text-amber-600" : "text-muted-foreground",
      bgClass: stats.pendingReviewCount > 0 ? "bg-amber-100 dark:bg-amber-900/20" : "bg-muted",
    },
    {
      label: "Approved",
      value: stats.approvedCount,
      icon: CheckCircle2,
      colorClass: "text-emerald-600",
      bgClass: "bg-emerald-100 dark:bg-emerald-900/20",
    },
    {
      label: "Rejected / Revision",
      value: stats.rejectedCount,
      icon: XCircle,
      colorClass: stats.rejectedCount > 0 ? "text-red-600" : "text-muted-foreground",
      bgClass: stats.rejectedCount > 0 ? "bg-red-100 dark:bg-red-900/20" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {statCards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
