import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string; locale: string }>;
}

interface OutreachData {
  company?: {
    name: string;
    domain: string;
    website_url: string;
  };
  analysis?: {
    token: string;
    status: string;
    scores: {
      performance: number;
      seo: number;
      security: number;
      ux: number;
      content: number;
      aiVisibility: number;
      overall: number;
    };
    variants: Array<{
      name: string;
      description: string;
      palette?: {
        primary: string;
        secondary: string;
        accent: string;
      };
      keyFeatures?: string[];
    }>;
    variantCount: number;
    findings: Array<{
      severity: string;
      title: string;
      description: string;
    }>;
    companyName?: string;
    businessProfile?: Record<string, unknown>;
    enrichment?: {
      letterGrade: string;
      healthScore: number;
      topRecommendations?: string[];
    };
  };
  has_analysis: boolean;
}

async function getOutreachData(slug: string): Promise<OutreachData | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${appUrl}/api/outreach/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function OutreachLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getOutreachData(slug);
  if (!data) notFound();

  const companyName =
    data.company?.name ||
    data.company?.domain ||
    data.analysis?.companyName ||
    "your company";
  const variantCount = data.analysis?.variantCount || 3;
  const variantText =
    variantCount === 1
      ? "variantu"
      : variantCount < 5
        ? "varianty"
        : "variant";

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hero */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 text-sm font-medium uppercase tracking-wider mb-4">
            Připraveno speciálně pro
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{companyName}</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Analyzovali jsme váš web a připravili {variantCount} redesign{" "}
            {variantText} na míru.
          </p>
        </div>
      </section>

      {/* Scores Section */}
      {data.analysis?.scores && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Aktuální stav vašeho webu
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {
                  label: "Výkon",
                  score: data.analysis.scores.performance,
                },
                {
                  label: "SEO",
                  score: data.analysis.scores.seo,
                },
                {
                  label: "Bezpečnost",
                  score: data.analysis.scores.security,
                },
                {
                  label: "UX & Design",
                  score: data.analysis.scores.ux,
                },
                {
                  label: "Obsah",
                  score: data.analysis.scores.content,
                },
                {
                  label: "AI Viditelnost",
                  score: data.analysis.scores.aiVisibility,
                },
              ].map((item) => {
                const score = item.score ?? 0;
                const colorClass =
                  score >= 80
                    ? "text-green-400"
                    : score >= 50
                      ? "text-amber-400"
                      : "text-red-400";

                return (
                  <div
                    key={item.label}
                    className="bg-slate-800 rounded-xl p-6 text-center border border-slate-700"
                  >
                    <div className={`text-4xl font-bold mb-2 ${colorClass}`}>
                      {score}
                    </div>
                    <div className="text-sm text-slate-400 uppercase tracking-wider">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {data.analysis.scores.overall && (
              <div className="mt-8 text-center">
                <div className="inline-block bg-slate-800 rounded-2xl px-8 py-4 border border-slate-700">
                  <span className="text-slate-400 text-sm">Celkové skóre</span>
                  <span
                    className={`block text-5xl font-bold ${
                      data.analysis.scores.overall >= 80
                        ? "text-green-400"
                        : data.analysis.scores.overall >= 50
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {data.analysis.scores.overall}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Top Findings */}
      {data.analysis?.findings && data.analysis.findings.length > 0 && (
        <section className="py-16 px-4 bg-slate-800/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">
              Co jsme zjistili
            </h2>
            <div className="space-y-3">
              {data.analysis.findings.map(
                (
                  finding: {
                    severity: string;
                    title: string;
                    description: string;
                  },
                  i: number
                ) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-start gap-3"
                  >
                    <span
                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        finding.severity === "critical"
                          ? "bg-red-400"
                          : finding.severity === "warning"
                            ? "bg-amber-400"
                            : "bg-green-400"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{finding.title}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        {finding.description}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Variant Preview */}
      {data.analysis?.variants && data.analysis.variants.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">
              Vaše redesign varianty
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Připravili jsme {variantCount} unikátní {variantText} redesignu
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {data.analysis.variants.map(
                (
                  variant: {
                    name: string;
                    description: string;
                    palette?: {
                      primary: string;
                      secondary: string;
                      accent: string;
                    };
                    keyFeatures?: string[];
                  },
                  i: number
                ) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors"
                  >
                    {/* Color preview bar */}
                    {variant.palette && (
                      <div className="h-2 flex">
                        <div
                          className="flex-1"
                          style={{ backgroundColor: variant.palette.primary }}
                        />
                        <div
                          className="flex-1"
                          style={{
                            backgroundColor: variant.palette.secondary,
                          }}
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: variant.palette.accent }}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-bold mb-2">
                        {variant.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">
                        {variant.description}
                      </p>
                      {variant.keyFeatures && (
                        <div className="space-y-1">
                          {variant.keyFeatures.slice(0, 3).map(
                            (f: string, j: number) => (
                              <div
                                key={j}
                                className="text-xs text-slate-500 flex items-center gap-2"
                              >
                                <span className="text-blue-400">✓</span> {f}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    {/* Preview link */}
                    {data.analysis?.token && (
                      <div className="px-6 pb-4">
                        <a
                          href={`/preview/${data.analysis.token}/${i}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                        >
                          Zobrazit preview
                        </a>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Video Placeholder */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Jak Webflip funguje</h2>
          <p className="text-slate-400 mb-8">
            Podívejte se na krátké video, jak AI analyzuje a redesignuje weby
          </p>
          <div className="aspect-video bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">▶</div>
              <p className="text-slate-500">Video demo</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Zaujal vás redesign?</h2>
          <p className="text-slate-300 text-lg mb-8">
            Kontaktujte nás a probereme, jak váš nový web spustit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:info@webflip.io"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all"
            >
              Napište nám
            </a>
            <a
              href="tel:+420000000000"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-8 rounded-xl text-lg border border-slate-600 transition-all"
            >
              Zavolejte nám
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-500">
          <p>Webflip — AI-powered website redesign</p>
          <p className="mt-1">
            © {new Date().getFullYear()} Webflip. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getOutreachData(slug);

  return {
    title: data?.company?.name
      ? `Redesign pro ${data.company.name} | Webflip`
      : "Váš personalizovaný redesign | Webflip",
    description: `Podívejte se na AI-generovaný redesign vašeho webu ${data?.company?.domain || ""}`,
    robots: "noindex, nofollow",
  };
}
