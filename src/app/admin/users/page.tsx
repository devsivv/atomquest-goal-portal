import { createClient } from "@/lib/supabase/server";
import { OrgService } from "@/features/admin/services/org.service";
import { UserManagementDashboard } from "@/features/admin/components/UserManagementDashboard";

export const metadata = {
  title: "User Management | Quartiq Admin",
  description: "Manage employees, roles, and reporting hierarchy.",
};

export default async function UsersPage() {
  const supabase = await createClient();
  const [users, managers] = await Promise.all([
    OrgService.getAllUsers(supabase),
    OrgService.getActiveManagers(supabase),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage employee roles, reporting structure, and account status.
        </p>
      </div>
      <UserManagementDashboard initialUsers={users} availableManagers={managers} />
    </div>
  );
}
