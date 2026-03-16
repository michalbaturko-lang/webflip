import { createServerClient } from "@/lib/supabase";
import type { CrmRecord, CrmActivity, CrmStage } from "@/types/admin";

const supabase = () => createServerClient();

// ─── CRM Records ───

export async function listRecords(params: {
  stage?: string;
  source?: string;
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): Promise<{ data: CrmRecord[]; count: number }> {
  let query = supabase()
    .from("crm_records")
    .select("*", { count: "exact" });

  if (params.stage) query = query.eq("stage", params.stage);
  if (params.source) query = query.eq("source", params.source);
  if (params.scoreMin != null) query = query.gte("suitability_score", params.scoreMin);
  if (params.scoreMax != null) query = query.lte("suitability_score", params.scoreMax);
  if (params.tags?.length) query = query.overlaps("tags", params.tags);
  if (params.search) {
    query = query.or(`domain.ilike.%${params.search}%,company_name.ilike.%${params.search}%`);
  }

  const sortBy = params.sortBy || "created_at";
  const sortDir = params.sortDir === "asc";
  query = query.order(sortBy, { ascending: sortDir });

  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`listRecords: ${error.message}`);
  return { data: (data || []) as CrmRecord[], count: count || 0 };
}

export async function getRecord(id: string): Promise<CrmRecord | null> {
  const { data, error } = await supabase()
    .from("crm_records")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as CrmRecord;
}

export async function createRecord(record: Partial<CrmRecord>): Promise<CrmRecord> {
  const { data, error } = await supabase()
    .from("crm_records")
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`createRecord: ${error.message}`);
  return data as CrmRecord;
}

export async function updateRecord(id: string, updates: Partial<CrmRecord>): Promise<CrmRecord> {
  const { data, error } = await supabase()
    .from("crm_records")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateRecord: ${error.message}`);
  return data as CrmRecord;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase()
    .from("crm_records")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteRecord: ${error.message}`);
}

export async function bulkUpdateStage(ids: string[], stage: CrmStage): Promise<number> {
  const { data, error } = await supabase()
    .from("crm_records")
    .update({ stage })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(`bulkUpdateStage: ${error.message}`);
  return data?.length || 0;
}

export async function bulkAddTags(ids: string[], tags: string[]): Promise<number> {
  // Fetch current tags, merge, update
  const { data: records, error: fetchError } = await supabase()
    .from("crm_records")
    .select("id, tags")
    .in("id", ids);
  if (fetchError) throw new Error(`bulkAddTags fetch: ${fetchError.message}`);

  let updated = 0;
  for (const record of records || []) {
    const existing = record.tags || [];
    const merged = [...new Set([...existing, ...tags])];
    const { error } = await supabase()
      .from("crm_records")
      .update({ tags: merged })
      .eq("id", record.id);
    if (!error) updated++;
  }
  return updated;
}

// ─── Activities ───

export async function listActivities(
  recordId: string,
  limit = 50
): Promise<CrmActivity[]> {
  const { data, error } = await supabase()
    .from("crm_activities")
    .select("*")
    .eq("crm_record_id", recordId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listActivities: ${error.message}`);
  return (data || []) as CrmActivity[];
}

export async function createActivity(activity: Partial<CrmActivity>): Promise<CrmActivity> {
  const { data, error } = await supabase()
    .from("crm_activities")
    .insert(activity)
    .select()
    .single();
  if (error) throw new Error(`createActivity: ${error.message}`);
  return data as CrmActivity;
}

// ─── Dashboard ───

export async function getDashboardKPIs() {
  const db = supabase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, weekRes, trialsRes, revenueRes, funnelRes, expiringRes, topLeadsRes] =
    await Promise.all([
      // Today scanned
      db.from("crm_records").select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),
      // This week
      db.from("crm_records").select("id", { count: "exact", head: true })
        .gte("created_at", weekStart),
      // Active trials
      db.from("crm_records").select("id", { count: "exact", head: true })
        .in("stage", ["trial_started", "trial_active"]),
      // Revenue this month
      db.from("crm_records").select("paid_amount")
        .gte("paid_date", monthStart)
        .not("paid_amount", "is", null),
      // Funnel counts
      db.from("crm_records").select("stage"),
      // Expiring trials (next 7 days)
      db.from("crm_records").select("*")
        .in("stage", ["trial_started", "trial_active"])
        .lte("trial_end_date", new Date(now.getTime() + 7 * 86400000).toISOString())
        .gte("trial_end_date", now.toISOString())
        .order("trial_end_date", { ascending: true })
        .limit(10),
      // Top leads
      db.from("crm_records").select("*")
        .eq("stage", "prospect")
        .not("suitability_score", "is", null)
        .order("suitability_score", { ascending: false })
        .limit(10),
    ]);

  const revenue = (revenueRes.data || []).reduce(
    (sum, r) => sum + (Number(r.paid_amount) || 0), 0
  );

  // Aggregate funnel
  const stageCounts: Record<string, number> = {};
  for (const r of funnelRes.data || []) {
    stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1;
  }
  const funnel = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }));

  return {
    todayScanned: todayRes.count || 0,
    thisWeek: weekRes.count || 0,
    activeTrials: trialsRes.count || 0,
    revenueThisMonth: revenue,
    funnel,
    expiringTrials: (expiringRes.data || []) as CrmRecord[],
    topLeads: (topLeadsRes.data || []) as CrmRecord[],
  };
}

// ─── Pipeline ───

export async function getPipelineData() {
  const stages: { key: CrmStage; label: string }[] = [
    { key: "prospect", label: "Prospect" },
    { key: "contacted", label: "Contacted" },
    { key: "engaged", label: "Engaged" },
    { key: "trial_started", label: "Trial" },
    { key: "trial_active", label: "Trial Active" },
    { key: "card_added", label: "Card Added" },
    { key: "paid", label: "Paid" },
  ];

  const { data, error } = await supabase()
    .from("crm_records")
    .select("*")
    .in("stage", stages.map((s) => s.key))
    .order("suitability_score", { ascending: false });

  if (error) throw new Error(`getPipelineData: ${error.message}`);

  const records = (data || []) as CrmRecord[];
  return stages.map((s) => ({
    stage: s.key,
    label: s.label,
    records: records.filter((r) => r.stage === s.key),
  }));
}

// ─── Export ───

export async function exportRecordsCsv(): Promise<string> {
  const { data, error } = await supabase()
    .from("crm_records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`exportRecords: ${error.message}`);
  const records = (data || []) as CrmRecord[];

  if (records.length === 0) return "";

  const headers = [
    "domain", "company_name", "website_url", "contact_email", "contact_phone",
    "contact_name", "contact_role", "stage", "suitability_score", "source",
    "outreach_channel", "tags", "created_at",
  ];

  const escCsv = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = records.map((r) =>
    headers.map((h) => {
      const val = r[h as keyof CrmRecord];
      return escCsv(Array.isArray(val) ? val.join("; ") : val);
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
