/**
 * @file features/goals/utils/editability.ts
 * @description Centralized goal editability rules based on workflow status.
 *
 * Rules:
 *   draft              → editable   (employee is actively planning)
 *   revision_requested → editable   (manager asked for changes)
 *   submitted          → readonly   (awaiting manager review)
 *   approved           → locked     (immutable — never editable again)
 *   rejected           → locked     (manager closed it; re-edit creates new draft)
 */

type GoalMode =
  | "loading"
  | "empty"
  | "drafting"
  | "revision"
  | "submitted"
  | "approved"
  | "rejected";

/** Returns true only for modes where the employee may edit goals. */
export function isModeEditable(mode: GoalMode): boolean {
  return mode === "drafting" || mode === "revision" || mode === "empty";
}

/** Returns true for modes that are permanently locked (no re-edit path). */
export function isModeLocked(mode: GoalMode): boolean {
  return mode === "approved";
}

/** Returns true for modes that are read-only but not necessarily permanent. */
export function isModeReadonly(mode: GoalMode): boolean {
  return mode === "submitted" || mode === "rejected";
}
