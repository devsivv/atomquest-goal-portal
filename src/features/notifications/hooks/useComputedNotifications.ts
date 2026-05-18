import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppNotification } from "../services/notifications.service";

export function useComputedNotifications(profileId: string, role: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const client = createClient();

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      try {
        const { data, error } = await client
          .from("notifications")
          .select("*")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (mounted && data) {
          setNotifications(data as AppNotification[]);
        }
      } catch (err: any) {
        // If the notifications table doesn't exist yet (42P01) or RLS blocks it,
        // degrade gracefully without spamming the console.
        if (err?.code === '42P01' || err?.code === 'PGRST116') {
          if (mounted) setNotifications([]);
          return;
        }
        console.error("Failed to fetch notifications:", err?.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!profileId) {
      if (mounted) setLoading(false);
      return;
    }

    fetchNotifications();

    // Use a unique channel name to prevent Strict Mode remount collisions
    // which cause "cannot add postgres_changes callbacks after subscribe" errors.
    const channelName = `notifications:${profileId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const subscription = client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          if (mounted) {
            setNotifications((prev) => [payload.new as AppNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      client.removeChannel(subscription);
    };
  }, [profileId, client]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await client
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    } catch (err: any) {
      if (err?.code !== '42P01') {
        console.error("Failed to mark as read:", err?.message || err);
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await client
        .from("notifications")
        .update({ is_read: true })
        .eq("profile_id", profileId)
        .eq("is_read", false);
    } catch (err: any) {
      if (err?.code !== '42P01') {
        console.error("Failed to mark all as read:", err?.message || err);
      }
    }
  };

  return { notifications, loading, markAsRead, markAllAsRead };
}

