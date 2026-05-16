import { redirect } from "next/navigation";
import { authService } from "@/features/auth/services/auth.service";
import { getDashboardRouteByRole } from "@/features/auth/utils/roles";

export default async function DashboardIndexPage() {
  const profile = await authService.getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const route = getDashboardRouteByRole(profile.role);
  redirect(route);
}
