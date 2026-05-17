import { SupabaseClient } from "@supabase/supabase-js";
import { AdminAnalyticsService } from "@/features/admin/services/analytics.service";
import * as XLSX from "xlsx";

export type ExportReportType = "submissions" | "checkins" | "managers" | "departments";
export type ExportFormat = "csv" | "xlsx";

export const ExportService = {
  /**
   * Generates the raw data array for a specific report type.
   */
  async generateReportData(
    client: SupabaseClient,
    cycleId: string,
    reportType: ExportReportType
  ): Promise<any[]> {
    switch (reportType) {
      case "submissions": {
        const rows = await AdminAnalyticsService.getEmployeeSubmissionStatus(client, cycleId);
        return rows.map(r => ({
          "Employee ID": r.employeeId || "N/A",
          "Full Name": r.fullName,
          "Department": r.department || "N/A",
          "Manager": r.managerName || "N/A",
          "Total Goals": r.totalGoals,
          "Submitted": r.submittedCount,
          "Approved": r.approvedCount,
          "Pending Review": r.pendingCount,
          "Has Submitted Anything": r.hasSubmitted ? "Yes" : "No"
        }));
      }
      
      case "checkins": {
        // We will fetch for all quarters to make a comprehensive export
        const quarters: ("Q1" | "Q2" | "Q3" | "Q4")[] = ["Q1", "Q2", "Q3", "Q4"];
        const allCheckins = await Promise.all(
          quarters.map(q => AdminAnalyticsService.getCheckinCompletion(client, q))
        );
        return allCheckins.flat().map(c => ({
          "Employee Name": c.fullName,
          "Department": c.department || "N/A",
          "Quarter": c.quarter,
          "Status": c.checkinStatus,
          "Progress %": c.progressPct ?? "N/A",
          "Acknowledged By": c.acknowledgedBy || "Pending",
          "Last Updated": c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "N/A"
        }));
      }

      case "managers": {
        const rows = await AdminAnalyticsService.getManagerEffectiveness(client, cycleId);
        return rows.map(m => ({
          "Manager Name": m.managerName,
          "Team Size": m.teamSize,
          "Pending Reviews": m.pendingReviews,
          "Avg Days to Review": m.avgReviewDays,
          "Goals Approved": m.approvedCount,
          "Goals Rejected": m.rejectedCount,
          "Check-in Ack Rate %": m.ackRate
        }));
      }

      case "departments": {
        const rows = await AdminAnalyticsService.getDepartmentHeatmap(client, cycleId);
        return rows.map(d => ({
          "Department": d.department,
          "Total Employees": d.totalEmployees,
          "Submitted Goals": d.submittedGoals,
          "Approved Goals": d.approvedGoals,
          "Q1 Progress %": d.q1Progress,
          "Q2 Progress %": d.q2Progress,
          "Q3 Progress %": d.q3Progress,
          "Q4 Progress %": d.q4Progress,
          "Overall Avg Progress %": d.avgProgress
        }));
      }

      default:
        return [];
    }
  },

  /**
   * Converts data array to a Buffer in the requested format
   */
  createBuffer(data: any[], format: ExportFormat): Buffer {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    if (format === "csv") {
      const csvStr = XLSX.utils.sheet_to_csv(worksheet);
      return Buffer.from(csvStr, 'utf-8');
    } else {
      const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return excelBuffer;
    }
  }
};
