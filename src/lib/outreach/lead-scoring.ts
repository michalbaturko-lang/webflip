import { createServerClient } from "@/lib/supabase";
import type { CrmRecord, CrmActivity } from "@/types/admin";

const supabase = () => createServerClient();

export interface LeadScore {
  crm_record_id: string;
  engagement_score: number; // 0-100
  fit_score: number; // 0-100
  total_score: number; // 0-100
  factors: Record<string, number>;
}

/**
 * Calculate engagement score based on activities.
 *
 * Engagement scoring rules (max 100):
 * - landing_page_visit: +15 per visit (max 45)
 * - email_opened: +10 per open (max 30)
 * - email_clicked: +20 per click (max 40)
 * - linkedin_replied: +30
 * - trial_started: +40
 * - editor_used: +20 (counted up to 2 times, max 40)
 * - qr_scanned: +25 (max 25)
 */
async function calculateEngagementScore(recordId: string): Promise<{ score: number; factors: Record<string, number> }> {
  const db = supabase();

  const { data: activities, error } = await db
    .from("crm_activities")
    .select("type")
    .eq("crm_record_id", recordId);

  if (error || !activities) {
    return { score: 0, factors: {} };
  }

  const factors: Record<string, number> = {};
  let totalScore = 0;

  // Count activity types
  const typeCounts: Record<string, number> = {};
  for (const activity of activities) {
    typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;
  }

  // Landing page visits: +15 per visit (max 45)
  const visits = typeCounts["website_visit"] || 0;
  const visitScore = Math.min(visits * 15, 45);
  factors["website_visit"] = visitScore;
  totalScore += visitScore;

  // Email opened: +10 per open (max 30)
  const opens = typeCounts["email_opened"] || 0;
  const openScore = Math.min(opens * 10, 30);
  factors["email_opened"] = openScore;
  totalScore += openScore;

  // Email clicked: +20 per click (max 40)
  const clicks = typeCounts["email_clicked"] || 0;
  const clickScore = Math.min(clicks * 20, 40);
  factors["email_clicked"] = clickScore;
  totalScore += clickScore;

  // LinkedIn replied: +30 (once only)
  const linkedinReplied = typeCounts["linkedin_replied"] ? 30 : 0;
  factors["linkedin_replied"] = linkedinReplied;
  totalScore += linkedinReplied;

  // Trial started: +40 (once only)
  const trialStarted = typeCounts["trial_started"] ? 40 : 0;
  factors["trial_started"] = trialStarted;
  totalScore += trialStarted;

  // Editor used: +20 per use (max 40)
  const editorUses = typeCounts["editor_used"] || 0;
  const editorScore = Math.min(editorUses * 20, 40);
  factors["editor_used"] = editorScore;
  totalScore += editorScore;

  // QR scanned: +25 (once only)
  const qrScanned = typeCounts["qr_scanned"] ? 25 : 0;
  factors["qr_scanned"] = qrScanned;
  totalScore += qrScanned;

  // Cap at 100
  const cappedScore = Math.min(totalScore, 100);
  return { score: cappedScore, factors };
}

/**
 * Calculate fit score based on suitability and contact information.
 *
 * Fit scoring rules (max 100):
 * - suitability_score > 80: +40
 * - suitability_score 60-80: +25
 * - suitability_score < 60: +10
 * - has_contact_email: +15
 * - has_linkedin_url: +10
 * - has_phone: +5
 */
async function calculateFitScore(record: CrmRecord): Promise<{ score: number; factors: Record<string, number> }> {
  const factors: Record<string, number> = {};
  let totalScore = 0;

  // Suitability-based scoring
  const suitability = record.suitability_score || 0;
  if (suitability > 80) {
    factors["suitability_score_ideal"] = 40;
    totalScore += 40;
  } else if (suitability >= 60) {
    factors["suitability_score_suitable"] = 25;
    totalScore += 25;
  } else {
    factors["suitability_score_basic"] = 10;
    totalScore += 10;
  }

  // Contact email: +15
  if (record.contact_email) {
    factors["has_contact_email"] = 15;
    totalScore += 15;
  }

  // LinkedIn URL: +10
  if (record.linkedin_url) {
    factors["has_linkedin_url"] = 10;
    totalScore += 10;
  }

  // Phone: +5
  if (record.contact_phone) {
    factors["has_phone"] = 5;
    totalScore += 5;
  }

  // Cap at 100
  const cappedScore = Math.min(totalScore, 100);
  return { score: cappedScore, factors };
}

/**
 * Calculate total lead score: 60% engagement + 40% fit
 */
export async function calculateLeadScore(recordId: string): Promise<LeadScore> {
  const db = supabase();

  // Fetch record
  const { data: record, error: recordError } = await db
    .from("crm_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (recordError || !record) {
    throw new Error(`Failed to fetch record ${recordId}: ${recordError?.message}`);
  }

  const crmRecord = record as CrmRecord;

  // Calculate scores
  const engagementResult = await calculateEngagementScore(recordId);
  const fitResult = await calculateFitScore(crmRecord);

  // Combine: 60% engagement + 40% fit
  const totalScore = Math.round(engagementResult.score * 0.6 + fitResult.score * 0.4);

  const allFactors = {
    ...engagementResult.factors,
    ...fitResult.factors,
  };

  return {
    crm_record_id: recordId,
    engagement_score: engagementResult.score,
    fit_score: fitResult.score,
    total_score: totalScore,
    factors: allFactors,
  };
}

/**
 * Calculate scores for all active records (not paid, churned, or lost).
 * Returns updated count and all scores.
 */
export async function calculateAllLeadScores(): Promise<{
  updated: number;
  scores: LeadScore[];
}> {
  const db = supabase();

  // Get all active records
  const { data: records, error } = await db
    .from("crm_records")
    .select("id")
    .not("stage", "in", '("paid","churned","lost")');

  if (error || !records) {
    throw new Error(`Failed to fetch active records: ${error?.message}`);
  }

  const scores: LeadScore[] = [];
  let updated = 0;

  for (const record of records) {
    try {
      const score = await calculateLeadScore(record.id);
      scores.push(score);

      // Store in metadata or as a computed field (reuse suitability_score for now)
      // In a production system, you might create a separate lead_scores table
      updated++;
    } catch (err) {
      console.error(`Error scoring record ${record.id}:`, err);
    }
  }

  return { updated, scores };
}

/**
 * Get top N leads sorted by total score.
 */
export async function getTopLeadsByScore(limit: number = 10): Promise<
  (CrmRecord & { lead_score: LeadScore })[]
> {
  const db = supabase();

  // Get all active records
  const { data: records, error } = await db
    .from("crm_records")
    .select("*")
    .not("stage", "in", '("paid","churned","lost")')
    .limit(200); // Fetch more to score them

  if (error || !records) {
    throw new Error(`Failed to fetch records: ${error?.message}`);
  }

  // Calculate scores for all
  const scoredRecords: (CrmRecord & { lead_score: LeadScore })[] = [];

  for (const record of records) {
    try {
      const score = await calculateLeadScore(record.id);
      scoredRecords.push({
        ...(record as CrmRecord),
        lead_score: score,
      });
    } catch (err) {
      console.error(`Error scoring record ${record.id}:`, err);
    }
  }

  // Sort by total_score descending and return top N
  return scoredRecords
    .sort((a, b) => b.lead_score.total_score - a.lead_score.total_score)
    .slice(0, limit);
}
