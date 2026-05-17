import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmployeeQuarterlyDashboard } from "@/features/quarterly/components/EmployeeQuarterlyDashboard";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quarterly Tracking | Quartiq",
  description: "Update and submit quarterly goal check-ins.",
};

export default async function EmployeeTrackingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <EmployeeQuarterlyDashboard employeeId={user.id} />
    </div>
  );
}
