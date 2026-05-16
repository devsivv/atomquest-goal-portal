/**
 * @file constants/index.ts
 * @description App-wide constants. Import with: import { ROUTES } from "@/constants"
 */

export const APP_NAME = "AtomQuest" as const;
export const APP_DESCRIPTION = "Enterprise Goal Tracking Portal" as const;

/** Type-safe route map — always use this instead of hard-coding strings */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  EMPLOYEE: "/employee",
  MANAGER: "/manager",
  ADMIN: "/admin",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** TanStack Query cache key namespaces */
export const QUERY_KEYS = {
  USER: ["user"] as const,
  PROFILE: ["profile"] as const,
  GOALS: ["goals"] as const,
  GOAL: (id: string) => ["goals", id] as const,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;
