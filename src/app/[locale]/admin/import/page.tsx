"use client";

import { useState, useRef, useCallback } from "react";
import { adminFetch, useAdminFetch } from "@/lib/admin/use-admin-fetch";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";

interface ParsedRow {
  website_url: string;
  company_name?: string;
  contact_email?: string;
  contact_name?: string;
  contact_phone?: string;
  linkedin_url?: string;
  contact_role?: string;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: Array<{
    domain: string;
    company_name?: string;
    status: "created" | "skipped" | "error";
    message?: string;
    suitability_score?: number;
  }>;
  error_details: Array<{
    row: number;
    error: string;
  }>;
}

interface Sequence {
  id: string;
  name: string;
}

export default function AdminImportPage() {
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [autoPrescan, setAutoPrescan] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");
  const dragRef = useRef<HTMLDivElement>(null);

  // Manual add form state
  const [manualDomain, setManualDomain] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualLinkedin, setManualLinkedin] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  // Fetch sequences
  const { data: sequencesData } = useAdminFetch<{ sequences: Sequence[] }>(
    "/api/admin/sequences"
  );
  const sequences = sequencesData?.sequences || [];

  // CSV parser - simple split logic
  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    // Parse header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const websiteUrlIndex = header.indexOf("website_url");

    if (websiteUrlIndex === -1) {
      setError("CSV must contain 'website_url' column");
      return [];
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handle quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ""));

      const websiteUrl = values[websiteUrlIndex]?.trim();
      if (!websiteUrl) continue;

      const row: ParsedRow = { website_url: websiteUrl };

      // Map other columns
      header.forEach((col, idx) => {
        const value = values[idx]?.trim();
        if (value && col !== "website_url") {
          switch (col) {
            case "company_name":
              row.company_name = value;
              break;
            case "contact_email":
              row.contact_email = value;
              break;
            case "contact_name":
              row.contact_name = value;
              break;
            case "contact_phone":
              row.contact_phone = value;
              break;
            case "linkedin_url":
              row.linkedin_url = value;
              break;
            case "contact_role":
              row.contact_role = value;
              break;
          }
        }
      });

      rows.push(row);
    }

    return rows;
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragRef.current) {
        dragRef.current.classList.remove("border-blue-500", "bg-blue-950/20");
      }

      const file = e.dataTransfer.files[0];
      if (file && file.type === "text/csv") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const parsed = parseCSV(text);
          setCsvData(parsed);
          setPreview(parsed.slice(0, 10));
          setError("");
        };
        reader.readAsText(file);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [parseCSV]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type === "text/csv") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const parsed = parseCSV(text);
          setCsvData(parsed);
          setPreview(parsed.slice(0, 10));
          setError("");
        };
        reader.readAsText(file);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [parseCSV]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragRef.current && e.dataTransfer.types.includes("Files")) {
      dragRef.current.classList.add("border-blue-500", "bg-blue-950/20");
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragRef.current) {
      dragRef.current.classList.remove("border-blue-500", "bg-blue-950/20");
    }
  };

  const handleImport = async () => {
    if (csvData.length === 0) {
      setError("No data to import");
      return;
    }

    setImporting(true);
    setError("");

    try {
      const importData = {
        records: csvData,
        options: {
          auto_prescan: autoPrescan,
          auto_analyze: autoAnalyze,
          sequence_id: selectedSequence || null,
        },
      };

      const result = await adminFetch("/api/admin/bulk-import", {
        method: "POST",
        body: JSON.stringify(importData),
      });

      setResults(result);
      setCsvData([]);
      setPreview([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualDomain) {
      setError("Domain is required");
      return;
    }

    setAddingManual(true);
    setError("");

    try {
      await adminFetch("/api/admin/records", {
        method: "POST",
        body: JSON.stringify({
          website_url: manualDomain,
          company_name: manualCompany || null,
          contact_email: manualEmail || null,
          linkedin_url: manualLinkedin || null,
        }),
      });

      setManualDomain("");
      setManualCompany("");
      setManualEmail("");
      setManualLinkedin("");
      setResults(null); // Clear results to show success state
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setAddingManual(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Bulk Import</h1>

      {/* CSV Upload Section */}
      {csvData.length === 0 && !results ? (
        <>
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 rounded-lg p-4">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Zone */}
          <div className="space-y-4">
            <div
              ref={dragRef}
              onDrop={handleFileDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center transition-colors hover:border-gray-600"
            >
              <Upload size={32} className="text-gray-400 mx-auto mb-3" />
              <p className="text-gray-300 font-medium mb-1">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to select a file
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-input"
              />
              <label
                htmlFor="csv-input"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white cursor-pointer transition-colors"
              >
                Select CSV File
              </label>
              <p className="text-xs text-gray-500 mt-4">
                Required columns: website_url<br />
                Optional: company_name, contact_email, contact_name, contact_phone, linkedin_url, contact_role
              </p>
            </div>
          </div>
        </>
      ) : null}

      {/* Preview Table */}
      {preview.length > 0 && !results ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Preview ({csvData.length} records)
            </h2>
            <button
              onClick={() => {
                setCsvData([]);
                setPreview([]);
              }}
              className="text-sm text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 rounded-lg p-4">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Options */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrescan}
                  onChange={(e) => setAutoPrescan(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-600"
                />
                <span className="text-sm text-gray-300">Spustit pre-scan</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-blue-600"
                />
                <span className="text-sm text-gray-300">
                  Automaticky analyzovat vhodné weby
                </span>
              </label>

              <div>
                <select
                  value={selectedSequence}
                  onChange={(e) => setSelectedSequence(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Sequence</option>
                  {sequences.map((seq) => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 text-left">
                    <th className="p-3 font-medium">Website URL</th>
                    <th className="p-3 font-medium">Company Name</th>
                    <th className="p-3 font-medium">Contact Email</th>
                    <th className="p-3 font-medium">Contact Name</th>
                    <th className="p-3 font-medium">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="p-3 text-white font-mono text-xs">
                        {row.website_url}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {row.company_name || "—"}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {row.contact_email || "—"}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {row.contact_name || "—"}
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {row.linkedin_url ? (
                          <a
                            href={row.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            View
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {importing ? "Importing..." : `Import ${csvData.length} Records`}
          </button>
        </div>
      ) : null}

      {/* Results Display */}
      {results ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Import Results</h2>
            <button
              onClick={() => setResults(null)}
              className="text-sm text-gray-400 hover:text-white"
            >
              New Import
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400">Celkem</p>
              <p className="text-2xl font-bold text-white mt-1">{results.total}</p>
            </div>
            <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-5">
              <p className="text-sm text-green-400">Vytvořeno</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {results.created}
              </p>
            </div>
            <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-5">
              <p className="text-sm text-yellow-400">Přeskočeno</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {results.skipped}
              </p>
            </div>
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
              <p className="text-sm text-red-400">Chyby</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {results.errors}
              </p>
            </div>
          </div>

          {/* Results Table */}
          {results.results.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 text-left">
                      <th className="p-3 font-medium">Domain</th>
                      <th className="p-3 font-medium">Company</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Score</th>
                      <th className="p-3 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((result, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="p-3 text-white font-mono text-xs">
                          {result.domain}
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {result.company_name || "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                              result.status === "created"
                                ? "bg-green-900/50 text-green-400"
                                : result.status === "skipped"
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-red-900/50 text-red-400"
                            }`}
                          >
                            {result.status === "created" && (
                              <CheckCircle size={12} />
                            )}
                            {result.status === "error" && (
                              <AlertCircle size={12} />
                            )}
                            {result.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {result.suitability_score ?? "—"}
                        </td>
                        <td className="p-3 text-gray-400 text-xs">
                          {result.message || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors List */}
          {results.error_details.length > 0 && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5">
              <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Detailed Errors
              </h3>
              <div className="space-y-2">
                {results.error_details.map((err, idx) => (
                  <p key={idx} className="text-sm text-red-300">
                    <span className="font-mono">Row {err.row}:</span> {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Manual Add Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Plus size={20} className="text-blue-400" />
          Manuálně přidat společnost
        </h2>

        {error && (
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Domain (e.g., example.com)"
            value={manualDomain}
            onChange={(e) => setManualDomain(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Company Name"
            value={manualCompany}
            onChange={(e) => setManualCompany(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Contact Email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="url"
            placeholder="LinkedIn URL"
            value={manualLinkedin}
            onChange={(e) => setManualLinkedin(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleAddManual}
          disabled={addingManual || !manualDomain}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {addingManual ? "Adding..." : "Add Contact"}
        </button>
      </div>
    </div>
  );
}
