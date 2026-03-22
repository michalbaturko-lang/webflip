"use client";

import { useState } from "react";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import {
  Camera,
  Video,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Rocket,
  Image as ImageIcon,
  Film,
  AlertTriangle,
  Zap,
} from "lucide-react";

/* ── Types ── */

interface PipelineRecord {
  id: string;
  domain: string;
  companyName: string | null;
  stage: string;
  suitabilityScore: number | null;
  analysisId: string | null;
  hasAnalysis: boolean;
  screenshotCount: number;
  hasOriginalScreenshot: boolean;
  hasVariantScreenshots: number;
  screenshots: { variant: string; url: string; createdAt: string }[];
  videoStatus: string | null;
  videoUrl: string | null;
  videoError: string | null;
  videoRenderedAt: string | null;
  videoDurationMs: number | null;
  videoSizeBytes: number | null;
  pipelineReady: boolean;
  updatedAt: string;
}

interface RenderQueueItem {
  id: string;
  recordId: string;
  domain: string;
  companyName: string | null;
  status: string;
  videoUrl: string | null;
  error: string | null;
  priority: number;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  fileSizeBytes: number | null;
}

interface PipelineStats {
  totalWithAnalysis: number;
  screenshotsComplete: number;
  videosRendered: number;
  videosQueued: number;
  videosRendering: number;
  videosError: number;
  pipelineReady: number;
  totalScreenshots: number;
}

interface PipelineData {
  stats: PipelineStats;
  records: PipelineRecord[];
  renderQueue: RenderQueueItem[];
}

/* ── Helpers ── */

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Status Badge ── */

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-600">—</span>;

  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    done: {
      bg: "bg-green-900/40",
      text: "text-green-400",
      icon: <CheckCircle2 size={12} />,
    },
    queued: {
      bg: "bg-yellow-900/40",
      text: "text-yellow-400",
      icon: <Clock size={12} />,
    },
    rendering: {
      bg: "bg-blue-900/40",
      text: "text-blue-400",
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    error: {
      bg: "bg-red-900/40",
      text: "text-red-400",
      icon: <XCircle size={12} />,
    },
  };

  const c = config[status] ?? { bg: "bg-gray-800", text: "text-gray-400", icon: null };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
      {c.icon}
      {status}
    </span>
  );
}

/* ── Stat Card ── */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Screenshot Preview ── */

function ScreenshotPreview({
  screenshots,
}: {
  screenshots: { variant: string; url: string; createdAt: string }[];
}) {
  if (screenshots.length === 0) {
    return <span className="text-xs text-gray-600">No screenshots</span>;
  }

  return (
    <div className="flex gap-1.5">
      {screenshots.map((s) => (
        <a
          key={s.variant}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
          title={s.variant}
        >
          <div className="w-10 h-7 bg-gray-800 border border-gray-700 rounded overflow-hidden group-hover:border-blue-500 transition-colors">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.variant}
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          </div>
          <span className="absolute -bottom-4 left-0 text-[9px] text-gray-600 truncate w-10">
            {s.variant}
          </span>
        </a>
      ))}
    </div>
  );
}

/* ── Record Row ── */

function RecordRow({
  record,
  selected,
  onToggle,
  onRunPipeline,
  running,
}: {
  record: PipelineRecord;
  selected: boolean;
  onToggle: () => void;
  onRunPipeline: (id: string) => void;
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20"
          />
        </td>
        <td className="px-3 py-2">
          <div>
            <p className="text-sm font-medium text-white">
              {record.companyName || record.domain}
            </p>
            <p className="text-xs text-gray-500">{record.domain}</p>
          </div>
        </td>
        <td className="px-3 py-2">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              record.suitabilityScore && record.suitabilityScore >= 70
                ? "bg-green-900/40 text-green-400"
                : record.suitabilityScore && record.suitabilityScore >= 40
                ? "bg-yellow-900/40 text-yellow-400"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {record.suitabilityScore ?? "—"}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {record.hasAnalysis ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <XCircle size={14} className="text-gray-600" />
            )}
            <span className="text-xs text-gray-400">
              {record.hasAnalysis ? "Done" : "Missing"}
            </span>
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Camera size={14} className={record.screenshotCount > 0 ? "text-blue-400" : "text-gray-600"} />
            <span className="text-xs text-gray-400">{record.screenshotCount}</span>
          </div>
        </td>
        <td className="px-3 py-2">
          <StatusBadge status={record.videoStatus} />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {record.pipelineReady ? (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-400">
                <Rocket size={12} />
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">
                Pending
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRunPipeline(record.id)}
              disabled={running || !record.hasAnalysis}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Run pipeline"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {record.videoUrl && (
              <a
                href={record.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                title="Watch video"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-800/50 bg-gray-900/50">
          <td colSpan={8} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Screenshots</p>
                <ScreenshotPreview screenshots={record.screenshots} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Video</p>
                {record.videoStatus === "done" && record.videoUrl ? (
                  <div className="space-y-1">
                    <a
                      href={record.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Film size={12} /> Watch video
                    </a>
                    <p className="text-[10px] text-gray-600">
                      {formatBytes(record.videoSizeBytes)} · {formatDuration(record.videoDurationMs)} render
                    </p>
                  </div>
                ) : record.videoError ? (
                  <p className="text-xs text-red-400">{record.videoError}</p>
                ) : (
                  <p className="text-xs text-gray-600">Not rendered</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Details</p>
                <p className="text-xs text-gray-400">
                  Stage: {record.stage} · Analysis: {record.analysisId?.slice(0, 8) ?? "none"}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">Updated {timeAgo(record.updatedAt)}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Render Queue Table ── */

function RenderQueue({ items }: { items: RenderQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">
        No render jobs yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Domain</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Status</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Priority</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Queued</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Duration</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Size</th>
            <th className="px-3 py-2 text-xs text-gray-500 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-3 py-2">
                <p className="text-sm text-white">{item.companyName || item.domain}</p>
                <p className="text-[10px] text-gray-600">{item.domain}</p>
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-400">{item.priority}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{timeAgo(item.queuedAt)}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{formatDuration(item.durationMs)}</td>
              <td className="px-3 py-2 text-xs text-gray-400">{formatBytes(item.fileSizeBytes)}</td>
              <td className="px-3 py-2">
                {item.videoUrl && (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Video
                  </a>
                )}
                {item.error && (
                  <span className="text-xs text-red-400 truncate max-w-[150px] block" title={item.error}>
                    {item.error}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main Page ── */

export default function OutreachPipelinePage() {
  const { data, loading, refetch } = useAdminFetch<PipelineData>("/api/admin/pipeline/status");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [tab, setTab] = useState<"records" | "queue">("records");
  const [filter, setFilter] = useState<"all" | "ready" | "pending" | "error">("all");
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function runPipeline(recordId: string) {
    setRunningIds((s) => new Set(s).add(recordId));
    setLastResult(null);
    try {
      const result = await adminFetch("/api/admin/pipeline", {
        method: "POST",
        body: JSON.stringify({ recordId }),
      });
      setLastResult(
        `${result.recordId?.slice(0, 8)}: ${result.success ? "Success" : "Has errors"} — ${result.steps?.length ?? 0} steps`
      );
      refetch();
    } catch (err) {
      setLastResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningIds((s) => {
        const n = new Set(s);
        n.delete(recordId);
        return n;
      });
    }
  }

  async function runBatch() {
    if (selectedIds.size === 0) return;
    setBatchRunning(true);
    setLastResult(null);
    try {
      const ids = Array.from(selectedIds);
      const result = await adminFetch("/api/admin/pipeline", {
        method: "POST",
        body: JSON.stringify({ recordIds: ids }),
      });
      setLastResult(
        `Batch: ${result.success ?? 0} success, ${result.errors ?? 0} errors out of ${result.total ?? ids.length}`
      );
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      setLastResult(`Batch error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBatchRunning(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (!data) return;
    const filtered = getFilteredRecords();
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  function getFilteredRecords(): PipelineRecord[] {
    if (!data) return [];
    switch (filter) {
      case "ready":
        return data.records.filter((r) => r.pipelineReady);
      case "pending":
        return data.records.filter((r) => !r.pipelineReady && !r.videoError);
      case "error":
        return data.records.filter((r) => r.videoStatus === "error");
      default:
        return data.records;
    }
  }

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Outreach Pipeline</h1>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl h-96 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load pipeline data</p>
        <button onClick={refetch} className="mt-2 text-sm text-blue-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const { stats } = data;
  const filtered = getFilteredRecords();

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Outreach Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Screenshots, video renders & outreach readiness
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="With Analysis"
          value={stats.totalWithAnalysis}
          icon={<Zap size={18} />}
          color="bg-blue-900/40 text-blue-400"
        />
        <StatCard
          label="Screenshots Done"
          value={stats.screenshotsComplete}
          icon={<ImageIcon size={18} />}
          color="bg-purple-900/40 text-purple-400"
        />
        <StatCard
          label="Videos Rendered"
          value={stats.videosRendered}
          icon={<Film size={18} />}
          color="bg-green-900/40 text-green-400"
        />
        <StatCard
          label="Pipeline Ready"
          value={stats.pipelineReady}
          icon={<Rocket size={18} />}
          color="bg-amber-900/40 text-amber-400"
        />
      </div>

      {/* Queue mini-stats */}
      {(stats.videosQueued > 0 || stats.videosRendering > 0 || stats.videosError > 0) && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-lg">
          {stats.videosQueued > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400">
              <Clock size={12} /> {stats.videosQueued} queued
            </span>
          )}
          {stats.videosRendering > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <Loader2 size={12} className="animate-spin" /> {stats.videosRendering} rendering
            </span>
          )}
          {stats.videosError > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertTriangle size={12} /> {stats.videosError} errors
            </span>
          )}
        </div>
      )}

      {/* Result toast */}
      {lastResult && (
        <div className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center justify-between">
          {lastResult}
          <button onClick={() => setLastResult(null)} className="text-gray-500 hover:text-gray-300">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-800">
        <button
          onClick={() => setTab("records")}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
            tab === "records"
              ? "text-white border-blue-500"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Records ({data.records.length})
        </button>
        <button
          onClick={() => setTab("queue")}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
            tab === "queue"
              ? "text-white border-blue-500"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
        >
          Render Queue ({data.renderQueue.length})
        </button>
      </div>

      {/* Records tab */}
      {tab === "records" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            {/* Filters */}
            <div className="flex items-center gap-1">
              {(["all", "ready", "pending", "error"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    filter === f
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {f === "all" ? "All" : f === "ready" ? "Ready" : f === "pending" ? "Pending" : "Errors"}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Batch actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                <button
                  onClick={runBatch}
                  disabled={batchRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {batchRunning ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Play size={12} />
                  )}
                  Run Pipeline ({selectedIds.size})
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-2 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/20"
                    />
                  </th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Company</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Score</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Analysis</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Screenshots</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Video</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Status</th>
                  <th className="px-3 py-2 text-xs text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    selected={selectedIds.has(record.id)}
                    onToggle={() => toggleSelect(record.id)}
                    onRunPipeline={runPipeline}
                    running={runningIds.has(record.id)}
                  />
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-600 text-sm">
                {filter === "all"
                  ? "No records with analysis found"
                  : `No ${filter} records`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render Queue tab */}
      {tab === "queue" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm text-gray-400">Recent render jobs</p>
          </div>
          <RenderQueue items={data.renderQueue} />
        </div>
      )}
    </div>
  );
}
