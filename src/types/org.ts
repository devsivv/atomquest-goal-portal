export type UserRole = 'employee' | 'manager' | 'admin' | 'hr';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  role: UserRole;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Profile with its manager's name resolved */
export interface UserProfileWithManager extends UserProfile {
  manager: Pick<UserProfile, 'id' | 'full_name' | 'role'> | null;
}

/** Aggregated stats for the org KPI banner */
export interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  managers: number;
  employees: number;
  adminsAndHr: number;
}
