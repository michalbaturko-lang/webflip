"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/lib/admin/use-admin-fetch";
import { CRM_STAGES, ACTIVITY_TYPES, type CrmRecord, type CrmActivity, type CrmStage, type ActivityType } from "@/types/admin";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  ExternalLink,
  Save,
  Plus,
  Copy,
  Check,
} from "lucide-react";

const ACTIVITY_ICONS: Partial<Record<ActivityType, string>> = {
  email_sent: "📧",
  email_opened: "👁️",
  email_clicked: "🔗",
  linkedin_sent: "💼",
  linkedin_accepted: "🤝",
  linkedin_replied: "💬",
  call_logged: "📞",
  note_added: "📝",
  stage_changed: "🔄",
  trial_started: "🚀",
  payment_received: "💰",
  website_visit: "🌐",
  analysis_started: "📊",
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);

  const { data: record, loading, refetch } = useAdminFetch<CrmRecord>(`/api/admin/records/${id}`);
  const { data: activities, refetch: refetchActivities } = useAdminFetch<CrmActivity[]>(
    `/api/admin/records/${id}/activities`
  );

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CrmRecord>>({});
  const [saving, setSaving] = useState(false);
  const [newActivity, setNewActivity] = useState({ type: "" as ActivityType, subject: "", body: "" });
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [qrData, setQrData] = useState<{ qr_image_url?: string; qr_svg?: string; tracking_url?: string; short_id?: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedQr, setCopiedQr] = useState(false);

  useEffect(() => {
    async function fetchQrCode() {
      setQrLoading(true);
      try {
        const response = await fetch(`/api/outreach/qr/${id}`);
        if (response.ok) {
          const data = await response.json();
          setQrData(data);
        }
      } catch (err) {
        console.error("Failed to fetch QR code:", err);
      } finally {
        setQrLoading(false);
      }
    }

    if (id) {
      fetchQrCode();
    }
  }, [id]);

  function startEdit() {
    if (!record) return;
    setForm({ ...record });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await adminFetch(`/api/admin/records/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setEditing(false);
      refetch();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function addActivity() {
    if (!newActivity.type) return;
    try {
      await adminFetch(`/api/admin/records/${id}/activities`, {
        method: "POST",
        body: JSON.stringify(newActivity),
      });
      setNewActivity({ type: "" as ActivityType, subject: "", body: "" });
      setShowAddActivity(false);
      refetchActivities();
    } catch (err) {
      console.error("Add activity failed:", err);
    }
  }

  async function copyTrackingUrl() {
    if (!qrData?.tracking_url) return;
    try {
      await navigator.clipboard.writeText(qrData.tracking_url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  }

  async function copyQrSvg() {
    if (!qrData?.qr_svg) return;
    try {
      await navigator.clipboard.writeText(qrData.qr_svg);
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    } catch (err) {
      console.error("Failed to copy QR SVG:", err);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-900 rounded-xl" />;
  }

  if (!record) {
    return <p className="text-gray-400">Record not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/admin/contacts`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {record.company_name || record.domain}
          </h1>
          <p className="text-sm text-gray-400">{record.domain}</p>
        </div>
        {!editing ? (
          <button
            onClick={startEdit}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status & Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Stage" editing={editing}>
                {editing ? (
                  <select
                    value={form.stage || ""}
                    onChange={(e) => setForm({ ...form, stage: e.target.value as CrmStage })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-white">{record.stage.replace(/_/g, " ")}</span>
                )}
              </Field>
              <Field label="Score">
                <span className={`text-lg font-bold ${
                  (record.suitability_score || 0) >= 70 ? "text-green-400" :
                  (record.suitability_score || 0) >= 40 ? "text-yellow-400" : "text-gray-400"
                }`}>
                  {record.suitability_score ?? "—"}
                </span>
              </Field>
              <Field label="Source">
                <span className="text-sm text-white">{record.source}</span>
              </Field>
              <Field label="Channel" editing={editing}>
                {editing ? (
                  <input
                    value={form.outreach_channel || ""}
                    onChange={(e) => setForm({ ...form, outreach_channel: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  />
                ) : (
                  <span className="text-sm text-white">{record.outreach_channel || "—"}</span>
                )}
              </Field>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow icon={<Globe size={14} />} label="Website" value={record.website_url} href={record.website_url} />
              <InfoRow icon={<Mail size={14} />} label="Email" editing={editing}
                editValue={form.contact_email || ""}
                onEdit={(v) => setForm({ ...form, contact_email: v })}
                value={record.contact_email} href={record.contact_email ? `mailto:${record.contact_email}` : undefined} />
              <InfoRow icon={<Phone size={14} />} label="Phone" editing={editing}
                editValue={form.contact_phone || ""}
                onEdit={(v) => setForm({ ...form, contact_phone: v })}
                value={record.contact_phone} />
              <InfoRow icon={<Linkedin size={14} />} label="LinkedIn" editing={editing}
                editValue={form.linkedin_url || ""}
                onEdit={(v) => setForm({ ...form, linkedin_url: v })}
                value={record.linkedin_url} href={record.linkedin_url || undefined} />
              <InfoRow icon={<MapPin size={14} />} label="Location"
                value={[record.address_city, record.address_country].filter(Boolean).join(", ") || null} />
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">QR kód outreachového odkazu</h2>
            {qrLoading ? (
              <div className="animate-pulse h-64 bg-gray-800 rounded-lg" />
            ) : qrData?.qr_image_url ? (
              <div className="space-y-3">
                <div className="flex justify-center bg-gray-800 rounded-lg p-4">
                  <img
                    src={qrData.qr_image_url}
                    alt="QR Code"
                    className="w-40 h-40"
                  />
                </div>
                {qrData.tracking_url && (
                  <div className="text-xs text-gray-400 break-all text-center">
                    {qrData.tracking_url}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={copyTrackingUrl}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-white transition-colors"
                  >
                    {copiedUrl ? (
                      <>
                        <Check size={12} />
                        <span>Zkopírován odkaz</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Kopírovat odkaz</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={copyQrSvg}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-white transition-colors"
                  >
                    {copiedQr ? (
                      <>
                        <Check size={12} />
                        <span>Zkopírován QR</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Kopírovat QR SVG</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Chyba při načítání QR kódu</p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Notes</h2>
            {editing ? (
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {record.notes || "No notes yet"}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Tags</h2>
            {editing ? (
              <input
                value={(form.tags || []).join(", ")}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="tag1, tag2, tag3"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(record.tags || []).length === 0 && <span className="text-sm text-gray-500">No tags</span>}
                {(record.tags || []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase">Activity</h2>
              <button
                onClick={() => setShowAddActivity(!showAddActivity)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            {/* Add activity form */}
            {showAddActivity && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg space-y-2">
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as ActivityType })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="">Select type...</option>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <input
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                />
                <textarea
                  value={newActivity.body}
                  onChange={(e) => setNewActivity({ ...newActivity, body: e.target.value })}
                  placeholder="Details..."
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white resize-none"
                />
                <button
                  onClick={addActivity}
                  disabled={!newActivity.type}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm text-white"
                >
                  Add Activity
                </button>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-0">
              {(activities || []).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
              )}
              {(activities || []).map((a, i) => (
                <div key={a.id} className={`flex gap-3 py-3 ${i > 0 ? "border-t border-gray-800" : ""}`}>
                  <span className="text-base mt-0.5">{ACTIVITY_ICONS[a.type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{a.subject || a.type.replace(/_/g, " ")}</p>
                    {a.body && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.body}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  editing: _editing,
}: {
  label: string;
  children: React.ReactNode;
  editing?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
  editing,
  editValue,
  onEdit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
  editing?: boolean;
  editValue?: string;
  onEdit?: (v: string) => void;
}) {
  if (editing && onEdit) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-500">{icon}</span>
        <input
          value={editValue || ""}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={label}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500">{icon}</span>
      {value ? (
        href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 truncate flex items-center gap-1">
            {value}
            <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-sm text-white truncate">{value}</span>
        )
      ) : (
        <span className="text-sm text-gray-600">—</span>
      )}
    </div>
  );
}
