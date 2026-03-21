// Outreach Sequence types

export interface OutreachSequenceStep {
  step_number: number;
  delay_days: number;
  channel: 'email' | 'linkedin';
  template: string;
  subject?: string; // for email
  task_type?: 'connection_request' | 'message' | 'follow_up' | 'endorsement' | 'comment'; // for linkedin
  conditions?: {
    skip_if_visited?: boolean;
    skip_if_replied?: boolean;
    skip_if_paid?: boolean;
  };
}

export interface OutreachSequence {
  id: string;
  name: string;
  description: string | null;
  steps: OutreachSequenceStep[];
  is_active: boolean;
  total_enrolled: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedInTask {
  id: string;
  crm_record_id: string;
  task_type: 'connection_request' | 'message' | 'follow_up' | 'endorsement' | 'comment';
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  template_message: string | null;
  actual_message: string | null;
  assigned_to: string | null;
  sequence_id: string | null;
  sequence_step: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface OutreachEmailLog {
  id: string;
  crm_record_id: string;
  sequence_id: string | null;
  sequence_step: number | null;
  template_name: string;
  subject: string;
  resend_email_id: string | null;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BulkImportRow {
  website_url: string;
  company_name?: string;
  contact_email?: string;
  contact_name?: string;
  contact_phone?: string;
  linkedin_url?: string;
  contact_role?: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { url: string; reason: string }[];
  records: { id: string; domain: string; classification: string; score: number }[];
}

export interface DailyOutreachStats {
  pending_emails: number;
  sent_today: number;
  pending_linkedin: number;
  completed_linkedin_today: number;
  open_rate_7d: number;
  click_rate_7d: number;
}
