export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'LOCK' | 'UNLOCK' | 'COMPLETE';

export interface AuditLogRecord {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  // If this audit is for a goal, we enrich it with goal info
  target_goal?: {
    title: string;
    owner_name: string;
    cycle_name: string;
  };
}
