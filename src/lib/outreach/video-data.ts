import { createServerClient } from "@/lib/supabase";

const supabase = () => createServerClient();

/**
 * Video props matching the Remotion OutreachVideoProps type.
 * Kept in sync with /video/src/Video.tsx
 */
export interface VideoRenderData {
  companyName: string;
  companyDomain: string;
  contactName?: string;
  overallScore: number;
  scores: { label: string; score: number }[];
  problems: string[];
  variants: {
    name: string;
    screenshotUrl: string;
    features: string[];
  }[];
  originalScreenshotUrl: string;
  voiceoverUrl?: string;
  landingPageUrl: string;
}

const SCORE_LABELS: Record<string, string> = {
  performance: "Rychlost",
  mobile: "Mobil",
  seo: "SEO",
  security: "Bezpečnost",
  accessibility: "Přístupnost",
  design: "AI viditelnost",
};

/**
 * Turn raw analysis scores into a Czech problems list.
 */
function detectProblems(
  scores: Record<string, number>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _analysis: Record<string, any>
): string[] {
  const problems: string[] = [];

  if ((scores.performance ?? 100) < 50) {
    problems.push(
      `Web se načítá pomalu — návštěvníci odcházejí dřív, než ho uvidí`
    );
  }
  if ((scores.mobile ?? 100) < 50) {
    problems.push(
      `Na mobilu je web rozbitý — více než 60 % lidí ho rovnou zavře`
    );
  }
  if ((scores.seo ?? 100) < 50) {
    problems.push(`Google váš web téměř nevidí — špatné SEO`);
  }
  if ((scores.security ?? 100) < 70) {
    problems.push(`Chybí HTTPS nebo bezpečnostní hlavičky`);
  }
  if ((scores.accessibility ?? 100) < 50) {
    problems.push(`Web není přístupný — ztrácíte část publika`);
  }
  if ((scores.design ?? 100) < 40) {
    problems.push(`AI asistenti váš web zcela ignorují`);
  }

  // Always return at least 3 problems
  if (problems.length < 3) {
    const fillers = [
      "Design webu působí zastarale a neprofesionálně",
      "Chybí jasná výzva k akci — návštěvníci nevědí co dělat",
      "Web nekonvertuje — zbytečně platíte za reklamu",
    ];
    for (const f of fillers) {
      if (problems.length >= 4) break;
      if (!problems.includes(f)) problems.push(f);
    }
  }

  return problems.slice(0, 4);
}

/**
 * Fetch all data needed to render an outreach video for a CRM record.
 */
export async function getVideoData(
  recordId: string
): Promise<VideoRenderData | null> {
  const db = supabase();

  const { data: record, error } = await db
    .from("crm_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !record) return null;

  // Fetch scores from analyses table via analysis_id
  let analysisData: Record<string, unknown> | null = null;
  if (record.analysis_id) {
    const { data: analysis } = await db
      .from("analyses")
      .select("*")
      .eq("id", record.analysis_id)
      .single();
    analysisData = analysis as Record<string, unknown> | null;
  }
  if (!analysisData) return null;

  const rawScores: Record<string, number> = {
    performance: (analysisData.score_performance as number) ?? 50,
    mobile: (analysisData.score_ux as number) ?? 50,
    seo: (analysisData.score_seo as number) ?? 50,
    security: (analysisData.score_security as number) ?? 50,
    accessibility: (analysisData.score_accessibility as number) ?? 50,
    design: (analysisData.score_ai_visibility as number) ?? 50,
  };

  // Build score array in the format the video expects
  const scores = Object.entries(SCORE_LABELS).map(([key, label]) => ({
    label,
    score: Math.round(rawScores[key] ?? 50),
  }));

  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / Math.max(scores.length, 1)
  );

  const problems = detectProblems(rawScores, analysis as Record<string, unknown>);

  // Variants — use stored variants with screenshot URLs from cache or API
  const storedVariants = meta.variants as
    | Array<{
        name: string;
        previewUrl?: string;
        screenshotUrl?: string;
        features: string[];
      }>
    | undefined;

  // Helper to get screenshot URL, preferring cached URLs
  const getScreenshotUrl = (variantName: string, storedUrl?: string) => {
    // 1. Use stored screenshot URL if available
    if (storedUrl) return storedUrl;

    // 2. Check if we have cached screenshots in metadata
    const cachedScreenshots = meta.screenshots as Record<string, string> | undefined;
    if (cachedScreenshots?.[variantName.toLowerCase()]) {
      return cachedScreenshots[variantName.toLowerCase()];
    }

    // 3. Fall back to API endpoint (will cache/capture on-demand)
    return `https://webflipper.app/api/screenshot/${record.domain}/${variantName.toLowerCase()}`;
  };

  const variants = storedVariants?.length
    ? storedVariants.map((v) => ({
        name: v.name,
        screenshotUrl: getScreenshotUrl(v.name, v.screenshotUrl),
        features: v.features,
      }))
    : [
        {
          name: "Moderní",
          screenshotUrl: getScreenshotUrl("modern"),
          features: ["Responzivní design", "Rychlé načítání", "Moderní vzhled"],
        },
        {
          name: "Profesionální",
          screenshotUrl: getScreenshotUrl("professional"),
          features: [
            "Firemní branding",
            "SEO optimalizace",
            "Kontaktní formuláře",
          ],
        },
        {
          name: "Konverzní",
          screenshotUrl: getScreenshotUrl("conversion"),
          features: ["Lead magnet", "Social proof", "A/B testovaný"],
        },
      ];

  const landingPageUrl = `https://webflipper.app/preview/${record.domain}?ref=video&rid=${recordId}`;

  // Original website screenshot — prefer cached URL
  const cachedScreenshots = meta.screenshots as Record<string, string> | undefined;
  const originalScreenshotUrl =
    (meta.originalScreenshotUrl as string) ??
    cachedScreenshots?.original ??
    `https://webflipper.app/api/screenshot/${record.domain}/original`;

  return {
    companyName: record.company_name ?? record.domain,
    companyDomain: record.domain,
    contactName: record.contact_name ?? undefined,
    overallScore,
    scores,
    problems,
    variants,
    originalScreenshotUrl,
    landingPageUrl,
  };
}

/**
 * Batch fetch video data for multiple records.
 */
export async function getVideoDataBatch(
  recordIds: string[]
): Promise<Map<string, VideoRenderData>> {
  const results = new Map<string, VideoRenderData>();
  // Process in parallel, max 10 concurrent
  const chunks: string[][] = [];
  for (let i = 0; i < recordIds.length; i += 10) {
    chunks.push(recordIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (id) => {
      const data = await getVideoData(id);
      if (data) results.set(id, data);
    });
    await Promise.all(promises);
  }

  return results;
}
