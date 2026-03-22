import { createServerClient } from "@/lib/supabase";
import type { CrmRecord } from "@/types/admin";

const supabase = () => createServerClient();

export interface FlyerData {
  companyName: string;
  domain: string;
  contactName?: string;
  overallScore: number;
  scores: {
    performance: number;
    mobile: number;
    seo: number;
    security: number;
    accessibility: number;
    design: number;
  };
  problems: string[];
  variants: {
    name: string;
    previewUrl: string;
    features: string[];
  }[];
  qrCodeUrl: string;
  landingPageUrl: string;
  expiresAt: string;
}

/**
 * Fetch all necessary data for a flyer from CRM + analysis
 */
export async function getFlyerData(recordId: string): Promise<FlyerData | null> {
  const db = supabase();

  const { data: record, error } = await db
    .from("crm_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (error || !record) return null;

  const meta = (record.metadata as Record<string, unknown>) ?? {};
  const analysis = (meta.analysis as Record<string, unknown>) ?? {};
  const scores = (analysis.scores as Record<string, number>) ?? {};

  // Determine top problems from analysis
  const problems = detectProblems(scores, analysis);

  // Build landing page URL with tracking
  const landingPageUrl = `https://webflipper.app/preview/${record.domain}?ref=flyer&rid=${recordId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(landingPageUrl)}`;

  // Calculate expiry (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get variant info
  const variants = (meta.variants as Array<{ name: string; previewUrl: string; features: string[] }>) ?? [
    { name: "Modern", previewUrl: `https://webflipper.app/api/preview/${record.domain}/modern`, features: ["Responzivní design", "Rychlé načítání", "Moderní vzhled"] },
    { name: "Professional", previewUrl: `https://webflipper.app/api/preview/${record.domain}/professional`, features: ["Firemní branding", "SEO optimalizace", "Kontaktní formuláře"] },
    { name: "E-commerce", previewUrl: `https://webflipper.app/api/preview/${record.domain}/ecommerce`, features: ["Online objednávky", "Platební brány", "Správa produktů"] },
  ];

  return {
    companyName: record.company_name ?? record.domain,
    domain: record.domain,
    contactName: record.contact_name ?? undefined,
    overallScore: Math.round(
      Object.values(scores).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0) /
        Math.max(Object.keys(scores).length, 1)
    ),
    scores: {
      performance: scores.performance ?? 50,
      mobile: scores.mobile ?? 50,
      seo: scores.seo ?? 50,
      security: scores.security ?? 50,
      accessibility: scores.accessibility ?? 50,
      design: scores.design ?? 50,
    },
    problems,
    variants,
    qrCodeUrl,
    landingPageUrl,
    expiresAt,
  };
}

function detectProblems(scores: Record<string, number>, analysis: Record<string, unknown>): string[] {
  const problems: string[] = [];

  if ((scores.performance ?? 100) < 60) problems.push("Pomalé načítání webu — návštěvníci odcházejí do 3 sekund");
  if ((scores.mobile ?? 100) < 60) problems.push("Web není optimalizovaný pro mobily — přicházíte o 60 % návštěvníků");
  if ((scores.seo ?? 100) < 60) problems.push("Špatná SEO viditelnost — Google vás nezobrazuje zákazníkům");
  if ((scores.security ?? 100) < 60) problems.push("Bezpečnostní rizika — chybí HTTPS nebo je zastaralý");
  if ((scores.accessibility ?? 100) < 60) problems.push("Nedostupný web — nesplňuje standardy přístupnosti");
  if ((scores.design ?? 100) < 70) problems.push("Zastaralý design — web nepůsobí důvěryhodně");

  const techIssues = analysis.technicalIssues as string[] | undefined;
  if (techIssues?.length) {
    problems.push(...techIssues.slice(0, 2));
  }

  // Always include AI visibility as a problem (key selling point)
  if (!problems.some((p) => p.toLowerCase().includes("ai"))) {
    problems.push("AI asistenti (ChatGPT, Gemini) váš web nevidí — přicházíte o nové zákazníky");
  }

  return problems.slice(0, 6);
}

/**
 * Generate the full HTML for an A4 flyer
 */
export function generateFlyerHtml(data: FlyerData): string {
  const scoreColor = (score: number) =>
    score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";

  const scoreLabel = (score: number) =>
    score >= 80 ? "Výborné" : score >= 60 ? "Průměrné" : score >= 40 ? "Slabé" : "Kritické";

  const overallColor = scoreColor(data.overallScore);

  const problemsHtml = data.problems
    .map(
      (p) => `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
      <span style="color:#ef4444;font-size:16px;line-height:1.2;">✗</span>
      <span style="font-size:12px;color:#374151;line-height:1.4;">${p}</span>
    </div>`
    )
    .join("");

  const scoreGauges = Object.entries(data.scores)
    .map(([key, value]) => {
      const labels: Record<string, string> = {
        performance: "Rychlost",
        mobile: "Mobil",
        seo: "SEO",
        security: "Bezpečnost",
        accessibility: "Přístupnost",
        design: "Design",
      };
      return `
      <div style="text-align:center;flex:1;min-width:70px;">
        <div style="position:relative;width:56px;height:56px;margin:0 auto 4px;">
          <svg viewBox="0 0 36 36" style="width:56px;height:56px;transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="${scoreColor(value)}" stroke-width="3"
              stroke-dasharray="${value} ${100 - value}" stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:13px;font-weight:700;color:${scoreColor(value)};">${value}</div>
        </div>
        <div style="font-size:10px;color:#6b7280;">${labels[key] ?? key}</div>
      </div>`;
    })
    .join("");

  const variantsHtml = data.variants
    .map(
      (v, i) => `
    <div style="flex:1;min-width:140px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="height:120px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;position:relative;">
        <img src="${v.previewUrl}" alt="${v.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\\'font-size:32px;color:#9ca3af;\\'>🖥️</div><div style=\\'font-size:11px;color:#9ca3af;position:absolute;bottom:4px;\\'>Varianta ${i + 1}</div>'"/>
      </div>
      <div style="padding:8px 10px;">
        <div style="font-weight:600;font-size:13px;color:#111827;margin-bottom:4px;">${v.name}</div>
        ${v.features.map((f) => `<div style="font-size:10px;color:#6b7280;padding:1px 0;">✓ ${f}</div>`).join("")}
      </div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; background:white; }
    .page {
      width:210mm; min-height:297mm; padding:20mm 18mm 16mm;
      position:relative; overflow:hidden;
    }
    .page::before {
      content:''; position:absolute; top:0; left:0; right:0; height:6px;
      background:linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
    }
    @media print {
      .page { padding:16mm 14mm 12mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-weight:800;font-size:14px;">W</span>
        </div>
        <span style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Webflipper</span>
      </div>
      <div style="font-size:11px;color:#9ca3af;">Váš web, nová éra</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#6b7280;">Zpracováno pro</div>
      <div style="font-size:16px;font-weight:700;color:#111827;">${data.companyName}</div>
      <div style="font-size:12px;color:#6366f1;font-weight:500;">${data.domain}</div>
    </div>
  </div>

  <!-- Main Score -->
  <div style="background:linear-gradient(135deg,#f8faff,#f0f0ff);border:1px solid #e0e0ff;border-radius:12px;padding:16px 20px;margin-bottom:14px;display:flex;align-items:center;gap:20px;">
    <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
      <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg);">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="3.5"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="${overallColor}" stroke-width="3.5"
          stroke-dasharray="${data.overallScore} ${100 - data.overallScore}" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
        <div style="font-size:22px;font-weight:800;color:${overallColor};">${data.overallScore}</div>
        <div style="font-size:8px;color:#6b7280;">z 100</div>
      </div>
    </div>
    <div style="flex:1;">
      <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:2px;">
        Celkové skóre: <span style="color:${overallColor};">${scoreLabel(data.overallScore)}</span>
      </div>
      <div style="font-size:11px;color:#6b7280;line-height:1.5;">
        Webflipper analyzoval <strong>${data.domain}</strong> a identifikoval oblasti ke zlepšení.
        ${data.contactName ? `${data.contactName}, p` : "P"}řipravili jsme 3 návrhy redesignu na míru vaší firmě.
      </div>
    </div>
  </div>

  <!-- Score Gauges Row -->
  <div style="display:flex;gap:6px;margin-bottom:14px;justify-content:space-between;">
    ${scoreGauges}
  </div>

  <!-- Problems -->
  <div style="margin-bottom:14px;">
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
      <span style="color:#ef4444;">⚠</span> Co jsme zjistili
    </div>
    <div style="columns:2;column-gap:16px;">
      ${problemsHtml}
    </div>
  </div>

  <!-- Three Variants -->
  <div style="margin-bottom:14px;">
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
      <span style="color:#6366f1;">🎨</span> 3 návrhy nového webu — vyberte si
    </div>
    <div style="display:flex;gap:10px;">
      ${variantsHtml}
    </div>
  </div>

  <!-- AI Editor Section -->
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
    <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
      <span>✨</span> Unikátní AI editor — upravte web sami, bez programátora
    </div>
    <div style="display:flex;gap:12px;">
      <div style="flex:1;">
        <div style="font-size:11px;color:#374151;line-height:1.5;">
          <strong>1.</strong> Klikněte na jakýkoliv prvek webu<br/>
          <strong>2.</strong> Napište, co chcete změnit — česky<br/>
          <strong>3.</strong> AI změní barvy, texty, obrázky, layout okamžitě
        </div>
      </div>
      <div style="flex:1;">
        <div style="font-size:11px;color:#374151;line-height:1.5;">
          Žádné kódování. Žádné čekání na vývojáře.<br/>
          Web máte pod kontrolou vy — kdykoliv, odkudkoliv.<br/>
          <strong>Vyzkoušejte zdarma →</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA with QR -->
  <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;">
    <div style="flex:1;">
      <div style="font-size:16px;font-weight:800;color:white;margin-bottom:4px;">
        Prohlédněte si návrhy zdarma
      </div>
      <div style="font-size:11px;color:#c7d2fe;line-height:1.5;margin-bottom:6px;">
        Naskenujte QR kód nebo navštivte odkaz níže.<br/>
        Návrhy jsou připraveny <strong>7 dní</strong> — do ${data.expiresAt}.
      </div>
      <div style="font-size:10px;color:#a5b4fc;word-break:break-all;">
        ${data.landingPageUrl}
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <div style="background:white;color:#6366f1;font-size:11px;font-weight:600;padding:5px 14px;border-radius:6px;">
          Vybrat návrh →
        </div>
        <div style="border:1px solid rgba(255,255,255,0.4);color:white;font-size:11px;font-weight:500;padding:5px 14px;border-radius:6px;">
          Smazat data
        </div>
      </div>
    </div>
    <div style="flex-shrink:0;background:white;border-radius:8px;padding:6px;">
      <img src="${data.qrCodeUrl}" alt="QR" style="width:80px;height:80px;display:block;"/>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top:10px;text-align:center;font-size:9px;color:#9ca3af;">
    webflipper.app · AI-powered web redesign · info@webflipper.app · Vaše data jsou v bezpečí dle GDPR
  </div>

</div>
</body>
</html>`;
}

/**
 * Generate flyers in batch for multiple CRM records
 */
export async function generateFlyerBatch(recordIds: string[]): Promise<{ id: string; html: string; error?: string }[]> {
  const results: { id: string; html: string; error?: string }[] = [];

  for (const id of recordIds) {
    try {
      const data = await getFlyerData(id);
      if (!data) {
        results.push({ id, html: "", error: "Record not found" });
        continue;
      }
      results.push({ id, html: generateFlyerHtml(data) });
    } catch (err) {
      results.push({ id, html: "", error: String(err) });
    }
  }

  return results;
}
