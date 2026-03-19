export const CALL_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type CallStatus = typeof CALL_STATUSES[number];

export const SENTIMENT_VALUES = ['positive', 'neutral', 'negative'] as const;
export type Sentiment = typeof SENTIMENT_VALUES[number];

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Operator {
  id: string;
  name: string;
  email: string | null;
  project_id: string | null;
  created_at: string;
}

export interface Call {
  id: string;
  project_id: string;
  operator_id: string | null;
  filename: string;
  status: CallStatus;
  duration_seconds: number | null;
  overall_score: number | null;
  compliance_rate: number | null;
  sentiment: Sentiment | null;
  summary: string | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
  // joined
  operator_name?: string;
  project_name?: string;
}

export interface ChecklistResult {
  id: string;
  call_id: string;
  item_label: string;
  passed: boolean;
  notes: string | null;
}

// Analytics aggregates
export interface AnalyticsData {
  total_calls: number;
  avg_score: number;
  compliance_rate: number;
  calls_by_status: Record<CallStatus, number>;
  score_distribution: { bucket: string; count: number }[];
  checklist_item_compliance: { label: string; compliance_rate: number }[];
  sentiment_distribution: Record<Sentiment, number>;
  performance_over_time: {
    date: string;
    avg_score: number;
    avg_compliance: number;
  }[];
  top_operators: {
    name: string;
    avg_score: number;
    total_calls: number;
  }[];
}

export interface OperatorWithStats {
  id: string;
  name: string;
  email: string | null;
  total_calls: number;
  avg_score: number;
  avg_compliance: number;
  trend: 'up' | 'down' | 'neutral';
  trend_delta: number;
  strongest_areas: string[];
  weakest_areas: string[];
  recent_calls: Call[];
  score_over_time: { date: string; score: number }[];
  radar_data: { subject: string; value: number }[];
}
