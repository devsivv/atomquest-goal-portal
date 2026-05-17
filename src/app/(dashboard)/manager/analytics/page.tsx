import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExecutiveSummaryPanel } from "@/features/analytics";

export const metadata: Metadata = {
  title: "Analytics | Quartiq",
  description: "Executive analytics and performance insights.",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      <ExecutiveSummaryPanel />
    </div>
  );
}
