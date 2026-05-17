import {
  LayoutDashboard,
  Target,
  LineChart,
  Users,
  BarChart,
  BarChart2,
  ClipboardCheck,
  LucideIcon,
  Settings,
  CalendarDays,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { ROUTES } from "@/constants";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
};

export const employeeNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: ROUTES.EMPLOYEE,
    icon: LayoutDashboard,
    roles: ["employee", "manager", "admin"],
  },
  {
    title: "Goals",
    href: "/employee/plan",
    icon: Target,
    roles: ["employee", "manager", "admin"],
  },
  {
    title: "Quarterly Tracking",
    href: "/employee/tracking",
    icon: LineChart,
    roles: ["employee", "manager", "admin"],
  },
];

export const managerNavigation: NavItem[] = [
  {
    title: "Review Dashboard",
    href: ROUTES.MANAGER,
    icon: ClipboardCheck,
    roles: ["manager", "admin"],
  },
  {
    title: "Team Tracking",
    href: "/manager/tracking",
    icon: Users,
    roles: ["manager", "admin"],
  },
  {
    title: "Analytics",
    href: "/manager/analytics",
    icon: BarChart,
    roles: ["manager", "admin"],
  },
];

export const adminNavigation: NavItem[] = [
  {
    title: "Cycles",
    href: "/admin/cycles",
    icon: CalendarDays,
    roles: ["admin"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart2,
    roles: ["admin"],
  },
  {
    title: "Governance",
    href: "/admin/governance",
    icon: ShieldCheck,
    roles: ["admin"],
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: FileSpreadsheet,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function getNavigationByRole(role?: string): NavItem[] {
  if (!role) return [];
  
  if (role === "admin") {
    return [...adminNavigation];
  }
  
  if (role === "manager") {
    return [...managerNavigation];
  }
  
  return employeeNavigation;
}
