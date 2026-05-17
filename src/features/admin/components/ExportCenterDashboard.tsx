"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Users, BarChart3, Target, CheckCircle2 } from "lucide-react";
import type { ExportReportType, ExportFormat } from "@/features/admin/services/export.service";
import { toast } from "sonner";

interface ReportConfig {
  id: ExportReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: "submissions",
    title: "Employee Goal Submissions",
    description: "Full directory of employees, goal counts, and current approval statuses.",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10"
  },
  {
    id: "checkins",
    title: "Quarterly Check-ins",
    description: "Detailed progress percentage and status for every active goal across all quarters.",
    icon: Target,
    color: "text-emerald-500 bg-emerald-500/10"
  },
  {
    id: "departments",
    title: "Department Velocity",
    description: "Aggregated Q1-Q4 progression metrics grouped by organizational departments.",
    icon: BarChart3,
    color: "text-purple-500 bg-purple-500/10"
  },
  {
    id: "managers",
    title: "Manager Effectiveness",
    description: "Review turnaround times, team sizes, and approval/rejection rates per manager.",
    icon: CheckCircle2,
    color: "text-amber-500 bg-amber-500/10"
  }
];

export function ExportCenterDashboard({ activeCycleName }: { activeCycleName: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleExport = async (type: ExportReportType, format: ExportFormat) => {
    setDownloading(type);
    try {
      const url = `/api/admin/export?type=${type}&format=${format}`;
      
      // Use hidden iframe or a tag to trigger native download without leaving page
      const a = document.createElement("a");
      a.href = url;
      a.download = `quartiq_report_${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Successfully started ${format.toUpperCase()} download for ${type} report.`);
    } catch (error) {
      toast.error("Failed to generate report.");
    } finally {
      // Small timeout to let the UI reflect downloading state briefly
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        {REPORTS.map((report) => (
          <Card key={report.id} className="shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
            <CardHeader className="flex flex-row items-start gap-4 pb-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${report.color}`}>
                <report.icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="mt-1.5">{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="bg-muted/30 border-t p-4 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={downloading === report.id}
                onClick={() => handleExport(report.id, "csv")}
              >
                {downloading === report.id ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export CSV
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={downloading === report.id}
                onClick={() => handleExport(report.id, "xlsx")}
              >
                {downloading === report.id ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                Export Excel
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="bg-muted/50 rounded-lg p-6 border text-sm text-muted-foreground flex items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 text-muted-foreground/70" />
        <p>
          All reports are currently generating data scoped to the active cycle: 
          <strong className="text-foreground ml-1">{activeCycleName}</strong>. 
          Historical cycle reporting is available by changing the active cycle in Settings.
        </p>
      </div>
    </div>
  );
}
