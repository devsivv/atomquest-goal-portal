"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  profile: {
    id: string;
    full_name: string;
    role: string;
  };
}

export function DashboardShell({ children, profile }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  return (
    <div className="flex min-h-screen bg-muted/20 dark:bg-background overflow-hidden">
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out border-r bg-muted/40 dark:bg-muted/10",
          mounted && isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        <Sidebar 
          role={profile.role} 
          isCollapsed={mounted ? isCollapsed : false} 
          onToggle={toggleSidebar} 
        />
      </aside>

      <div 
        className={cn(
          "flex flex-1 flex-col min-h-screen transition-all duration-300 ease-in-out",
          mounted && isCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        )}
      >
        <Header profile={profile} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
