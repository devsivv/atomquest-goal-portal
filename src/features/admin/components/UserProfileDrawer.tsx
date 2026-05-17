"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { UserProfileWithManager, UserRole } from "@/types/org";
import {
  assignRoleAction,
  toggleUserActiveAction,
  assignManagerAction,
} from "../actions/org.actions";
import { toast } from "sonner";
import {
  User,
  Building2,
  Briefcase,
  Shield,
  Network,
  PowerOff,
  Power,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  hr: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  manager: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  employee: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

interface Props {
  user: UserProfileWithManager | null;
  availableManagers: { id: string; full_name: string; role: UserRole }[];
  onClose: () => void;
  onUserUpdated: (updated: Partial<UserProfileWithManager> & { id: string }) => void;
}

export function UserProfileDrawer({ user, availableManagers, onClose, onUserUpdated }: Props) {
  const [loadingRole, setLoadingRole] = useState(false);
  const [loadingManager, setLoadingManager] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  if (!user) return null;

  async function handleRoleChange(newRole: UserRole) {
    if (!user || newRole === user.role) return;
    setLoadingRole(true);
    const result = await assignRoleAction(user.id, newRole);
    setLoadingRole(false);
    if (result.success) {
      toast.success(`Role updated to "${newRole}"`);
      onUserUpdated({ id: user.id, role: newRole });
    } else {
      toast.error(result.error ?? "Failed to update role");
    }
  }

  async function handleManagerChange(managerId: string) {
    if (!user) return;
    const normalized = managerId === "__none__" ? null : managerId;
    setLoadingManager(true);
    const result = await assignManagerAction(user.id, normalized);
    setLoadingManager(false);
    if (result.success) {
      toast.success("Manager updated");
      onUserUpdated({ id: user.id, manager_id: normalized });
    } else {
      toast.error(result.error ?? "Failed to update manager");
    }
  }

  async function handleToggleStatus() {
    if (!user) return;
    const next = !user.is_active;
    setLoadingStatus(true);
    const result = await toggleUserActiveAction(user.id, next);
    setLoadingStatus(false);
    if (result.success) {
      toast.success(next ? "User activated" : "User deactivated");
      onUserUpdated({ id: user.id, is_active: next });
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
  }

  return (
    <Sheet open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-y-auto">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <SheetTitle className="text-lg leading-tight">{user.full_name}</SheetTitle>
              <SheetDescription className="mt-0.5">
                {user.employee_id ?? "No employee ID"}
              </SheetDescription>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className={`capitalize text-xs ${ROLE_COLORS[user.role]}`}>
                  {user.role}
                </Badge>
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  user.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 p-6 space-y-6">
          {/* Profile Info */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Profile Details
            </h4>
            <div className="rounded-lg border bg-muted/20 divide-y divide-border overflow-hidden">
              {[
                { icon: Building2, label: "Department", value: user.department },
                { icon: Briefcase, label: "Designation", value: user.designation },
                { icon: Network, label: "Reports To", value: user.manager?.full_name },
                { icon: CalendarDays, label: "Member Since", value: user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : null },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                  <span className="font-medium truncate">{value ?? <span className="italic text-muted-foreground/60">Not set</span>}</span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Role Assignment */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assign Role
              </h4>
            </div>
            <Select
              value={user.role}
              onValueChange={(v) => handleRoleChange(v as UserRole)}
              disabled={loadingRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing the role takes effect immediately and affects what dashboards the user can access.
            </p>
          </section>

          <Separator />

          {/* Manager Assignment */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reporting Manager
              </h4>
            </div>
            <Select
              value={user.manager_id ?? "__none__"}
              onValueChange={handleManagerChange}
              disabled={loadingManager}
            >
              <SelectTrigger>
                <SelectValue placeholder="No manager assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="italic text-muted-foreground">No manager</span>
                </SelectItem>
                {availableManagers
                  .filter((m) => m.id !== user.id)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <span>{m.full_name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize py-0 px-1.5 h-4">
                          {m.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </section>

          <Separator />

          {/* Account Status */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Status
            </h4>
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {user.is_active ? "Account is Active" : "Account is Deactivated"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user.is_active
                    ? "User can log in and access all assigned features."
                    : "User cannot log in. Data is preserved."}
                </p>
              </div>
              <Button
                variant={user.is_active ? "destructive" : "outline"}
                size="sm"
                onClick={handleToggleStatus}
                disabled={loadingStatus}
                className="gap-1.5 shrink-0"
              >
                {user.is_active ? (
                  <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                ) : (
                  <><Power className="h-3.5 w-3.5" /> Activate</>
                )}
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
