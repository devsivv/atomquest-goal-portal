"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { employeeNavigation, managerNavigation, adminNavigation } from "@/config/navigation";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Atom, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  role?: string;
  className?: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ role, className, onNavigate, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const navItems = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "Admin Workspace", items: adminNavigation },
        { label: "Manager Workspace", items: managerNavigation },
        { label: "Employee Workspace", items: employeeNavigation },
      ];
    }
    if (role === "manager") {
      return [
        { label: "Manager Workspace", items: managerNavigation },
        { label: "Employee Workspace", items: employeeNavigation },
      ];
    }
    return [{ label: "Employee Workspace", items: employeeNavigation }];
  }, [role]);

  return (
    <div className={cn("flex h-full flex-col bg-muted/40 dark:bg-transparent", className)}>
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b px-4 transition-all duration-300",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary transition-colors hover:text-primary/80 overflow-hidden whitespace-nowrap">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Atom className="h-5 w-5" />
            </div>
            <span className="text-xl">Quartiq</span>
          </Link>
        )}
        
        {onToggle && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 overflow-x-hidden">
        <nav className={cn("grid gap-8", isCollapsed ? "px-0" : "px-4")}>
          {navItems.map((group, index) => (
            <div key={index} className="flex flex-col gap-2">
              {!isCollapsed && (
                <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 whitespace-nowrap overflow-hidden">
                  {group.label}
                </h4>
              )}
              {isCollapsed && <div className="h-4" />} {/* Spacer for collapsed mode */}
              <div className="grid gap-1.5">
                {group.items.map((item, i) => {
                  const isBasePath = item.href === "/employee" || item.href === "/manager";
                  const isActive = isBasePath 
                    ? pathname === item.href 
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  const LinkContent = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center rounded-md transition-all group",
                        isCollapsed ? "justify-center px-0 mx-auto w-10 h-10" : "px-3 py-2 gap-3",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium"
                      )}
                    >
                      <item.icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-all", 
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      {!isCollapsed && <span className="text-[13px] whitespace-nowrap">{item.title}</span>}
                    </Link>
                  );

                  return isCollapsed ? (
                    <Tooltip key={i} delayDuration={0}>
                      <TooltipTrigger asChild>
                        {LinkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-4 border bg-popover px-3 py-1.5 text-sm font-medium shadow-md text-popover-foreground">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={i}>{LinkContent}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
