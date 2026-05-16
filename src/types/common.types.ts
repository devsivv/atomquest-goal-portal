/**
 * @file types/common.types.ts
 * @description Base primitives and shared domain types.
 * All feature-level types should extend or compose from these.
 */

export type ID = string;
export type Timestamp = string; // ISO 8601

export type Status = "active" | "inactive" | "archived";
export type Priority = "low" | "medium" | "high" | "critical";

/** Base entity — all Supabase table rows should include these fields */
export type BaseEntity = {
  id: ID;
  created_at: Timestamp;
  updated_at: Timestamp;
};

/** Generic select/dropdown option */
export type SelectOption<T = string> = {
  label: string;
  value: T;
};

/** Navigation link */
export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  disabled?: boolean;
};
