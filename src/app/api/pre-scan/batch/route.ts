import { NextResponse } from "next/server";
import { preScan } from "@/lib/suitability/pre-scan";
import { classifyWebsite, type ClassificationResult } from "@/lib/suitability/classifier";
import { createServerClient } from "@/lib/supabase";

const MAX_URLS = 50;
const CONCURRENCY_LIMIT = 5;

interface BatchResult {
  url: string;
  domain: string;
  classification: string;
  score_overall: number;
  scores: ClassificationResult["scores"];
  reason: string;
  recommended_action: string;
  error?: string;
}

/**
 * Process items with a concurrency limit using a simple semaphore.
 */
async function processWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty 'urls' array" },
        { status: 400 }
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_URLS} URLs allowed per batch` },
        { status: 400 }
      );
    }

    // Validate all URLs are strings
    if (!urls.every((u: unknown) => typeof u === "string" && u.trim().length > 0)) {
      return NextResponse.json(
        { error: "All URLs must be non-empty strings" },
        { status: 400 }
      );
    }

    const results = await processWithConcurrency<string, BatchResult>(
      urls,
      CONCURRENCY_LIMIT,
      async (url) => {
        try {
          const scanData = await preScan(url);
          const classification = await classifyWebsite(scanData);
          return {
            url: scanData.url,
            domain: classification.domain,
            classification: classification.classification,
            score_overall: classification.score_overall,
            scores: classification.scores,
            reason: classification.reason,
            recommended_action: classification.recommended_action,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return {
            url,
            domain: url,
            classification: "unsuitable",
            score_overall: 0,
            scores: {
              redesign_need: 0,
              business_viability: 0,
              complexity_fit: 0,
              contact_reachability: 0,
            },
            reason: `Error: ${message}`,
            recommended_action: "skip",
            error: message,
          };
        }
      }
    );

    // Batch save to database
    try {
      const supabase = createServerClient();
      const rows = results
        .filter((r) => !r.error)
        .map((r) => ({
          url: r.url,
          domain: r.domain,
          score_redesign_need: r.scores.redesign_need,
          score_business_viability: r.scores.business_viability,
          score_complexity_fit: r.scores.complexity_fit,
          score_contact_reachability: r.scores.contact_reachability,
          score_overall: r.score_overall,
          classification: r.classification,
          reason: r.reason,
        }));

      if (rows.length > 0) {
        await supabase
          .from("pre_scans")
          .upsert(rows, { onConflict: "domain" });
      }
    } catch (dbErr) {
      console.error("[pre-scan/batch] DB save failed:", dbErr);
    }

    const summary = {
      total: results.length,
      proceed: results.filter((r) => r.recommended_action === "proceed").length,
      manual_review: results.filter((r) => r.recommended_action === "manual_review").length,
      skip: results.filter((r) => r.recommended_action === "skip").length,
      errors: results.filter((r) => r.error).length,
    };

    return NextResponse.json({ results, summary });
  } catch (err) {
    console.error("[pre-scan/batch] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
