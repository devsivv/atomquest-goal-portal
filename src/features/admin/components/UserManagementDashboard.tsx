"use client";

import { useState, useMemo } from "react";
import { Users, UserCheck, UserX, ShieldCheck, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserProfileWithManager, OrgStats, UserRole } from "@/types/org";
import { OrgService } from "../services/org.service";
import { UserProfileDrawer } from "./UserProfileDrawer";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  hr: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  manager: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  employee: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

function KpiCard({ label, value, icon: Icon, colorClass, bgClass }: KpiCardProps) {
  return (
    <Card className="shadow-sm border-border transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${colorClass}`}>{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgClass}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  initialUsers: UserProfileWithManager[];
  availableManagers: { id: string; full_name: string; role: UserRole }[];
}

export function UserManagementDashboard({ initialUsers, availableManagers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfileWithManager | null>(null);

  const stats: OrgStats = useMemo(() => OrgService.computeOrgStats(users), [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        (u.employee_id ?? "").toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q) ||
        (u.designation ?? "").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? u.is_active : !u.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Optimistic update helper — called by the drawer after a successful action
  function handleUserUpdated(updated: Partial<UserProfileWithManager> & { id: string }) {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== updated.id) return u;
        const merged = { ...u, ...updated };
        // Resolve manager name if manager_id changed
        if (updated.manager_id !== undefined) {
          const mgr = availableManagers.find((m) => m.id === updated.manager_id);
          merged.manager = mgr ? { id: mgr.id, full_name: mgr.full_name, role: mgr.role } : null;
        }
        return merged;
      })
    );
    // Also update selectedUser panel
    setSelectedUser((prev) => (prev?.id === updated.id ? { ...prev, ...updated } as UserProfileWithManager : prev));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={stats.totalUsers} icon={Users}
          colorClass="text-primary" bgClass="bg-primary/10" />
        <KpiCard label="Active" value={stats.activeUsers} icon={UserCheck}
          colorClass="text-emerald-600 dark:text-emerald-400" bgClass="bg-emerald-500/10" />
        <KpiCard label="Inactive" value={stats.inactiveUsers} icon={UserX}
          colorClass={stats.inactiveUsers > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}
          bgClass={stats.inactiveUsers > 0 ? "bg-red-500/10" : "bg-muted"} />
        <KpiCard label="Managers & Above" value={stats.managers + stats.adminsAndHr}
          icon={ShieldCheck} colorClass="text-violet-600 dark:text-violet-400" bgClass="bg-violet-500/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, ID, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {filtered.length} of {users.length}
        </span>
      </div>

      {/* Table */}
      <Card className="shadow-sm transition-all duration-300 ease-out hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 hidden md:table-cell">Department</th>
                <th className="px-6 py-4 hidden lg:table-cell">Manager</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No users found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{user.full_name}</p>
                          {user.employee_id && (
                            <p className="text-xs text-muted-foreground mt-1">{user.employee_id}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">
                      <div>
                        <p>{user.department ?? "—"}</p>
                        {user.designation && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{user.designation}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden lg:table-cell">
                      {user.manager?.full_name ?? <span className="italic opacity-50">No manager</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`capitalize text-xs ${ROLE_COLORS[user.role]}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        user.is_active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profile Drawer */}
      <UserProfileDrawer
        user={selectedUser}
        availableManagers={availableManagers}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
