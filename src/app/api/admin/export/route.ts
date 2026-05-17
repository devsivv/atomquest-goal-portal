import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExportService, ExportFormat, ExportReportType } from "@/features/admin/services/export.service";
import { CycleService } from "@/features/admin/services/cycle.service";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Enforce RBAC
    const { data: userData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "hr") {
      return NextResponse.json({ error: "Forbidden: Admins or HR only" }, { status: 403 });
    }

    // Parse params
    const searchParams = req.nextUrl.searchParams;
    const reportType = (searchParams.get("type") || "submissions") as ExportReportType;
    const format = (searchParams.get("format") || "csv") as ExportFormat;
    
    // Default to active cycle
    const cycles = await CycleService.getAll(supabase);
    const activeCycle = cycles.find((c) => c.status === "active") ?? cycles[0];
    
    if (!activeCycle) {
      return NextResponse.json({ error: "No active cycle found" }, { status: 400 });
    }

    // Generate data
    const data = await ExportService.generateReportData(supabase, activeCycle.id, reportType);
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No data found for this report type." }, { status: 404 });
    }

    // Convert to buffer
    const buffer = ExportService.createBuffer(data, format);

    // Setup headers
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `quartiq_${reportType}_${timestamp}.${format === "csv" ? "csv" : "xlsx"}`;
    const contentType = format === "csv" 
      ? "text/csv" 
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const response = new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });

    return response;

  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
