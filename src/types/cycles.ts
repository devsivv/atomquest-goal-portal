export type CycleStatus = 'draft' | 'active' | 'archived';
export type QuarterLabel = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface PerformanceCycle {
  id: string;
  name: string;
  start_date: string; // ISO Date string (YYYY-MM-DD)
  end_date: string;
  status: CycleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CycleWindow {
  id: string;
  cycle_id: string;
  quarter: QuarterLabel;
  start_date: string;
  end_date: string;
  submission_deadline: string;
  review_deadline: string;
}

export interface CycleWithWindows extends PerformanceCycle {
  windows: CycleWindow[];
}
