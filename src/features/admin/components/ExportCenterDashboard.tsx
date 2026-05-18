"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Users, BarChart3, Target, CheckCircle2, FileText, ChevronDown } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
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
    id: "executive_snapshot",
    title: "Executive Analytics Snapshot",
    description: "High-level KPI overview, performance highlights, and predictive insights summary.",
    icon: FileText,
    color: "text-indigo-500 bg-indigo-500/10"
  },
  {
    id: "submissions",
    title: "Employee Performance Reports",
    description: "Full directory of employees, performance grades, and goal tracking statuses.",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10"
  },
  {
    id: "checkins",
    title: "Goal Tracking Reports",
    description: "Detailed progress percentage and status for every active goal across all quarters.",
    icon: Target,
    color: "text-emerald-500 bg-emerald-500/10"
  },
  {
    id: "departments",
    title: "Department Performance",
    description: "Aggregated progression metrics and weighted scores grouped by departments.",
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 w-full sm:w-auto hover:bg-muted/50 transition-colors"
                    disabled={downloading === report.id}
                  >
                    {downloading === report.id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Download className="h-4 w-4 text-muted-foreground" />
                    )}
                    {downloading === report.id ? "Generating..." : "Download Report"}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 animate-in slide-in-from-top-2">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground uppercase tracking-wider">Select Format</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleExport(report.id, "csv")}
                    className="flex items-center gap-2 cursor-pointer py-2"
                  >
                    <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-blue-600">CSV</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Export as CSV</span>
                      <span className="text-[10px] text-muted-foreground">Raw data for analytics</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleExport(report.id, "xlsx")}
                    className="flex items-center gap-2 cursor-pointer py-2"
                  >
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-600">XLS</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Export as Excel</span>
                      <span className="text-[10px] text-muted-foreground">Formatted spreadsheet</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleExport(report.id, "pdf" as ExportFormat)}
                    className="flex items-center gap-2 cursor-pointer py-2"
                  >
                    <div className="h-6 w-6 rounded-md bg-rose-500/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-rose-600">PDF</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Executive PDF</span>
                      <span className="text-[10px] text-muted-foreground">Print-ready summary</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
