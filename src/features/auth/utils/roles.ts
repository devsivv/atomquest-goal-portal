/**
 * @file features/auth/utils/roles.ts
 * @description Utility functions for role-based logic.
 */

import { ROUTES } from "@/constants";

/**
 * Returns the correct dashboard route based on the user's role.
 * Fallback to employee dashboard for unknown roles.
 */
export function getDashboardRouteByRole(role: string): string {
  switch (role) {
    case "admin":
    case "hr":
      return ROUTES.ADMIN;
    case "manager":
      return ROUTES.MANAGER;
    case "employee":
    default:
      return ROUTES.EMPLOYEE;
  }
}
