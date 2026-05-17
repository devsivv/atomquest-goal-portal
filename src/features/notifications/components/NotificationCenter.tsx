"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useComputedNotifications } from "../hooks/useComputedNotifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";

interface NotificationCenterProps {
  profileId: string;
  role: string;
}

export function NotificationCenter({ profileId, role }: NotificationCenterProps) {
  const { notifications, loading, markAsRead, markAllAsRead } = useComputedNotifications(profileId, role);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white rounded-full border-2 border-background"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-primary hover:bg-transparent"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <div className="animate-pulse flex flex-col gap-4">
                <div className="h-12 bg-muted rounded-md" />
                <div className="h-12 bg-muted rounded-md" />
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new notifications.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className="flex flex-col gap-1 p-4 border-b hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                  }}
                >
                  <Link href={n.href} className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 font-medium">
                        {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "just now"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                      {n.description}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
