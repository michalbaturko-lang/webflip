import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";

/**
 * POST /api/analyze/[token]/remix
 *
 * Creates a remixed variant by combining layout/colors/typography
 * from different source variants. The remix applies CSS overrides
 * on top of the selected layout variant's HTML.
 *
 * Body: { layout: number | null, colors: number | null, typography: number | null }
 */

interface RemixRequest {
  layout: number | null;
  colors: number | null;
  typography: number | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const body: RemixRequest = await request.json();
    const { layout, colors, typography } = body;

    // At least one selection is required
    if (layout === null && colors === null && typography === null) {
      return NextResponse.json(
        { error: "Vyberte alespoň jednu kategorii pro remix" },
        { status: 400 }
      );
    }

    const analysis = await getAnalysis(token);
    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    if (analysis.status !== "complete") {
      return NextResponse.json(
        { error: "Analysis not yet complete" },
        { status: 202 }
      );
    }

    const htmlVariants = analysis.html_variants || [];
    const variants = analysis.variants || [];

    if (htmlVariants.length === 0) {
      return NextResponse.json(
        { error: "No HTML variants available" },
        { status: 404 }
      );
    }

    // Validate indices
    for (const [key, val] of Object.entries({ layout, colors, typography })) {
      if (val !== null && (val < 0 || val >= htmlVariants.length)) {
        return NextResponse.json(
          { error: `Invalid ${key} index: ${val}` },
          { status: 400 }
        );
      }
    }

    // Use the layout variant as the base HTML (or first variant as default)
    const baseIndex = layout ?? 0;
    let html = htmlVariants[baseIndex];

    // Apply color overrides from the selected colors variant
    if (colors !== null && colors !== baseIndex && variants[colors]) {
      const colorPalette = variants[colors].palette;
      const colorOverrideCSS = `
/* Remix: barvy z varianty "${variants[colors].name}" */
:root {
  --remix-primary: ${colorPalette.primary};
  --remix-secondary: ${colorPalette.secondary};
  --remix-accent: ${colorPalette.accent};
  --remix-bg: ${colorPalette.bg};
  --remix-text: ${colorPalette.text};
}
`;
      html = injectCSS(html, colorOverrideCSS);
    }

    // Apply typography overrides from the selected typography variant
    if (typography !== null && typography !== baseIndex && variants[typography]) {
      const typo = variants[typography].typography;
      const typoOverrideCSS = `
/* Remix: typografie z varianty "${variants[typography].name}" */
h1, h2, h3, h4, h5, h6 { font-family: '${typo.heading}', sans-serif !important; }
body, p, li, span, a { font-family: '${typo.body}', sans-serif !important; }
`;
      html = injectCSS(html, typoOverrideCSS);
    }

    return NextResponse.json({
      html,
      variantIndex: baseIndex,
      sources: {
        layout: layout ?? baseIndex,
        colors: colors ?? baseIndex,
        typography: typography ?? baseIndex,
      },
    });
  } catch (err) {
    console.error("POST /api/analyze/[token]/remix error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Injects a CSS block into the HTML before </head> or at the top of <body>.
 */
function injectCSS(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleTag}\n</head>`);
  }

  if (html.includes("<body")) {
    return html.replace(/<body([^>]*)>/, `<body$1>\n${styleTag}`);
  }

  // Fallback: prepend
  return styleTag + html;
}
