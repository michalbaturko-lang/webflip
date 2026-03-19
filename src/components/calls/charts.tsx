"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ── Shared palette ──────────────────────────────────────────────────

const COLORS = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  pink: "#ec4899",
  slate: "#64748b",
};

const RADAR_COLORS = [
  COLORS.blue,
  COLORS.emerald,
  COLORS.amber,
  COLORS.violet,
  COLORS.pink,
  COLORS.cyan,
  COLORS.red,
  COLORS.slate,
];

const SCORE_BAR_COLORS = [
  COLORS.red,
  COLORS.amber,
  "#eab308",
  COLORS.blue,
  COLORS.emerald,
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "6px",
    fontSize: "11px",
    color: "#e2e8f0",
  },
  labelStyle: { color: "#94a3b8" },
};

// ── Score Distribution Bar Chart ────────────────────────────────────

export function ScoreDistributionChart({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="bucket" tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={SCORE_BAR_COLORS[i] || COLORS.blue} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Checklist Compliance Horizontal Bar ─────────────────────────────

export function ChecklistComplianceChart({ data }: { data: { label: string; compliance_rate: number }[] }) {
  const colored = data.map((d) => ({
    ...d,
    fill: d.compliance_rate < 50 ? COLORS.red : d.compliance_rate < 80 ? COLORS.amber : COLORS.emerald,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 30)}>
      <BarChart data={colored} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <YAxis dataKey="label" type="category" width={130} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
        <Bar dataKey="compliance_rate" radius={[0, 3, 3, 0]}>
          {colored.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Operator Radar Chart ────────────────────────────────────────────

interface RadarOperator {
  name: string;
  data: { subject: string; value: number }[];
}

export function OperatorRadarChart({ operators }: { operators: RadarOperator[] }) {
  if (operators.length === 0) return null;

  // Merge all subjects
  const allSubjects = new Set<string>();
  operators.forEach((op) => op.data.forEach((d) => allSubjects.add(d.subject)));
  const subjects = Array.from(allSubjects);

  const merged = subjects.map((subject) => {
    const row: Record<string, string | number> = { subject };
    operators.forEach((op) => {
      const found = op.data.find((d) => d.subject === subject);
      row[op.name] = found?.value || 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={merged}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 9 }} />
        <PolarRadiusAxis tick={{ fill: "#64748b", fontSize: 9 }} domain={[0, 100]} />
        {operators.map((op, i) => (
          <Radar
            key={op.name}
            name={op.name}
            dataKey={op.name}
            stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
            fill={RADAR_COLORS[i % RADAR_COLORS.length]}
            fillOpacity={0.1}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Performance Over Time Line Chart ────────────────────────────────

export function PerformanceOverTimeChart({
  data,
  lines = ["avg_score", "avg_compliance"],
}: {
  data: { date: string; avg_score: number; avg_compliance: number; avg_sentiment?: number }[];
  lines?: string[];
}) {
  const lineConfig: Record<string, { color: string; label: string }> = {
    avg_score: { color: COLORS.blue, label: "Avg Score" },
    avg_compliance: { color: COLORS.emerald, label: "Compliance %" },
    avg_sentiment: { color: COLORS.violet, label: "Sentiment" },
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {lines.map((key) => {
          const cfg = lineConfig[key];
          return cfg ? (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={cfg.label}
              stroke={cfg.color}
              strokeWidth={2}
              dot={false}
            />
          ) : null;
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Sentiment Donut Chart ───────────────────────────────────────────

const SENTIMENT_COLORS: Record<string, string> = {
  positive: COLORS.emerald,
  neutral: COLORS.slate,
  negative: COLORS.red,
};

export function SentimentDonutChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    pct: total > 0 ? Math.round((value / total) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
        >
          {chartData.map((d) => (
            <Cell key={d.name} fill={SENTIMENT_COLORS[d.name] || COLORS.slate} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Single Operator Score Trend Line ────────────────────────────────

export function ScoreTrendLine({ data }: { data: { date: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} domain={[0, 100]} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey="score" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
