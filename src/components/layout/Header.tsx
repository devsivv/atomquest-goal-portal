"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationCenter } from "@/features/notifications/components/NotificationCenter";

interface HeaderProps {
  profile: {
    id: string;
    full_name: string;
    role: string;
  };
}

export function Header({ profile }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Title mapping based on pathname — covers all three workspaces
  const getPageTitle = () => {
    // Admin workspace
    if (pathname.includes("/admin/analytics")) return "Analytics";
    if (pathname.includes("/admin/cycles")) return "Cycles";
    if (pathname.includes("/admin/users")) return "Users";
    if (pathname.includes("/admin/governance")) return "Governance";
    if (pathname.includes("/admin/reports")) return "Reports";
    if (pathname.includes("/admin/settings")) return "Settings";
    if (pathname === "/admin") return "Admin Dashboard";
    // Manager workspace
    if (pathname.includes("/manager/tracking")) return "Team Tracking";
    if (pathname.includes("/manager/analytics")) return "Analytics";
    if (pathname === "/manager") return "Review Dashboard";
    // Employee workspace
    if (pathname.includes("/employee/plan")) return "Goals Planning";
    if (pathname.includes("/employee/tracking")) return "Quarterly Tracking";
    if (pathname === "/employee") return "Employee Dashboard";
    return "Dashboard";
  };

  const getBreadcrumbRoot = () => {
    if (pathname.startsWith("/admin")) {
      return { label: "Admin Workspace", href: "/admin" };
    }
    if (pathname.startsWith("/manager")) {
      return { label: "Manager Workspace", href: "/manager" };
    }
    return { label: "Employee Workspace", href: "/employee" };
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center gap-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar role={profile.role} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-lg font-bold tracking-tight text-primary sm:hidden">Quartiq</span>
      </div>

      <div className="hidden lg:flex items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={getBreadcrumbRoot().href}>{getBreadcrumbRoot().label}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <NotificationCenter profileId={profile.id} role={profile.role} />
          
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{profile.role}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary sm:hidden">
            {profile.full_name.charAt(0)}
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
