export const CRM_STAGES = [
  'prospect', 'contacted', 'engaged', 'trial_started',
  'email_captured', 'trial_active', 'card_added', 'paid', 'churned', 'lost',
] as const;
export type CrmStage = typeof CRM_STAGES[number];

export const CONTACT_ROLES = ['owner', 'marketing', 'cto', 'unknown'] as const;
export type ContactRole = typeof CONTACT_ROLES[number];

export const ACTIVITY_TYPES = [
  'email_sent', 'email_opened', 'email_clicked',
  'linkedin_sent', 'linkedin_accepted', 'linkedin_replied',
  'physical_mail_sent', 'qr_scanned', 'website_visit',
  'analysis_started', 'email_captured', 'trial_started',
  'trial_page_view', 'editor_used', 'card_added',
  'payment_received', 'note_added', 'stage_changed', 'call_logged', 'page_viewed',
] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export interface CrmRecord {
  id: string;
  domain: string;
  company_name: string | null;
  website_url: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  contact_role: ContactRole;
  linkedin_url: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string;
  pre_scan_id: string | null;
  analysis_id: string | null;
  suitability_score: number | null;
  stage: CrmStage;
  outreach_channel: string | null;
  outreach_sequence_id: string | null;
  outreach_slug: string | null;
  first_contact_date: string | null;
  last_contact_date: string | null;
  outreach_sequence_step: number;
  landing_page_visits: number;
  last_visit_date: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  trial_page_views: number;
  trial_editor_uses: number;
  stripe_customer_id: string | null;
  paid_amount: number | null;
  paid_date: string | null;
  source: string;
  tags: string[] | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  crm_record_id: string;
  type: ActivityType;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  sequence_name: string | null;
  sequence_step: number | null;
  created_at: string;
}

export interface DashboardKPIs {
  todayScanned: number;
  thisWeek: number;
  activeTrials: number;
  revenueThisMonth: number;
  funnel: { stage: CrmStage; count: number }[];
  expiringTrials: CrmRecord[];
  topLeads: CrmRecord[];
}

export interface PipelineColumn {
  stage: CrmStage;
  label: string;
  records: CrmRecord[];
}
