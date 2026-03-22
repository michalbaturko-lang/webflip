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

  const meta = (record.metadata as Record<string, unknown>) ?? {};
  const analysis = (meta.analysis as Record<string, unknown>) ?? {};
  const rawScores = (analysis.scores as Record<string, number>) ?? {};

  // Build score array in the format the video expects
  const scores = Object.entries(SCORE_LABELS).map(([key, label]) => ({
    label,
    score: Math.round(rawScores[key] ?? 50),
  }));

  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + s.score, 0) / Math.max(scores.length, 1)
  );

  const problems = detectProblems(rawScores, analysis as Record<string, unknown>);

  // Variants — use stored variants or generate defaults
  const storedVariants = meta.variants as
    | Array<{
        name: string;
        previewUrl?: string;
        screenshotUrl?: string;
        features: string[];
      }>
    | undefined;

  const variants = storedVariants?.length
    ? storedVariants.map((v) => ({
        name: v.name,
        screenshotUrl:
          v.screenshotUrl ??
          v.previewUrl ??
          `https://webflip.cz/api/screenshot/${record.domain}/${v.name.toLowerCase()}`,
        features: v.features,
      }))
    : [
        {
          name: "Moderní",
          screenshotUrl: `https://webflip.cz/api/screenshot/${record.domain}/modern`,
          features: ["Responzivní design", "Rychlé načítání", "Moderní vzhled"],
        },
        {
          name: "Profesionální",
          screenshotUrl: `https://webflip.cz/api/screenshot/${record.domain}/professional`,
          features: [
            "Firemní branding",
            "SEO optimalizace",
            "Kontaktní formuláře",
          ],
        },
        {
          name: "Konverzní",
          screenshotUrl: `https://webflip.cz/api/screenshot/${record.domain}/conversion`,
          features: ["Lead magnet", "Social proof", "A/B testovaný"],
        },
      ];

  const landingPageUrl = `https://webflip.cz/preview/${record.domain}?ref=video&rid=${recordId}`;

  // Original website screenshot
  const originalScreenshotUrl =
    (meta.originalScreenshotUrl as string) ??
    `https://webflip.cz/api/screenshot/${record.domain}/original`;

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
