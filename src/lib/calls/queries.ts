import type {
  Call,
  CallStatus,
  Sentiment,
  Project,
  AnalyticsData,
  OperatorWithStats,
} from "@/types/calls";

// ── Demo data seed (deterministic) ──────────────────────────────────

const OPERATOR_NAMES = [
  "Jana Nováková",
  "Petr Svoboda",
  "Michaela Dvořáková",
  "Tomáš Černý",
  "Lucie Procházková",
  "Martin Král",
  "Eva Veselá",
  "Jakub Marek",
];

const CHECKLIST_ITEMS = [
  "Greeting & Introduction",
  "Customer Identification",
  "Needs Assessment",
  "Product Knowledge",
  "Objection Handling",
  "Compliance Disclosure",
  "Upsell Attempt",
  "Call Summary",
  "Next Steps Confirmed",
  "Professional Closing",
];

const PROJECTS: Project[] = [
  { id: "proj-1", name: "Sales Q1 2026", description: "Q1 outbound sales campaign", created_at: "2026-01-01T00:00:00Z" },
  { id: "proj-2", name: "Support Audit", description: "Customer support quality audit", created_at: "2026-02-01T00:00:00Z" },
  { id: "proj-3", name: "Onboarding Calls", description: "New customer onboarding", created_at: "2026-02-15T00:00:00Z" },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDemoCalls(): Call[] {
  const rand = seededRandom(42);
  const calls: Call[] = [];
  const statuses: CallStatus[] = ["completed", "completed", "completed", "completed", "processing", "pending", "failed"];
  const sentiments: Sentiment[] = ["positive", "neutral", "negative"];

  for (let i = 0; i < 120; i++) {
    const opIdx = Math.floor(rand() * OPERATOR_NAMES.length);
    const projIdx = Math.floor(rand() * PROJECTS.length);
    const statusIdx = Math.floor(rand() * statuses.length);
    const status = statuses[statusIdx];
    const isCompleted = status === "completed";
    const dayOffset = Math.floor(rand() * 60);
    const date = new Date(2026, 0, 15 + dayOffset);

    calls.push({
      id: `call-${String(i + 1).padStart(3, "0")}`,
      project_id: PROJECTS[projIdx].id,
      operator_id: `op-${opIdx + 1}`,
      filename: `call_${date.toISOString().slice(0, 10)}_${String(i + 1).padStart(3, "0")}.wav`,
      status,
      duration_seconds: isCompleted ? Math.floor(rand() * 600 + 60) : null,
      overall_score: isCompleted ? Math.floor(rand() * 60 + 40) : null,
      compliance_rate: isCompleted ? Math.round((rand() * 0.5 + 0.5) * 100) / 100 : null,
      sentiment: isCompleted ? sentiments[Math.floor(rand() * 3)] : null,
      summary: isCompleted ? "Call handled per standard procedure." : null,
      transcript: null,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      operator_name: OPERATOR_NAMES[opIdx],
      project_name: PROJECTS[projIdx].name,
    });
  }

  return calls.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function generateChecklistResults(calls: Call[]) {
  const rand = seededRandom(99);
  const results: { call_id: string; item_label: string; passed: boolean }[] = [];
  for (const call of calls) {
    if (call.status !== "completed") continue;
    for (const item of CHECKLIST_ITEMS) {
      results.push({
        call_id: call.id,
        item_label: item,
        passed: rand() > 0.3,
      });
    }
  }
  return results;
}

const DEMO_CALLS = generateDemoCalls();
const DEMO_CHECKLIST = generateChecklistResults(DEMO_CALLS);

// ── Public query functions ──────────────────────────────────────────

export function getProjects(): Project[] {
  return PROJECTS;
}

export function getAnalyticsData(projectId?: string): AnalyticsData {
  let calls = DEMO_CALLS.filter((c) => c.status === "completed");
  if (projectId) calls = calls.filter((c) => c.project_id === projectId);

  const total_calls = calls.length;
  const avg_score = total_calls > 0 ? Math.round(calls.reduce((s, c) => s + (c.overall_score || 0), 0) / total_calls) : 0;
  const compliance_rate =
    total_calls > 0
      ? Math.round((calls.reduce((s, c) => s + (c.compliance_rate || 0), 0) / total_calls) * 100)
      : 0;

  // calls by status
  const allCalls = projectId ? DEMO_CALLS.filter((c) => c.project_id === projectId) : DEMO_CALLS;
  const calls_by_status = { pending: 0, processing: 0, completed: 0, failed: 0 } as Record<CallStatus, number>;
  for (const c of allCalls) calls_by_status[c.status]++;

  // score distribution
  const buckets = [
    { bucket: "0-20", min: 0, max: 20 },
    { bucket: "21-40", min: 21, max: 40 },
    { bucket: "41-60", min: 41, max: 60 },
    { bucket: "61-80", min: 61, max: 80 },
    { bucket: "81-100", min: 81, max: 100 },
  ];
  const score_distribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: calls.filter((c) => (c.overall_score || 0) >= b.min && (c.overall_score || 0) <= b.max).length,
  }));

  // checklist compliance
  const checklistCalls = projectId
    ? DEMO_CHECKLIST.filter((r) => calls.some((c) => c.id === r.call_id))
    : DEMO_CHECKLIST;
  const itemMap = new Map<string, { total: number; passed: number }>();
  for (const r of checklistCalls) {
    const entry = itemMap.get(r.item_label) || { total: 0, passed: 0 };
    entry.total++;
    if (r.passed) entry.passed++;
    itemMap.set(r.item_label, entry);
  }
  const checklist_item_compliance = Array.from(itemMap.entries())
    .map(([label, { total, passed }]) => ({
      label,
      compliance_rate: Math.round((passed / total) * 100),
    }))
    .sort((a, b) => a.compliance_rate - b.compliance_rate);

  // sentiment
  const sentiment_distribution = { positive: 0, neutral: 0, negative: 0 } as Record<Sentiment, number>;
  for (const c of calls) if (c.sentiment) sentiment_distribution[c.sentiment]++;

  // performance over time
  const dayMap = new Map<string, { scores: number[]; compliances: number[] }>();
  for (const c of calls) {
    const day = c.created_at.slice(0, 10);
    const entry = dayMap.get(day) || { scores: [], compliances: [] };
    entry.scores.push(c.overall_score || 0);
    entry.compliances.push((c.compliance_rate || 0) * 100);
    dayMap.set(day, entry);
  }
  const performance_over_time = Array.from(dayMap.entries())
    .map(([date, { scores, compliances }]) => ({
      date,
      avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      avg_compliance: Math.round(compliances.reduce((a, b) => a + b, 0) / compliances.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // top operators
  const opMap = new Map<string, { name: string; scores: number[]; count: number }>();
  for (const c of calls) {
    const name = c.operator_name || "Unknown";
    const entry = opMap.get(name) || { name, scores: [], count: 0 };
    entry.scores.push(c.overall_score || 0);
    entry.count++;
    opMap.set(name, entry);
  }
  const top_operators = Array.from(opMap.values())
    .map((o) => ({
      name: o.name,
      avg_score: Math.round(o.scores.reduce((a, b) => a + b, 0) / o.scores.length),
      total_calls: o.count,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 5);

  return {
    total_calls,
    avg_score,
    compliance_rate,
    calls_by_status,
    score_distribution,
    checklist_item_compliance,
    sentiment_distribution,
    performance_over_time,
    top_operators,
  };
}

export function getOperators(projectId?: string, sortBy: string = "avg_score", sortDir: string = "desc"): OperatorWithStats[] {
  let calls = DEMO_CALLS.filter((c) => c.status === "completed");
  if (projectId) calls = calls.filter((c) => c.project_id === projectId);

  const opMap = new Map<string, { id: string; name: string; calls: Call[] }>();
  for (const c of calls) {
    const id = c.operator_id || "unknown";
    const name = c.operator_name || "Unknown";
    const entry = opMap.get(id) || { id, name, calls: [] };
    entry.calls.push(c);
    opMap.set(id, entry);
  }

  const operators: OperatorWithStats[] = Array.from(opMap.values()).map((op) => {
    const sorted = [...op.calls].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const avgScore = Math.round(op.calls.reduce((s, c) => s + (c.overall_score || 0), 0) / op.calls.length);
    const avgCompliance = Math.round(
      (op.calls.reduce((s, c) => s + (c.compliance_rate || 0), 0) / op.calls.length) * 100
    );

    // trend: last 10 vs previous 10
    const last10 = sorted.slice(0, 10);
    const prev10 = sorted.slice(10, 20);
    const last10Avg = last10.length > 0 ? last10.reduce((s, c) => s + (c.overall_score || 0), 0) / last10.length : 0;
    const prev10Avg = prev10.length > 0 ? prev10.reduce((s, c) => s + (c.overall_score || 0), 0) / prev10.length : 0;
    const delta = Math.round(last10Avg - prev10Avg);
    const trend = delta > 2 ? "up" : delta < -2 ? "down" : "neutral";

    // checklist strengths/weaknesses
    const opChecklist = DEMO_CHECKLIST.filter((r) => op.calls.some((c) => c.id === r.call_id));
    const itemMap = new Map<string, { total: number; passed: number }>();
    for (const r of opChecklist) {
      const entry = itemMap.get(r.item_label) || { total: 0, passed: 0 };
      entry.total++;
      if (r.passed) entry.passed++;
      itemMap.set(r.item_label, entry);
    }
    const itemRates = Array.from(itemMap.entries())
      .map(([label, { total, passed }]) => ({ label, rate: passed / total }))
      .sort((a, b) => b.rate - a.rate);

    const strongest_areas = itemRates.slice(0, 3).map((i) => i.label);
    const weakest_areas = itemRates
      .slice(-3)
      .reverse()
      .map((i) => i.label);

    // score over time
    const dayMap = new Map<string, number[]>();
    for (const c of sorted) {
      const day = c.created_at.slice(0, 10);
      const arr = dayMap.get(day) || [];
      arr.push(c.overall_score || 0);
      dayMap.set(day, arr);
    }
    const score_over_time = Array.from(dayMap.entries())
      .map(([date, scores]) => ({
        date,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // radar data from checklist
    const radar_data = itemRates.map((i) => ({
      subject: i.label.length > 15 ? i.label.slice(0, 14) + "…" : i.label,
      value: Math.round(i.rate * 100),
    }));

    return {
      id: op.id,
      name: op.name,
      email: null,
      total_calls: op.calls.length,
      avg_score: avgScore,
      avg_compliance: avgCompliance,
      trend: trend as "up" | "down" | "neutral",
      trend_delta: delta,
      strongest_areas,
      weakest_areas,
      recent_calls: sorted.slice(0, 5),
      score_over_time,
      radar_data,
    };
  });

  // sort
  operators.sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") return dir * a.name.localeCompare(b.name);
    if (sortBy === "total_calls") return dir * (a.total_calls - b.total_calls);
    return dir * (a.avg_score - b.avg_score);
  });

  return operators;
}

export function getRecentCalls(projectId?: string, limit = 10): Call[] {
  let calls = DEMO_CALLS;
  if (projectId) calls = calls.filter((c) => c.project_id === projectId);
  return calls.slice(0, limit);
}
