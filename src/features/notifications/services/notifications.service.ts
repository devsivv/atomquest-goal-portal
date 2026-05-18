import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationPayload {
  profile_id: string;
  type: string;
  title: string;
  description: string;
  href: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  is_read: boolean;
  created_at: string;
}

const TABLE = "notifications";

export const notificationsService = {
  /**
   * Fetch all notifications for a specific user
   */
  async getByProfileId(client: SupabaseClient, profileId: string): Promise<AppNotification[]> {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return data as AppNotification[];
  },

  /**
   * Create a new notification
   */
  async create(client: SupabaseClient, payload: NotificationPayload): Promise<void> {
    const { error } = await client.from(TABLE).insert({
      ...payload,
      is_read: false
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(client: SupabaseClient, notificationId: string): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) throw new Error(error.message);
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(client: SupabaseClient, profileId: string): Promise<void> {
    const { error } = await client
      .from(TABLE)
      .update({ is_read: true })
      .eq("profile_id", profileId)
      .eq("is_read", false);

    if (error) throw new Error(error.message);
  }
};
