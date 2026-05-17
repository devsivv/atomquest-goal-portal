import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AppNotification = {
  id: string;
  type: "goal_approval" | "checkin_submitted" | "manager_ack" | "review_reminder";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  read: boolean;
};

export function useComputedNotifications(profileId: string, role: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const client = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      if (!profileId) return;

      try {
        const items: AppNotification[] = [];

        if (role === "manager") {
          // 1. Goal Approval Pending (from employees they manage)
          const { data: pendingGoals } = await client
            .from("goals")
            .select("id, title, created_at, profiles!inner(id, manager_id, full_name)")
            .eq("status", "submitted")
            .eq("profiles.manager_id", profileId);

          if (pendingGoals) {
            pendingGoals.forEach((g: any) => {
              items.push({
                id: `goal-${g.id}`,
                type: "goal_approval",
                title: "Goal Approval Pending",
                description: `${g.profiles.full_name} submitted "${g.title}" for review.`,
                href: "/manager",
                createdAt: g.created_at,
                read: false,
              });
            });
          }

          // 2. Quarterly check-ins submitted
          const { data: pendingCheckins } = await client
            .from("quarterly_checkins")
            .select("id, quarter, created_at, profiles!inner(id, manager_id, full_name)")
            .eq("checkin_status", "submitted")
            .eq("profiles.manager_id", profileId);

          if (pendingCheckins) {
            pendingCheckins.forEach((c: any) => {
              items.push({
                id: `checkin-${c.id}`,
                type: "checkin_submitted",
                title: "Quarterly Check-in Submitted",
                description: `${c.profiles.full_name} submitted their ${c.quarter} check-in.`,
                href: "/manager",
                createdAt: c.created_at,
                read: false,
              });
            });
          }
        } else {
          // Employee
          // 1. Revisions requested
          const { data: revisedGoals } = await client
            .from("goals")
            .select("id, title, updated_at")
            .eq("profile_id", profileId)
            .eq("status", "revision_requested");

          if (revisedGoals) {
            revisedGoals.forEach((g: any) => {
              items.push({
                id: `goal-${g.id}`,
                type: "review_reminder",
                title: "Revision Requested",
                description: `Your manager requested revisions for "${g.title}".`,
                href: "/employee/plan",
                createdAt: g.updated_at,
                read: false,
              });
            });
          }

          // 2. Acknowledged check-ins (limit to recent to avoid clutter)
          const { data: ackCheckins } = await client
            .from("quarterly_checkins")
            .select("id, quarter, acknowledged_at")
            .eq("employee_id", profileId)
            .eq("checkin_status", "acknowledged")
            .not("acknowledged_at", "is", null)
            .order("acknowledged_at", { ascending: false })
            .limit(3);

          if (ackCheckins) {
            ackCheckins.forEach((c: any) => {
              items.push({
                id: `checkin-${c.id}`,
                type: "manager_ack",
                title: "Check-in Acknowledged",
                description: `Your manager acknowledged your ${c.quarter} check-in.`,
                href: "/employee/tracking",
                createdAt: c.acknowledged_at,
                read: false,
              });
            });
          }
        }

        // Sort by date desc
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (mounted) {
          setNotifications(items);
        }
      } catch (err) {
        console.error("Failed to fetch computed notifications:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchNotifications();

    return () => {
      mounted = false;
    };
  }, [profileId, role, client]);

  // Optimistic mark as read
  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications([]);
  };

  return { notifications, loading, markAsRead, markAllAsRead };
}
