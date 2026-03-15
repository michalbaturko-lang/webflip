import Anthropic from "@anthropic-ai/sdk";
import type { DesignVariant, AnalysisRow, ExtractedAssets } from "./supabase";

/**
 * Generate standalone HTML pages for each design variant.
 * Each HTML page is a premium-quality, self-contained website with inline CSS,
 * Google Fonts, responsive design, animations, and REAL client content.
 */
export async function generateHtmlVariants(
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variants: DesignVariant[],
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });

  // Use generous content for better results
  const content = crawledContent.slice(0, 20000);

  const results = await Promise.allSettled(
    variants.map((variant) =>
      generateSingleHtml(anthropic, analysis, variant, content, assets)
    )
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return postProcessHtml(result.value, variants[i]);
    }
    console.error(`HTML generation failed for variant ${i}:`, result.reason);
    return buildFallbackHtml(variants[i], analysis.url, content, assets);
  });
}

async function generateSingleHtml(
  anthropic: Anthropic,
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variant: DesignVariant,
  crawledContent: string,
  assets?: ExtractedAssets | null
): Promise<string> {
  const companyName = assets?.companyName || (() => { try { return new URL(analysis.url).hostname; } catch { return "Company"; } })();

  const assetsSection = assets
    ? `
## CLIENT ASSETS — USE THESE EXACT URLs (no placeholders ever!)
- Company Name: "${assets.companyName || companyName}"
${assets.logo ? `- Logo: ${assets.logo} (use in navbar AND footer)` : "- No logo found — use company name as text logo"}
${assets.favicon ? `- Favicon: ${assets.favicon}` : ""}

### Client Images (use these absolute URLs for hero backgrounds, about sections, galleries):
${assets.images.slice(0, 15).map((img, i) => `${i + 1}. ${img.url}${img.alt ? ` — "${img.alt}"` : ""}`).join("\n")}

### Brand Colors from current site: ${assets.colors.slice(0, 10).join(", ")}
`
    : "";

  // Determine variant-specific design instructions
  const variantInstructions = getVariantInstructions(variant);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 32000,
    messages: [
      {
        role: "user",
        content: `You are a Principal Frontend Engineer and Design Director at a top agency (Vercel/Stripe caliber). Generate a COMPLETE, PREMIUM standalone HTML landing page redesign for "${companyName}" (${analysis.url}).

This must look like a $10,000+ custom website — not a template or prototype. Every detail matters.

${assetsSection}

## VARIANT: "${variant.name}"
${variant.description}

## DESIGN SYSTEM (apply rigorously)
- Primary: ${variant.palette.primary}
- Secondary: ${variant.palette.secondary}
- Accent: ${variant.palette.accent}
- Background: ${variant.palette.bg}
- Text: ${variant.palette.text}
- Heading font: "${variant.typography.heading}" (from Google Fonts)
- Body font: "${variant.typography.body}" (from Google Fonts)
- Layout: ${variant.layout}

### Typography Scale (use consistently):
- Display (hero): clamp(2.5rem, 6vw, 4.5rem), weight 800, letter-spacing -0.03em
- H2 (section): clamp(1.75rem, 4vw, 2.75rem), weight 700, letter-spacing -0.02em
- H3 (card): clamp(1.1rem, 2vw, 1.35rem), weight 600
- Body: 1rem (16px), weight 400, line-height 1.7
- Small/caption: 0.875rem, weight 400, line-height 1.5

### Spacing System (8px grid):
- Section padding: 96px vertical (mobile: 64px)
- Container: max-width 1200px, padding 0 clamp(16px, 4vw, 48px)
- Card padding: 32px (mobile: 24px)
- Component gaps: 24px (grids), 16px (within cards)

### Border Radius Tokens:
- Small (buttons, inputs): 10px
- Medium (cards): 16px
- Large (sections, hero overlays): 24px

${variantInstructions}

## MANDATORY SECTIONS (in this exact order):

### 1. NAVIGATION (sticky/fixed)
- Logo (real image or company name) left-aligned
- Menu links right-aligned: Služby, O nás, Reference, Kontakt
- Hamburger menu on mobile (<768px) with JS toggle (slide-in overlay with backdrop)
- Glass/blur backdrop effect (backdrop-filter: blur(20px))
- Smooth scroll to section anchors
- Shrink effect on scroll: padding reduces from 20px to 12px, subtle shadow appears
- aria-label on nav, hamburger button gets aria-expanded + aria-controls

### 2. HERO (min-height: 70vh)
- Full-width with gradient overlay over the client's first/best image
- Large heading with "${companyName}" or their main headline from crawled content
- Subtitle paragraph from real site content
- Prominent CTA button with hover animation (translateY + shadow glow)
- Page load animation sequence:
  * Heading: slide up 20px + fade in, 600ms ease-out
  * Subtitle: slide up 15px + fade in, 500ms, 200ms delay
  * CTA: scale 0.95→1 + fade in, 400ms, 400ms delay

### 3. SERVICES / PRODUCTS
- 3-column grid on desktop, 2 on tablet (768-1024px), 1 on mobile
- Each card: decorative SVG icon, heading, description paragraph
- Content from the crawled site's service/product sections
- Cards with hover: translateY(-6px) + enhanced shadow, 300ms ease
- Staggered fade-in on scroll: each card delays 0.08s × index
- Cards must have equal height (use grid, not flexbox)

### 4. ABOUT / O NÁS
- Two-column layout: text content left (55%), image right (45%)
- Stack vertically on mobile with image on top
- Real description text from the crawled content
- Optional stats/numbers row with count-up animation if data available
- Image with border-radius: 16px and subtle shadow

### 5. GALLERY / REFERENCES
- Grid of real client images (use absolute URLs from assets)
- 3 columns desktop, 2 tablet, 1 mobile
- Images: border-radius 12px, object-fit cover, height 260px
- Hover: scale(1.03) + brightness(1.05), 400ms ease
- Only include if images are available — otherwise skip entirely

### 6. CONTACT
- Two-column: contact info left, visual form right
- Show real phone, email, address from crawled content (if found)
- Form fields: Jméno, Email, Zpráva, submit button (visual only)
- Styled inputs: focus ring uses primary color with 3px spread
- Labels must use <label> with for attribute (accessibility)
- Submit button matches CTA style from hero

### 7. FOOTER
- Company logo + name
- Navigation links repeated
- Contact info (phone, email, address)
- © ${new Date().getFullYear()} ${companyName}
- Social media SVG icons (generic, clean SVGs — not placeholder circles)

## ANIMATION & INTERACTION SPEC (Apple-quality motion design)

### Page Load Sequence:
- Navbar: fade in, 300ms, ease-out
- Hero elements: staggered slide-up + fade (described in Hero section above)

### Scroll Behaviors:
- Navbar: shrink padding + add box-shadow when scrollY > 50
- Section elements with .fade-in class: slide up 24px + fade, triggered at threshold 0.15
- Cards: stagger reveal, 0.08s between each

### Hover States:
- Buttons: translateY(-2px), shadow increase, 200ms ease
- Cards: translateY(-6px), shadow glow using primary color at 15% opacity, 300ms ease
- Links: color transition + subtle underline effect, 200ms
- Images: scale(1.03), 400ms ease

### Performance Rules:
- Use transform and opacity ONLY for animations (GPU-accelerated)
- Add will-change: transform on cards/animated elements
- @media (prefers-reduced-motion: reduce) — disable all transitions and animations
- IntersectionObserver with rootMargin "-40px" and threshold 0.15

## ACCESSIBILITY (WCAG 2.2 AA)
- Color contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text (verify against palette)
- All images MUST have meaningful alt text (from assets or crawled content)
- Semantic HTML: <header>, <nav>, <main>, <section>, <article>, <footer>
- aria-label on interactive elements without visible text
- Keyboard navigation: visible focus indicators (outline: 2px solid ${variant.palette.primary}, outline-offset: 2px)
- Skip-to-content link as first focusable element (visually hidden, visible on focus)
- Touch targets: minimum 44x44px on all buttons and links
- @media (prefers-reduced-motion: reduce) support

## RESPONSIVE BREAKPOINTS
Design mobile-first, then enhance:
| Element | Mobile (375px) | Tablet (768px) | Desktop (1280px+) |
|---------|---------------|----------------|-------------------|
| Navbar | Hamburger, logo left | Same | Horizontal links |
| Hero | min-h 50vh, smaller text | 60vh | 70vh, full effect |
| Services | 1 column | 2 columns | 3 columns |
| About | Stack vertical | Same | 2-column 55/45 |
| Gallery | 1 column | 2 columns | 3 columns |
| Contact | Stack vertical | Same | 2-column |
| Footer | Stack 1 col | 2 col | Horizontal flex |

## TECHNICAL REQUIREMENTS
1. <!DOCTYPE html> with charset, viewport, theme-color, and description meta tags
2. <html lang="cs"> — proper language attribute
3. Google Fonts via <link rel="preconnect"> + <link> with display=swap for heading + body fonts
4. ALL CSS in a single <style> tag — zero external CSS files
5. Mobile-first CSS: base styles for mobile, then @media (min-width: 768px) and @media (min-width: 1280px)
6. CSS custom properties (--color-primary, --color-bg, etc.) for the palette
7. @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
8. @media (prefers-color-scheme: dark/light) — NOT needed, the variant has its own fixed scheme
9. All JS inline in <script> at bottom — hamburger toggle, smooth scroll, IntersectionObserver with stagger, navbar scroll handler
10. Total HTML under 120KB — be efficient with CSS, use custom properties to avoid repetition
11. 100% standalone — opens in any browser and looks complete and professional

## ABSOLUTE RULES
- NEVER use placeholder text: no "Lorem ipsum", no "Your Company", no "Acme", no "example.com"
- NEVER use placeholder images: no placeholder.com, picsum.photos, unsplash.com, via.placeholder.com, placehold.co
- If you don't have real content for a section, SKIP IT — an empty section is better than fake content
- Every text, heading, and image URL must come from the crawled content or assets provided below
- Use the client's REAL company name "${companyName}" everywhere
- Do NOT include any HTML comments explaining the code
- Do NOT wrap output in code fences or markdown

## CRAWLED CONTENT FROM ${analysis.url}:
${crawledContent}

## OUTPUT
Return ONLY the complete HTML. Start with <!DOCTYPE html>, end with </html>.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract HTML — Claude might wrap it in code fences despite instructions
  const htmlMatch = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];

  if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
    return text.trim();
  }

  const fenceMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  return buildFallbackHtml(variant, analysis.url, crawledContent, assets);
}

/**
 * Returns variant-specific design instructions for the prompt.
 * Each variant has deeply differentiated visual language, CSS techniques, and layout patterns.
 */
function getVariantInstructions(variant: DesignVariant): string {
  const name = variant.name.toLowerCase();

  if (name.includes("corporate") || name.includes("clean") || name.includes("brand") || name.includes("faithful")) {
    return `## VARIANT STYLE: Corporate Clean — Fortune 500 Aesthetic

### Visual Language:
- Light background (#f8fafc or white), professional blue/gray palette
- Clean, crisp edges — no glow effects, no gradients on surfaces
- Subtle shadows using rgba(0,0,0,0.04) to rgba(0,0,0,0.08)
- Thin 1px borders in rgba(0,0,0,0.06) — barely visible, just enough structure
- Generous whitespace — 96px+ between sections, 32px+ card padding

### Typography Treatment:
- Sans-serif only (Inter or similar), clean weights
- Headings: weight 700, NOT 800/900 — confident but not aggressive
- Body: weight 400, line-height 1.8 for readability
- Letter-spacing: -0.01em on headings, normal on body
- Text colors: primary text #0f172a, secondary #475569, muted #94a3b8

### Card Style:
- Background: white or #f8fafc with 1px border rgba(0,0,0,0.06)
- Shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)
- Hover: shadow increases to 0 8px 30px rgba(0,0,0,0.08), translateY(-4px)
- Border-radius: 12px (not too rounded)
- NO glassmorphism, NO backdrop-blur on cards

### Hero:
- Light gradient overlay (white/light to transparent) over hero image
- Professional, calm feel — NOT dramatic
- CTA: solid primary color, rounded-lg, padding 16px 32px
- Optional subtle geometric pattern or grid-dot overlay at 3% opacity

### Navigation:
- Clean white background with subtle bottom border
- Logo in primary brand color, nav links in #475569
- Active/hover state: primary color, no underline animation — simple color change

### Section Backgrounds:
- Alternate between white and #f8fafc sections
- Use subtle top/bottom borders between sections instead of hard color changes

### Unique CSS Technique:
- CSS custom properties for a complete color token system
- Use outline-style focus indicators matching brand
- Subtle CSS grid with named areas for hero layout`;
  }

  if (name.includes("modern") || name.includes("bold") || name.includes("edge") || name.includes("dark")) {
    return `## VARIANT STYLE: Modern Bold — Dark SaaS / Tech Startup Aesthetic

### Visual Language:
- Near-black background (#0a0a0f or #030712), NEVER pure #000000
- Vibrant gradient accents: primary→accent (e.g., blue→cyan or purple→pink)
- Glow effects: colored box-shadow using primary at 20-30% opacity behind key elements
- Surface hierarchy: bg → rgba(255,255,255,0.03) → rgba(255,255,255,0.06)
- Borders: 1px solid rgba(255,255,255,0.08)

### Typography Treatment:
- BOLD weight contrast: headings at 800-900, body at 300-400
- Headings: letter-spacing -0.03em, large size (bigger than other variants)
- Consider gradient text on hero heading: background-clip: text with linear-gradient
- Text colors: primary #ffffff, secondary #9ca3af (gray-400), muted #6b7280 (gray-500)

### Card Style — Glassmorphism:
- Background: rgba(255,255,255,0.03)
- Border: 1px solid rgba(255,255,255,0.08)
- backdrop-filter: blur(12px)
- Hover: border brightens to rgba(255,255,255,0.15), glow shadow using primary color
- Optional: animated gradient border on hover (using background-image on pseudo-element)

### Hero:
- Full-bleed, dramatic feel — min-height 80vh
- Dark gradient overlay (multiple stops for depth)
- Hero heading potentially with gradient text effect
- Glow behind CTA button: box-shadow 0 0 40px primary-color at 30%
- Optional: subtle dot/grid pattern overlay at 3-5% opacity using repeating-linear-gradient

### Navigation:
- Transparent initially → dark glass on scroll
- Logo in white, nav links in gray-400 → white on hover
- CTA button in nav: small accent-colored pill button

### Section Backgrounds:
- Alternate between base dark and slightly lighter surfaces
- Use gradient fade lines (thin 1px gradient border) between sections instead of hard borders
- Occasional full-width gradient accent strip (primary→transparent)

### Unique CSS Techniques:
- Gradient text: background: linear-gradient(); -webkit-background-clip: text; color: transparent
- Animated gradient borders: pseudo-element with conic-gradient, rotating on hover
- Glow effects: multiple layered box-shadows with brand colors
- Subtle radial gradient "spotlight" behind hero content
- Grid/dot pattern: background-image with repeating-linear-gradient at 2% opacity`;
  }

  if (name.includes("elegant") || name.includes("minimal") || name.includes("luxury")) {
    return `## VARIANT STYLE: Elegant Minimal — Luxury Editorial Aesthetic

### Visual Language:
- Warm backgrounds: cream #faf8f5 or ivory #f5f0eb — NEVER pure white
- Muted, desaturated accent colors — earth tones, soft golds, warm browns
- Abundant whitespace — 120px+ between sections, 48px+ card padding
- Thin hairline borders (1px solid rgba(0,0,0,0.08)) instead of shadows
- NO box-shadows on cards — use borders and whitespace for hierarchy

### Typography Treatment:
- SERIF headings (Playfair Display, Cormorant Garamond, or similar) — weight 600-700
- Sans-serif body (Source Sans 3 or similar) — weight 400, line-height 1.8
- Headings: letter-spacing -0.02em, sometimes with subtle text-transform: uppercase for h3/labels
- Optional: thin horizontal rule (48px wide, centered) above section titles
- Text colors: warm dark #1c1917 for primary, #78716c for secondary

### Card/Content Style:
- NO card backgrounds — use whitespace and typography for separation
- If cards needed: thin 1px border only, no fill, generous padding (40px+)
- Hover: subtle border color change (darker), NO translateY or shadows
- Content container: max-width 960px (narrower than other variants)

### Hero:
- Centered text, clean composition, minimal overlay
- Large serif heading with generous letter-spacing
- Subtitle in sans-serif, lighter weight, wider tracking
- CTA: ghost/outline button (thin border, no fill) or thin solid with subtle hover fill
- Hero height: shorter feel, 60vh, with ample top/bottom padding
- Background: subtle warm gradient or muted photo with heavy cream overlay

### Navigation:
- Ultra-clean: thin bottom border, generous spacing
- Logo: serif text in brand color, understated
- Nav links: small, uppercase, letter-spacing 0.1em, weight 500
- Hover: subtle color change, no effects

### Section Layout:
- Narrow container max-width 960px for text sections
- Full-width for gallery (but images still tastefully constrained)
- Two-column layouts: 50/50 split with generous gap (64px+)
- Asymmetric touches: offset images or pull-quotes

### Unique CSS Techniques:
- CSS custom properties for warm color palette
- Thin decorative lines: 48px horizontal rules, 1px, centered
- Subtle letter-spacing on labels and small text (0.05em to 0.15em)
- Image treatments: subtle warm overlay (sepia 5%), or thin border with 8px padding
- NO animations beyond gentle fade-in — restraint is the aesthetic
- Transitions: 400ms ease (slower, more deliberate than other variants)`;
  }

  // Default conversion-focused
  return `## VARIANT STYLE: Conversion Focused — High-Performance Landing Page

### Visual Language:
- Clear visual hierarchy with strong contrast — guide the eye to CTAs
- Light or neutral background with high-contrast accent sections
- Strategic use of color: most of page is neutral, CTAs pop with accent color
- Trust signals: badges, stats, testimonial-style quotes from content

### Typography Treatment:
- Bold headings (700-800), clear body text (400)
- Headings benefit-driven and short
- Social proof numbers: extra large (3rem+) with bold weight

### Card Style:
- Moderate shadows for depth: 0 4px 20px rgba(0,0,0,0.06)
- Hover: stronger shadow + translateY(-4px)
- Accent-colored top border or left border on key cards

### Hero:
- High-contrast with clear value proposition
- Large, bold headline focused on benefits
- Prominent CTA: large, accent-colored, with hover glow effect
- Optional: secondary ghost CTA button beside primary

### Unique Elements:
- Social proof row if available: stats or trust indicators
- FAQ section (accordion style) if content available in crawled data
- Sticky bottom CTA bar on mobile (position: fixed, bottom: 0)
- Subtle urgency elements if appropriate (not spammy)
- Cards with accent-colored left border for visual interest`;
}

/**
 * Post-process generated HTML to ensure quality standards:
 * - Injects prefers-reduced-motion if missing
 * - Ensures proper lang attribute
 * - Adds skip-to-content link if missing
 * - Ensures viewport meta tag
 * - Adds theme-color meta tag
 */
function postProcessHtml(html: string, variant: DesignVariant): string {
  let result = html;

  // Ensure prefers-reduced-motion media query exists
  if (!result.includes("prefers-reduced-motion")) {
    const reducedMotionCSS = `
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }`;
    // Inject before closing </style> tag
    result = result.replace("</style>", `${reducedMotionCSS}\n  </style>`);
  }

  // Ensure lang="cs" on html tag
  if (result.includes("<html>") || result.includes("<html ")) {
    result = result.replace(/<html(?:\s[^>]*)?>/, (match) => {
      if (match.includes("lang=")) return match;
      return match.replace("<html", '<html lang="cs"');
    });
  }

  // Ensure viewport meta tag exists
  if (!result.includes("viewport")) {
    result = result.replace(
      "</head>",
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>'
    );
  }

  // Add theme-color meta if missing
  if (!result.includes("theme-color")) {
    result = result.replace(
      "</head>",
      `  <meta name="theme-color" content="${variant.palette.primary}">\n</head>`
    );
  }

  // Add skip-to-content link if missing
  if (!result.includes("skip") && result.includes("<body>")) {
    const skipLink = `<a href="#main-content" class="skip-link" style="position:absolute;top:-40px;left:0;background:${variant.palette.primary};color:#fff;padding:8px 16px;z-index:10000;font-size:14px;transition:top 0.2s;">Přeskočit na obsah</a>`;
    const skipFocus = `.skip-link:focus{top:0;}`;
    result = result.replace("<body>", `<body>\n  ${skipLink}`);
    if (result.includes("</style>")) {
      result = result.replace("</style>", `  ${skipFocus}\n  </style>`);
    }
  }

  // Ensure main landmark exists — wrap content sections if missing
  if (!result.includes("<main")) {
    // Add id="main-content" to the first section after nav for skip-link target
    result = result.replace(
      /(<\/nav>[\s\S]*?)(<section)/,
      '$1<main id="main-content">\n  $2'
    );
    if (result.includes('<main id="main-content">')) {
      result = result.replace(
        /(<\/section>[\s\S]*?)(<footer)/,
        "$1</main>\n  $2"
      );
    }
  }

  return result;
}

/**
 * Premium fallback HTML builder — generates a complete, professional page
 * when Claude API fails. Uses real client data.
 */
function buildFallbackHtml(
  variant: DesignVariant,
  url: string,
  crawledContent?: string,
  assets?: ExtractedAssets | null
): string {
  let siteHost: string;
  try { siteHost = new URL(url).hostname; } catch { siteHost = url; }
  const companyName = assets?.companyName || siteHost;
  const headingFont = variant.typography.heading.replace(/ /g, "+");
  const bodyFont = variant.typography.body.replace(/ /g, "+");
  const p = variant.palette;
  const year = new Date().getFullYear();

  // Parse crawled content
  const lines = (crawledContent || "").split("\n").filter((l) => l.trim().length > 10);
  const headings = lines.filter((l) => l.startsWith("#")).map((l) => l.replace(/^#+\s*/, "").trim());
  const paragraphs = lines.filter((l) => !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("!") && l.trim().length > 40);
  const listItems = lines.filter((l) => l.startsWith("- ")).map((l) => l.replace(/^-\s*/, "").trim()).filter((l) => l.length > 10);

  const heroTitle = headings[0] || companyName;
  const heroSubtitle = paragraphs[0] || "";
  const aboutText = paragraphs.slice(1, 4).join(" ") || "";

  // Services from headings or list items
  const serviceItems = headings.slice(1, 7).length >= 3
    ? headings.slice(1, 7)
    : listItems.slice(0, 6);
  const serviceDescriptions = paragraphs.slice(1, 7);

  // Images
  const images = assets?.images || [];
  const heroImage = images[0]?.url || "";
  const aboutImage = images[1]?.url || images[0]?.url || "";
  const galleryImages = images.slice(0, 6);

  // Contact info from content
  const allText = crawledContent || "";
  const phoneMatch = allText.match(/(?:\+420|00420)?\s*\d{3}\s*\d{3}\s*\d{3}/) || allText.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{3,4}/);
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  const phone = phoneMatch?.[0] || "";
  const email = emailMatch?.[0] || "";

  // Logo HTML
  const logoHtml = assets?.logo
    ? `<img src="${assets.logo}" alt="${companyName}" class="logo-img" />`
    : `<span class="logo-text">${companyName}</span>`;

  // Determine if dark variant
  const isDark = isColorDark(p.bg);
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
  const navBg = isDark ? `${p.bg}e6` : `${p.bg}e6`;

  // Build services HTML
  const servicesHtml = serviceItems.length >= 2
    ? serviceItems.slice(0, 6).map((title, i) => {
        const desc = serviceDescriptions[i] || "";
        const iconSvg = getServiceIcon(i, p.primary);
        return `
        <div class="card fade-in">
          <div class="card-icon">${iconSvg}</div>
          <h3>${escapeHtml(title)}</h3>
          ${desc ? `<p>${escapeHtml(desc.slice(0, 200))}</p>` : ""}
        </div>`;
      }).join("")
    : "";

  // Build gallery HTML
  const galleryHtml = galleryImages.length >= 2
    ? galleryImages.map((img) => `
        <div class="gallery-item fade-in">
          <img src="${img.url}" alt="${escapeHtml(img.alt || companyName)}" loading="lazy" />
        </div>`).join("")
    : "";

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(heroSubtitle.slice(0, 160))}">
  <meta name="theme-color" content="${p.primary}">
  <title>${escapeHtml(companyName)} — ${variant.name}</title>
  ${assets?.favicon ? `<link rel="icon" href="${assets.favicon}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont}:wght@400;600;700;800;900&family=${bodyFont}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-primary: ${p.primary};
      --color-secondary: ${p.secondary};
      --color-accent: ${p.accent};
      --color-bg: ${p.bg};
      --color-text: ${p.text};
      --card-bg: ${cardBg};
      --card-border: ${cardBorder};
      --input-bg: ${inputBg};
      --nav-bg: ${navBg};
      --font-heading: "${variant.typography.heading}", system-ui, sans-serif;
      --font-body: "${variant.typography.body}", system-ui, -apple-system, sans-serif;
      --radius-sm: 10px;
      --radius-md: 16px;
      --radius-lg: 24px;
    }

    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    h1, h2, h3, h4 { font-family: var(--font-heading); line-height: 1.2; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 48px); }

    /* ── Skip Link (Accessibility) ── */
    .skip-link {
      position: absolute; top: -40px; left: 0; z-index: 10000;
      background: var(--color-primary); color: #fff;
      padding: 8px 16px; font-size: 0.875rem; text-decoration: none;
      transition: top 0.2s;
    }
    .skip-link:focus { top: 0; }

    /* ── Focus Indicators (Accessibility) ── */
    :focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* ── Navigation ── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 20px 24px;
      background: var(--nav-bg);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--card-border);
      transition: padding 0.3s ease, box-shadow 0.3s ease;
    }
    .nav.scrolled { padding: 12px 24px; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }
    .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo-img { height: 40px; width: auto; object-fit: contain; }
    .logo-text { font-family: var(--font-heading); font-weight: 800; font-size: 1.5rem; color: var(--color-primary); text-decoration: none; }
    .nav-links { display: flex; gap: 32px; align-items: center; }
    .nav-links a { color: var(--color-text); text-decoration: none; font-size: 0.9rem; font-weight: 500; opacity: 0.8; transition: opacity 0.2s, color 0.2s; }
    .nav-links a:hover { opacity: 1; color: var(--color-primary); }
    .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 8px; min-width: 44px; min-height: 44px; align-items: center; justify-content: center; }
    .hamburger span { width: 24px; height: 2px; background: var(--color-text); border-radius: 2px; transition: transform 0.3s, opacity 0.3s; }
    .mobile-menu {
      display: none; position: fixed; inset: 0; z-index: 999;
      background: ${p.bg}f5; backdrop-filter: blur(24px);
      flex-direction: column; align-items: center; justify-content: center; gap: 32px;
    }
    .mobile-menu.open { display: flex; }
    .mobile-menu a { color: var(--color-text); text-decoration: none; font-size: 1.5rem; font-weight: 600; min-height: 44px; display: flex; align-items: center; }
    .mobile-close { position: absolute; top: 24px; right: 24px; background: none; border: none; color: var(--color-text); font-size: 2rem; cursor: pointer; min-width: 44px; min-height: 44px; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hamburger { display: flex; }
    }

    /* ── Hero ── */
    .hero {
      min-height: 70vh; display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden; padding: 120px 24px 80px;
    }
    @media (max-width: 768px) { .hero { min-height: 50vh; padding: 100px 16px 60px; } }
    .hero-bg {
      position: absolute; inset: 0; z-index: 0;
      ${heroImage ? `background: url('${heroImage}') center/cover no-repeat;` : `background: linear-gradient(135deg, ${p.primary}15, ${p.secondary}15);`}
    }
    .hero-overlay {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(135deg, ${p.bg}dd 0%, ${p.bg}99 50%, ${p.primary}33 100%);
    }
    .hero-content { position: relative; z-index: 2; max-width: 720px; text-align: center; }
    .hero h1 { font-size: clamp(2.25rem, 6vw, 4.5rem); font-weight: 800; margin-bottom: 24px; letter-spacing: -0.03em; }
    .hero p { font-size: clamp(1rem, 2vw, 1.25rem); opacity: 0.8; margin-bottom: 40px; max-width: 560px; margin-left: auto; margin-right: auto; line-height: 1.7; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 16px 40px; background: var(--color-primary); color: #fff;
      border: none; border-radius: var(--radius-sm); font-size: 1.05rem; font-weight: 600;
      cursor: pointer; text-decoration: none;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      min-height: 52px;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px ${p.primary}40; }
    .btn:active { transform: translateY(0); }
    .btn-outline {
      background: transparent; color: var(--color-primary); border: 2px solid var(--color-primary);
    }
    .btn-outline:hover { background: var(--color-primary); color: #fff; }

    /* ── Section base ── */
    .section { padding: 96px 24px; }
    @media (max-width: 768px) { .section { padding: 64px 16px; } }
    .section-title { font-size: clamp(1.75rem, 4vw, 2.75rem); font-weight: 700; text-align: center; margin-bottom: 16px; letter-spacing: -0.02em; }
    .section-subtitle { text-align: center; opacity: 0.7; max-width: 560px; margin: 0 auto 56px; font-size: 1.05rem; }

    /* ── Services Grid ── */
    .services-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto;
    }
    @media (max-width: 1024px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .services-grid { grid-template-columns: 1fr; } }
    .card {
      padding: 32px; border-radius: var(--radius-md);
      background: var(--card-bg); border: 1px solid var(--card-border);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      will-change: transform;
    }
    .card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px ${p.primary}15; }
    .card-icon { width: 48px; height: 48px; margin-bottom: 20px; }
    .card-icon svg { width: 48px; height: 48px; }
    .card h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: var(--color-primary); }
    .card p { font-size: 0.95rem; opacity: 0.75; line-height: 1.6; }

    /* ── About ── */
    .about-grid { display: grid; grid-template-columns: 55fr 45fr; gap: 56px; align-items: center; max-width: 1200px; margin: 0 auto; }
    @media (max-width: 768px) { .about-grid { grid-template-columns: 1fr; gap: 32px; } }
    .about-text h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; margin-bottom: 24px; text-align: left; }
    .about-text p { opacity: 0.8; font-size: 1rem; margin-bottom: 16px; line-height: 1.8; }
    .about-image img { width: 100%; height: auto; border-radius: var(--radius-md); object-fit: cover; max-height: 420px; }

    /* ── Gallery ── */
    .gallery-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1200px; margin: 0 auto;
    }
    @media (max-width: 1024px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .gallery-grid { grid-template-columns: 1fr; } }
    .gallery-item { overflow: hidden; border-radius: var(--radius-sm); }
    .gallery-item img { width: 100%; height: 260px; object-fit: cover; transition: transform 0.4s ease, filter 0.4s ease; display: block; }
    .gallery-item:hover img { transform: scale(1.03); filter: brightness(1.05); }

    /* ── Contact ── */
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; max-width: 1000px; margin: 0 auto; }
    @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } }
    .contact-info h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
    .contact-info p { opacity: 0.75; margin-bottom: 20px; font-size: 0.95rem; }
    .contact-info a { color: var(--color-primary); text-decoration: none; }
    .contact-form { display: flex; flex-direction: column; gap: 16px; }
    .contact-form label { font-size: 0.875rem; font-weight: 500; margin-bottom: 4px; }
    .contact-form input, .contact-form textarea {
      width: 100%; padding: 14px 18px;
      background: var(--input-bg); border: 1px solid var(--card-border);
      border-radius: var(--radius-sm); color: var(--color-text); font-family: inherit; font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s; outline: none;
    }
    .contact-form input:focus, .contact-form textarea:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px ${p.primary}20; }
    .contact-form textarea { min-height: 120px; resize: vertical; }

    /* ── Footer ── */
    .footer {
      padding: 48px 24px; border-top: 1px solid var(--card-border);
    }
    .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 24px; }
    @media (max-width: 640px) { .footer-inner { flex-direction: column; text-align: center; } }
    .footer-logo { display: flex; align-items: center; gap: 12px; }
    .footer-logo .logo-img { height: 32px; }
    .footer-logo .logo-text { font-size: 1.2rem; }
    .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
    .footer-links a { color: var(--color-text); opacity: 0.6; text-decoration: none; font-size: 0.85rem; transition: opacity 0.2s; min-height: 44px; display: flex; align-items: center; }
    .footer-links a:hover { opacity: 1; }
    .footer-copy { width: 100%; text-align: center; opacity: 0.4; font-size: 0.8rem; padding-top: 24px; border-top: 1px solid var(--card-border); margin-top: 8px; }

    /* ── Animations ── */
    .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .fade-in.visible { opacity: 1; transform: translateY(0); }

    @keyframes hero-gradient { 0%,100% { opacity: 0.9; } 50% { opacity: 1; } }
    .hero-overlay { animation: hero-gradient 8s ease-in-out infinite; }

    /* ── Reduced Motion (Accessibility) ── */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      .fade-in { opacity: 1; transform: none; }
    }
  </style>
</head>
<body>
  <a href="#main-content" class="skip-link">Přeskočit na obsah</a>

  <header>
    <nav class="nav" id="navbar" aria-label="Hlavní navigace">
      <div class="nav-inner">
        <a href="#" class="logo-link">${logoHtml}</a>
        <div class="nav-links">
          ${servicesHtml ? '<a href="#services">Služby</a>' : ""}
          ${aboutText ? '<a href="#about">O nás</a>' : ""}
          ${galleryHtml ? '<a href="#gallery">Reference</a>' : ""}
          <a href="#contact">Kontakt</a>
        </div>
        <button class="hamburger" id="hamburgerBtn" aria-label="Otevřít menu" aria-expanded="false" aria-controls="mobileMenu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  </header>

  <div class="mobile-menu" id="mobileMenu" role="dialog" aria-label="Mobilní menu">
    <button class="mobile-close" id="mobileClose" aria-label="Zavřít menu">&times;</button>
    ${servicesHtml ? '<a href="#services" class="mobile-link">Služby</a>' : ""}
    ${aboutText ? '<a href="#about" class="mobile-link">O nás</a>' : ""}
    ${galleryHtml ? '<a href="#gallery" class="mobile-link">Reference</a>' : ""}
    <a href="#contact" class="mobile-link">Kontakt</a>
  </div>

  <main id="main-content">
    <section class="hero" id="hero">
      <div class="hero-bg" role="presentation"></div>
      <div class="hero-overlay" role="presentation"></div>
      <div class="hero-content fade-in">
        <h1>${escapeHtml(heroTitle)}</h1>
        ${heroSubtitle ? `<p>${escapeHtml(heroSubtitle.slice(0, 250))}</p>` : ""}
        <a href="#contact" class="btn">Kontaktujte nás &rarr;</a>
      </div>
    </section>

    ${servicesHtml ? `
    <section class="section" id="services">
      <div class="container">
        <h2 class="section-title fade-in">Naše služby</h2>
        <div class="services-grid">${servicesHtml}</div>
      </div>
    </section>
    ` : ""}

    ${aboutText ? `
    <section class="section" id="about" style="background: var(--card-bg);">
      <div class="container">
        <div class="about-grid">
          <div class="about-text fade-in">
            <h2>O ${escapeHtml(companyName)}</h2>
            <p>${escapeHtml(aboutText.slice(0, 500))}</p>
            <a href="#contact" class="btn" style="margin-top: 24px;">Zjistit více</a>
          </div>
          ${aboutImage ? `<div class="about-image fade-in"><img src="${aboutImage}" alt="O společnosti ${escapeHtml(companyName)}" loading="lazy" /></div>` : ""}
        </div>
      </div>
    </section>
    ` : ""}

    ${galleryHtml ? `
    <section class="section" id="gallery">
      <div class="container">
        <h2 class="section-title fade-in">Reference</h2>
        <div class="gallery-grid">${galleryHtml}</div>
      </div>
    </section>
    ` : ""}

    <section class="section" id="contact">
      <div class="container">
        <h2 class="section-title fade-in">Kontakt</h2>
        <div class="contact-grid">
          <div class="contact-info fade-in">
            <h3>${escapeHtml(companyName)}</h3>
            ${phone ? `<p>Tel: <a href="tel:${phone.replace(/\s/g, "")}">${escapeHtml(phone)}</a></p>` : ""}
            ${email ? `<p>Email: <a href="mailto:${email}">${escapeHtml(email)}</a></p>` : ""}
            <p><a href="${url}" target="_blank" rel="noopener noreferrer">${siteHost}</a></p>
          </div>
          <form class="contact-form fade-in" onsubmit="event.preventDefault();">
            <div>
              <label for="contact-name">Jméno</label>
              <input type="text" id="contact-name" name="name" autocomplete="name" required />
            </div>
            <div>
              <label for="contact-email">Email</label>
              <input type="email" id="contact-email" name="email" autocomplete="email" required />
            </div>
            <div>
              <label for="contact-message">Vaše zpráva</label>
              <textarea id="contact-message" name="message"></textarea>
            </div>
            <button type="submit" class="btn" style="width: 100%; justify-content: center;">Odeslat zprávu</button>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-logo">${logoHtml}</div>
      <nav class="footer-links" aria-label="Patička">
        ${servicesHtml ? '<a href="#services">Služby</a>' : ""}
        ${aboutText ? '<a href="#about">O nás</a>' : ""}
        <a href="#contact">Kontakt</a>
      </nav>
      <div class="footer-copy">&copy; ${year} ${escapeHtml(companyName)}. Redesign preview by Webflip.</div>
    </div>
  </footer>

  <script>
    // Navbar scroll effect — shrink + shadow
    window.addEventListener('scroll', function() {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });

    // Hamburger menu with accessibility
    var hamburger = document.getElementById('hamburgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileClose = document.getElementById('mobileClose');
    hamburger.addEventListener('click', function() {
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileClose.focus();
    });
    function closeMenu() {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.focus();
    }
    mobileClose.addEventListener('click', closeMenu);
    document.querySelectorAll('.mobile-link').forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });
    // Close menu on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });

    // Scroll-triggered fade-in with stagger (respects reduced-motion)
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.fade-in').forEach(function(el, i) {
        el.style.transitionDelay = (i % 6) * 0.08 + 's';
        observer.observe(el);
      });
    } else {
      // Show all elements immediately when reduced motion is preferred
      document.querySelectorAll('.fade-in').forEach(function(el) {
        el.classList.add('visible');
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function getServiceIcon(index: number, color: string): string {
  const icons = [
    `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="${color}" stroke-width="2" opacity="0.2"/><path d="M16 24l6 6 10-12" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none"><rect x="8" y="8" width="32" height="32" rx="8" stroke="${color}" stroke-width="2" opacity="0.2"/><circle cx="24" cy="24" r="8" stroke="${color}" stroke-width="2.5"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none"><path d="M24 8l16 28H8L24 8z" stroke="${color}" stroke-width="2" opacity="0.2"/><circle cx="24" cy="28" r="4" fill="${color}"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none"><rect x="4" y="14" width="40" height="20" rx="10" stroke="${color}" stroke-width="2" opacity="0.2"/><circle cx="34" cy="24" r="6" fill="${color}" opacity="0.5"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none"><path d="M12 12h24v24H12z" stroke="${color}" stroke-width="2" opacity="0.2" rx="4"/><path d="M18 24h12M24 18v12" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="${color}" stroke-width="2" opacity="0.2"/><path d="M24 14v10l7 7" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ];
  return icons[index % icons.length];
}
