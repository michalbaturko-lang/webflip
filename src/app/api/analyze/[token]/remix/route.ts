import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/supabase";
import type { RemixRequest } from "@/types/design";

/**
 * POST /api/analyze/[token]/remix
 *
 * Creates a remixed variant by combining layout/colors/typography
 * from different source variants. The remix applies scoped CSS overrides
 * on top of the selected layout variant's HTML.
 *
 * Body: { layout?: number, colors?: number, typography?: number }
 */

// Allowed color formats
const COLOR_REGEX = /^(#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\))$/;

// Whitelist of safe font families
const ALLOWED_FONTS = new Set([
  // System fonts
  "system-ui", "Arial", "Helvetica", "Helvetica Neue", "Verdana", "Georgia",
  "Times New Roman", "Courier New", "Tahoma", "Trebuchet MS", "Palatino",
  "Garamond", "sans-serif", "serif", "monospace",
  // Google Fonts commonly used
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Oswald", "Merriweather", "Playfair Display", "Source Sans Pro", "Source Sans 3",
  "Nunito", "Nunito Sans", "PT Sans", "PT Serif", "Rubik", "Work Sans",
  "Fira Sans", "Barlow", "DM Sans", "DM Serif Display", "Manrope", "Outfit",
  "Plus Jakarta Sans", "Space Grotesk", "IBM Plex Sans", "IBM Plex Serif",
  "Lexend", "Sora", "Urbanist", "Quicksand", "Mulish", "Karla", "Libre Baskerville",
  "Cormorant Garamond", "Josefin Sans", "Cabin", "Exo 2", "Titillium Web",
  "Arimo", "Noto Sans", "Noto Serif", "Geist", "Geist Sans", "Geist Mono",
]);

function isValidColor(value: string): boolean {
  return COLOR_REGEX.test(value.trim());
}

function isValidFont(name: string): boolean {
  return ALLOWED_FONTS.has(name.trim());
}

function escapeCSSComment(text: string): string {
  return text.replace(/\*/g, "").replace(/\//g, "").replace(/</g, "").replace(/>/g, "");
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
    const layout = body.layout ?? null;
    const colors = body.colors ?? null;
    const typography = body.typography ?? null;

    // At least one selection is required
    if (layout === null && colors === null && typography === null) {
      return NextResponse.json(
        { error: "At least one category must be selected" },
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
      if (val !== null && (typeof val !== "number" || val < 0 || val >= htmlVariants.length)) {
        return NextResponse.json(
          { error: `Invalid ${key} index: ${val}` },
          { status: 400 }
        );
      }
    }

    // Use the layout variant as the base HTML (or first variant as default)
    const baseIndex = layout ?? 0;
    let html = htmlVariants[baseIndex];

    // Add data-remix attribute to <html> element for scoping
    html = html.replace(/<html([^>]*)>/, '<html$1 data-remix="true">');

    // Apply color overrides from the selected colors variant
    if (colors !== null && colors !== baseIndex && variants[colors]) {
      const palette = variants[colors].palette;

      // Validate all color values
      const colorEntries = [
        ["primary", palette.primary],
        ["secondary", palette.secondary],
        ["accent", palette.accent],
        ["bg", palette.bg],
        ["text", palette.text],
      ] as const;

      const validColors: Record<string, string> = {};
      for (const [key, value] of colorEntries) {
        if (isValidColor(value)) {
          validColors[key] = value;
        }
      }

      if (Object.keys(validColors).length > 0) {
        const safeName = escapeCSSComment(variants[colors].name);
        const vars = Object.entries(validColors)
          .map(([key, val]) => `  --remix-${key}: ${val};`)
          .join("\n");

        const colorOverrideCSS = `
/* Remix colors from ${safeName} */
[data-remix] {
${vars}
}
`;
        html = injectCSS(html, colorOverrideCSS);
      }
    }

    // Apply typography overrides from the selected typography variant
    if (typography !== null && typography !== baseIndex && variants[typography]) {
      const typo = variants[typography].typography;

      // Validate font names
      const headingValid = isValidFont(typo.heading);
      const bodyValid = isValidFont(typo.body);

      if (headingValid || bodyValid) {
        const safeName = escapeCSSComment(variants[typography].name);
        const rules: string[] = [];

        if (headingValid) {
          rules.push(`[data-remix] h1, [data-remix] h2, [data-remix] h3, [data-remix] h4, [data-remix] h5, [data-remix] h6 { font-family: '${typo.heading}', sans-serif; }`);
        }
        if (bodyValid) {
          rules.push(`[data-remix] body, [data-remix] p, [data-remix] li, [data-remix] span, [data-remix] a { font-family: '${typo.body}', sans-serif; }`);
        }

        const typoOverrideCSS = `
/* Remix typography from ${safeName} */
${rules.join("\n")}
`;
        html = injectCSS(html, typoOverrideCSS);
      }
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
