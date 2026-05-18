/**
 * @file features/manager/services/manager.service.ts
 * @description Manager-specific Supabase data access layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedGoal } from "@/types";
import type {
  GoalApprovalLog,
  GoalApprovalLogWithActor,
  ManagerComment,
  ManagerCommentWithAuthor,
} from "@/types/goals/approval";
import type {
  TeamMemberGoalGroup,
  ManagerDashboardStats,
} from "../types/manager.types";

export const managerService = {
  // ─────────────────────────────────────────────────────────────────────────
  // READ METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async getTeamSubmittedGoals(
    client: SupabaseClient,
    cycleId: string,
    managerId?: string
  ): Promise<TeamMemberGoalGroup[]> {
    const query = client
      .from("goals")
      .select(
        `
        *,
        profiles:profile_id (
          id, full_name, employee_id, department, designation, avatar_url, manager_id
        )
      `
      )
      .eq("cycle_id", cycleId)
      .in("status", [
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revision_requested",
      ])
      .is("deleted_at", null)
      .order("submitted_at", { ascending: true });

    const { data: goals, error: goalsError } = await query;

    if (goalsError) throw new Error(goalsError.message);
    if (!goals || goals.length === 0) return [];

    const groupMap = new Map<string, TeamMemberGoalGroup>();

    for (const goal of goals) {
      const profile = goal.profiles as {
        id: string;
        full_name: string;
        employee_id: string;
        department: string;
        designation: string;
        avatar_url: string | null;
        manager_id: string | null;
      } | null;

      if (!profile) continue;

      // ── Manager hierarchy filter ───────────────────────────────────────────
      // When a managerId is provided, only include goals from direct reports
      // (employees whose profiles.manager_id matches the current manager).
      if (managerId && profile.manager_id !== managerId) continue;

      const profileId = profile.id;

      const { profiles: _p, ...normalizedGoal } = goal as typeof goal & {
        profiles: unknown;
      };

      if (!groupMap.has(profileId)) {
        groupMap.set(profileId, {
          profileId,
          employeeId: profile.employee_id,
          fullName: profile.full_name,
          department: profile.department,
          designation: profile.designation,
          avatarUrl: profile.avatar_url,
          goals: [],
          isFullyReviewed: false,
          totalWeightage: 0,
        });
      }

      const group = groupMap.get(profileId)!;
      group.goals.push(normalizedGoal as NormalizedGoal);
    }

    return Array.from(groupMap.values()).map((group) => ({
      ...group,
      totalWeightage: group.goals.reduce(
        (sum, g) => sum + (g.weightage ?? 0),
        0
      ),
      isFullyReviewed: group.goals.every(
        (g) =>
          g.status === "approved" ||
          g.status === "rejected" ||
          g.status === "completed"
      ),
    }));
  },

  /**
   * Fetch all direct reports (employees) for a given manager.
   * Returns lightweight profile stubs — no goal data.
   */
  async getDirectReports(
    client: SupabaseClient,
    managerId: string
  ): Promise<{ id: string; full_name: string; employee_id: string; department: string; designation: string; avatar_url: string | null }[]> {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, employee_id, department, designation, avatar_url")
      .eq("manager_id", managerId)
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getGoalTimeline(
    client: SupabaseClient,
    goalId: string
  ): Promise<GoalApprovalLogWithActor[]> {
    const { data, error } = await client
      .from("goal_approval_logs")
      .select(
        `
        *,
        actor:actor_id (
          id, full_name, role, avatar_url
        )
      `
      )
      .eq("goal_id", goalId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as GoalApprovalLogWithActor[];
  },

  async getApprovalHistory(
    client: SupabaseClient,
    managerId: string,
    limit = 20
  ): Promise<GoalApprovalLogWithActor[]> {
    const { data, error } = await client
      .from("goal_approval_logs")
      .select(
        `
        *,
        actor:actor_id (
          id, full_name, role, avatar_url
        )
      `
      )
      .eq("actor_id", managerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []) as GoalApprovalLogWithActor[];
  },

  async getGoalComments(
    client: SupabaseClient,
    goalId: string
  ): Promise<ManagerCommentWithAuthor[]> {
    const { data, error } = await client
      .from("manager_comments")
      .select(
        `
        *,
        author:author_id (
          id, full_name, role, avatar_url
        )
      `
      )
      .eq("goal_id", goalId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ManagerCommentWithAuthor[];
  },

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVAL MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async approveGoal(
    client: SupabaseClient,
    goalId: string,
    comment?: string
  ): Promise<void> {
    const { error } = await client.rpc("approve_goal_sheet", {
      p_goal_id: goalId,
      p_feedback: comment ?? null,
    });

    if (error) {
      console.error("APPROVE RPC ERROR:", error);
      throw new Error(error.message);
    }
  },

  async rejectGoal(
    client: SupabaseClient,
    goalId: string,
    managerId: string,
    reason: string,
    comment?: string
  ): Promise<NormalizedGoal> {
    const { data, error } = await client.rpc("reject_goal_sheet", {
      p_goal_id: goalId,
      p_manager_id: managerId,
      p_reason: reason,
      p_comment: comment ?? null,
    });

    if (error) throw new Error(error.message);
    return data as NormalizedGoal;
  },

  async requestRevision(
    client: SupabaseClient,
    goalId: string,
    managerId: string,
    reason: string,
    comment?: string
  ): Promise<NormalizedGoal> {
    const { data, error } = await client.rpc("request_goal_revision", {
      p_goal_id: goalId,
      p_manager_id: managerId,
      p_reason: reason,
      p_comment: comment ?? null,
    });

    if (error) throw new Error(error.message);
    return data as NormalizedGoal;
  },

  async approveAllGoalsForEmployee(
    client: SupabaseClient,
    profileId: string,
    cycleId: string
  ): Promise<void> {
    const { data: pending, error: fetchError } = await client
      .from("goals")
      .select("id")
      .eq("profile_id", profileId)
      .eq("cycle_id", cycleId)
      .in("status", ["submitted", "under_review"])
      .is("deleted_at", null);

    if (fetchError) throw new Error(fetchError.message);
    if (!pending || pending.length === 0) return;

    const results = await Promise.allSettled(
      pending.map((g) =>
        this.approveGoal(client, g.id)
      )
    );

    const failed = results.find((r) => r.status === "rejected");

    if (failed && failed.status === "rejected") {
      throw new Error(
        failed.reason instanceof Error
          ? failed.reason.message
          : "Bulk approval partially failed."
      );
    }
  },

  async addComment(
    client: SupabaseClient,
    goalId: string,
    authorId: string,
    body: string,
    isInternal = false
  ): Promise<ManagerComment> {
    const { data, error } = await client
      .from("manager_comments")
      .insert({
        goal_id: goalId,
        author_id: authorId,
        body: body.trim(),
        is_internal: isInternal,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ManagerComment;
  },

  async softDeleteComment(
    client: SupabaseClient,
    commentId: string
  ): Promise<void> {
    const { error } = await client
      .from("manager_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);

    if (error) throw new Error(error.message);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PURE COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────

  computeStats(groups: TeamMemberGoalGroup[]): ManagerDashboardStats {
    let pendingReviewCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    for (const group of groups) {
      for (const goal of group.goals) {
        const s = goal.status;

        if (s === "submitted" || s === "under_review") {
          pendingReviewCount++;
        } else if (s === "approved" || s === "completed") {
          approvedCount++;
        } else if (
          s === "rejected" ||
          s === "revision_requested" ||
          s === "archived"
        ) {
          rejectedCount++;
        }
      }
    }

    return {
      totalTeamMembers: groups.length,
      pendingReviewCount,
      approvedCount,
      rejectedCount,
    };
  },
};