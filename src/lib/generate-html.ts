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
  const content = crawledContent.slice(0, 15000);

  const results = await Promise.allSettled(
    variants.map((variant) =>
      generateSingleHtml(anthropic, analysis, variant, content, assets)
    )
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
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
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `You are a senior frontend developer at a top design agency. Generate a COMPLETE, PREMIUM standalone HTML landing page redesign for "${companyName}" (${analysis.url}).

This must look like a $10,000+ custom website — not a template or prototype.

${assetsSection}

## VARIANT: "${variant.name}"
${variant.description}

## DESIGN SYSTEM
- Primary: ${variant.palette.primary}
- Secondary: ${variant.palette.secondary}
- Accent: ${variant.palette.accent}
- Background: ${variant.palette.bg}
- Text: ${variant.palette.text}
- Heading font: "${variant.typography.heading}" (from Google Fonts)
- Body font: "${variant.typography.body}" (from Google Fonts)
- Layout: ${variant.layout}
- 8px spacing grid, max-width container 1200px

${variantInstructions}

## MANDATORY SECTIONS (in this exact order):

### 1. NAVIGATION (sticky/fixed)
- Logo (real image or company name) left-aligned
- Menu links right-aligned: Služby, O nás, Reference, Kontakt
- Hamburger menu on mobile (<768px) with JS toggle (slide-in overlay)
- Glass/blur backdrop effect
- Smooth scroll to section anchors

### 2. HERO (min-height: 60vh)
- Full-width with a gradient overlay over the client's first/best image
- Large heading with "${companyName}" or their main headline from crawled content
- Subtitle paragraph from real site content
- Prominent CTA button with hover animation
- Subtle parallax scroll effect via CSS transform on background

### 3. SERVICES / PRODUCTS
- 3-column grid on desktop, 1 column on mobile
- Each card: icon/decorative element, heading, description paragraph
- Content from the crawled site's service/product sections
- Box-shadow on cards, translateY hover lift effect
- Staggered fade-in animation on scroll

### 4. ABOUT / O NÁS
- Two-column layout: text content left, image right (use real client image)
- Stack vertically on mobile
- Real description text from the crawled content
- Optional stats/numbers row if available in content

### 5. GALLERY / REFERENCES
- Grid of real client images (use absolute URLs from assets)
- 3 columns desktop, 2 tablet, 1 mobile
- Images with border-radius and subtle hover scale effect
- Only include if images are available — otherwise skip this section entirely

### 6. CONTACT
- Two-column: contact info left, visual form right
- Show real phone, email, address from crawled content (if found)
- Form fields: Jméno, Email, Zpráva, submit button (visual only, no backend)
- Styled inputs with focus effects

### 7. FOOTER
- Company logo + name
- Navigation links repeated
- Contact info (phone, email, address)
- © ${new Date().getFullYear()} ${companyName}
- Social media icon placeholders (SVG circles)

## TECHNICAL REQUIREMENTS
1. <!DOCTYPE html> with charset, viewport, description meta tags
2. Google Fonts via <link> for heading + body fonts
3. ALL CSS in a single <style> tag — zero external CSS files
4. Fully responsive: breakpoints at 768px and 1280px
5. CSS animations: scroll-triggered fade-in (IntersectionObserver), hover transitions (transform, box-shadow), hero gradient animation
6. All JS inline in <script> at bottom — hamburger toggle, smooth scroll, IntersectionObserver for fade-in with stagger
7. Total HTML under 100KB — be efficient with CSS, don't repeat styles
8. 100% standalone — opens in any browser and looks complete

## ABSOLUTE RULES
- NEVER use placeholder text: no "Lorem ipsum", no "Your Company", no "Acme", no "example.com"
- NEVER use placeholder images: no placeholder.com, picsum.photos, unsplash.com, via.placeholder.com, placehold.co
- If you don't have real content for a section, SKIP IT — an empty section is better than fake content
- Every text, heading, and image URL must come from the crawled content or assets provided below
- Use the client's REAL company name everywhere

## CRAWLED CONTENT FROM ${analysis.url}:
${crawledContent}

## OUTPUT
Return ONLY the complete HTML. Start with <!DOCTYPE html>, end with </html>.
No markdown, no explanation, no code fences.`,
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
 */
function getVariantInstructions(variant: DesignVariant): string {
  const name = variant.name.toLowerCase();

  if (name.includes("corporate") || name.includes("clean") || name.includes("brand") || name.includes("faithful")) {
    return `## VARIANT STYLE: Corporate Clean
- Light background (#f8fafc or white), professional blue/gray palette
- Sans-serif fonts (clean, modern)
- Generous whitespace — let content breathe
- Subtle shadows and borders, no flashy effects
- Corporate, trustworthy, professional aesthetic
- Cards with light gray backgrounds and thin borders
- Hero: lighter gradient overlay, professional photography feel
- Button style: solid with subtle rounded corners`;
  }

  if (name.includes("modern") || name.includes("bold") || name.includes("edge") || name.includes("dark")) {
    return `## VARIANT STYLE: Modern Bold
- Dark hero section (near-black), bold accent colors
- Large typography with strong weight contrast (900 headings, 300 body)
- Geometric accent shapes or subtle patterns (CSS-only, no images)
- Vibrant gradient accents (e.g., primary→accent diagonal)
- Glassmorphism cards (backdrop-filter: blur, semi-transparent backgrounds)
- Hero: dramatic gradient overlay, big bold text
- Animated gradient borders on hover
- Modern startup/tech aesthetic
- Button style: gradient backgrounds with glow effect on hover`;
  }

  if (name.includes("elegant") || name.includes("minimal") || name.includes("luxury")) {
    return `## VARIANT STYLE: Elegant Minimal
- Narrow content container (max-width: 960px for most sections)
- Serif heading font (like Playfair Display or Cormorant Garamond)
- Muted, sophisticated color palette — cream/beige/soft whites
- Abundant whitespace — sections feel spacious and luxurious
- Thin lines and borders, minimal shadows
- Hero: clean, centered text with subtle background
- Images with generous margin and tasteful border
- Button style: outlined/ghost buttons or thin solid
- Luxury/editorial magazine feel`;
  }

  // Default conversion-focused
  return `## VARIANT STYLE: Conversion Focused
- Clear visual hierarchy — guide the eye to CTAs
- Prominent, contrasting CTA buttons (accent color, large)
- Trust signals: badges, stats, testimonial-style quotes
- Social proof elements if available in content
- Urgency elements (subtle, not spammy)
- Cards with stronger shadows and clear borders
- Hero: high-contrast with clear value proposition
- Sticky CTA consideration
- FAQ section if content available`;
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
  <title>${escapeHtml(companyName)} — ${variant.name}</title>
  ${assets?.favicon ? `<link rel="icon" href="${assets.favicon}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont}:wght@400;600;700;800;900&family=${bodyFont}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: "${variant.typography.body}", system-ui, -apple-system, sans-serif;
      background: ${p.bg};
      color: ${p.text};
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3, h4 { font-family: "${variant.typography.heading}", system-ui, sans-serif; line-height: 1.2; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    /* ── Navigation ── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      padding: 16px 24px;
      background: ${navBg};
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid ${cardBorder};
      transition: box-shadow 0.3s ease;
    }
    .nav.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.1); }
    .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo-img { height: 40px; width: auto; object-fit: contain; }
    .logo-text { font-family: "${variant.typography.heading}", sans-serif; font-weight: 800; font-size: 1.5rem; color: ${p.primary}; text-decoration: none; }
    .nav-links { display: flex; gap: 32px; align-items: center; }
    .nav-links a { color: ${p.text}; text-decoration: none; font-size: 0.9rem; font-weight: 500; opacity: 0.8; transition: opacity 0.2s, color 0.2s; }
    .nav-links a:hover { opacity: 1; color: ${p.primary}; }
    .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 8px; }
    .hamburger span { width: 24px; height: 2px; background: ${p.text}; border-radius: 2px; transition: transform 0.3s, opacity 0.3s; }
    .mobile-menu {
      display: none; position: fixed; inset: 0; z-index: 999;
      background: ${p.bg}f5; backdrop-filter: blur(24px);
      flex-direction: column; align-items: center; justify-content: center; gap: 32px;
    }
    .mobile-menu.open { display: flex; }
    .mobile-menu a { color: ${p.text}; text-decoration: none; font-size: 1.5rem; font-weight: 600; }
    .mobile-close { position: absolute; top: 24px; right: 24px; background: none; border: none; color: ${p.text}; font-size: 2rem; cursor: pointer; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hamburger { display: flex; }
    }

    /* ── Hero ── */
    .hero {
      min-height: 70vh; display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden; padding: 120px 24px 80px;
    }
    .hero-bg {
      position: absolute; inset: 0; z-index: 0;
      ${heroImage ? `background: url('${heroImage}') center/cover no-repeat;` : `background: linear-gradient(135deg, ${p.primary}15, ${p.secondary}15);`}
    }
    .hero-overlay {
      position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(135deg, ${p.bg}dd 0%, ${p.bg}99 50%, ${p.primary}33 100%);
    }
    .hero-content { position: relative; z-index: 2; max-width: 720px; text-align: center; }
    .hero h1 { font-size: clamp(2.25rem, 6vw, 4rem); font-weight: 800; margin-bottom: 24px; letter-spacing: -0.02em; }
    .hero p { font-size: clamp(1rem, 2vw, 1.25rem); opacity: 0.8; margin-bottom: 40px; max-width: 560px; margin-left: auto; margin-right: auto; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 16px 40px; background: ${p.primary}; color: #fff;
      border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 600;
      cursor: pointer; text-decoration: none;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      min-height: 52px;
    }
    .btn:hover { transform: translateY(-3px); box-shadow: 0 12px 40px ${p.primary}40; }
    .btn:active { transform: translateY(-1px); }
    .btn-outline {
      background: transparent; color: ${p.primary}; border: 2px solid ${p.primary};
    }
    .btn-outline:hover { background: ${p.primary}; color: #fff; }

    /* ── Section base ── */
    .section { padding: 96px 24px; }
    .section-title { font-size: clamp(1.75rem, 4vw, 2.75rem); font-weight: 700; text-align: center; margin-bottom: 16px; }
    .section-subtitle { text-align: center; opacity: 0.7; max-width: 560px; margin: 0 auto 56px; font-size: 1.05rem; }

    /* ── Services Grid ── */
    .services-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto;
    }
    @media (max-width: 1024px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .services-grid { grid-template-columns: 1fr; } }
    .card {
      padding: 32px; border-radius: 16px;
      background: ${cardBg}; border: 1px solid ${cardBorder};
      transition: transform 0.35s ease, box-shadow 0.35s ease;
    }
    .card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px ${p.primary}12; }
    .card-icon { width: 48px; height: 48px; margin-bottom: 20px; }
    .card-icon svg { width: 48px; height: 48px; }
    .card h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 12px; color: ${p.primary}; }
    .card p { font-size: 0.95rem; opacity: 0.75; line-height: 1.6; }

    /* ── About ── */
    .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; max-width: 1200px; margin: 0 auto; }
    @media (max-width: 768px) { .about-grid { grid-template-columns: 1fr; gap: 32px; } }
    .about-text h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 700; margin-bottom: 24px; text-align: left; }
    .about-text p { opacity: 0.8; font-size: 1rem; margin-bottom: 16px; }
    .about-image img { width: 100%; height: auto; border-radius: 16px; object-fit: cover; max-height: 420px; }

    /* ── Gallery ── */
    .gallery-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1200px; margin: 0 auto;
    }
    @media (max-width: 1024px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px) { .gallery-grid { grid-template-columns: 1fr; } }
    .gallery-item { overflow: hidden; border-radius: 12px; }
    .gallery-item img { width: 100%; height: 240px; object-fit: cover; transition: transform 0.5s ease; display: block; }
    .gallery-item:hover img { transform: scale(1.05); }

    /* ── Contact ── */
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; max-width: 1000px; margin: 0 auto; }
    @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr; } }
    .contact-info h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
    .contact-info p { opacity: 0.75; margin-bottom: 20px; font-size: 0.95rem; }
    .contact-info a { color: ${p.primary}; text-decoration: none; }
    .contact-form { display: flex; flex-direction: column; gap: 16px; }
    .contact-form input, .contact-form textarea {
      width: 100%; padding: 14px 18px;
      background: ${inputBg}; border: 1px solid ${cardBorder};
      border-radius: 10px; color: ${p.text}; font-family: inherit; font-size: 0.95rem;
      transition: border-color 0.2s, box-shadow 0.2s; outline: none;
    }
    .contact-form input:focus, .contact-form textarea:focus { border-color: ${p.primary}; box-shadow: 0 0 0 3px ${p.primary}20; }
    .contact-form textarea { min-height: 120px; resize: vertical; }

    /* ── Footer ── */
    .footer {
      padding: 48px 24px; border-top: 1px solid ${cardBorder};
    }
    .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 24px; }
    .footer-logo { display: flex; align-items: center; gap: 12px; }
    .footer-logo .logo-img { height: 32px; }
    .footer-logo .logo-text { font-size: 1.2rem; }
    .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
    .footer-links a { color: ${p.text}; opacity: 0.6; text-decoration: none; font-size: 0.85rem; transition: opacity 0.2s; }
    .footer-links a:hover { opacity: 1; }
    .footer-copy { width: 100%; text-align: center; opacity: 0.4; font-size: 0.8rem; padding-top: 24px; border-top: 1px solid ${cardBorder}; margin-top: 8px; }

    /* ── Animations ── */
    .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
    .fade-in.visible { opacity: 1; transform: translateY(0); }
    .fade-in-delay-1 { transition-delay: 0.1s; }
    .fade-in-delay-2 { transition-delay: 0.2s; }
    .fade-in-delay-3 { transition-delay: 0.3s; }
    .fade-in-delay-4 { transition-delay: 0.4s; }
    .fade-in-delay-5 { transition-delay: 0.5s; }

    @keyframes hero-gradient { 0%,100% { opacity: 0.9; } 50% { opacity: 1; } }
    .hero-overlay { animation: hero-gradient 8s ease-in-out infinite; }
  </style>
</head>
<body>
  <!-- Navigation -->
  <nav class="nav" id="navbar">
    <div class="nav-inner">
      <a href="#" class="logo-link">${logoHtml}</a>
      <div class="nav-links">
        ${servicesHtml ? '<a href="#services">Služby</a>' : ""}
        ${aboutText ? '<a href="#about">O nás</a>' : ""}
        ${galleryHtml ? '<a href="#gallery">Reference</a>' : ""}
        <a href="#contact">Kontakt</a>
      </div>
      <button class="hamburger" id="hamburgerBtn" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <!-- Mobile menu -->
  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-close" id="mobileClose">&times;</button>
    ${servicesHtml ? '<a href="#services" class="mobile-link">Služby</a>' : ""}
    ${aboutText ? '<a href="#about" class="mobile-link">O nás</a>' : ""}
    ${galleryHtml ? '<a href="#gallery" class="mobile-link">Reference</a>' : ""}
    <a href="#contact" class="mobile-link">Kontakt</a>
  </div>

  <!-- Hero -->
  <section class="hero" id="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content fade-in">
      <h1>${escapeHtml(heroTitle)}</h1>
      ${heroSubtitle ? `<p>${escapeHtml(heroSubtitle.slice(0, 250))}</p>` : ""}
      <a href="#contact" class="btn">Kontaktujte nás &rarr;</a>
    </div>
  </section>

  ${servicesHtml ? `
  <!-- Services -->
  <section class="section" id="services">
    <div class="container">
      <h2 class="section-title fade-in">Naše služby</h2>
      <div class="services-grid">${servicesHtml}</div>
    </div>
  </section>
  ` : ""}

  ${aboutText ? `
  <!-- About -->
  <section class="section" id="about" style="background: ${cardBg};">
    <div class="container">
      <div class="about-grid">
        <div class="about-text fade-in">
          <h2>O ${escapeHtml(companyName)}</h2>
          <p>${escapeHtml(aboutText.slice(0, 500))}</p>
          <a href="#contact" class="btn" style="margin-top: 24px;">Zjistit více</a>
        </div>
        ${aboutImage ? `<div class="about-image fade-in"><img src="${aboutImage}" alt="${escapeHtml(companyName)}" loading="lazy" /></div>` : ""}
      </div>
    </div>
  </section>
  ` : ""}

  ${galleryHtml ? `
  <!-- Gallery -->
  <section class="section" id="gallery">
    <div class="container">
      <h2 class="section-title fade-in">Reference</h2>
      <div class="gallery-grid">${galleryHtml}</div>
    </div>
  </section>
  ` : ""}

  <!-- Contact -->
  <section class="section" id="contact">
    <div class="container">
      <h2 class="section-title fade-in">Kontakt</h2>
      <div class="contact-grid">
        <div class="contact-info fade-in">
          <h3>${escapeHtml(companyName)}</h3>
          ${phone ? `<p>Tel: <a href="tel:${phone.replace(/\s/g, "")}">${escapeHtml(phone)}</a></p>` : ""}
          ${email ? `<p>Email: <a href="mailto:${email}">${escapeHtml(email)}</a></p>` : ""}
          <p><a href="${url}" target="_blank">${siteHost}</a></p>
        </div>
        <form class="contact-form fade-in" onsubmit="event.preventDefault();">
          <input type="text" placeholder="Jméno" required />
          <input type="email" placeholder="Email" required />
          <textarea placeholder="Vaše zpráva"></textarea>
          <button type="submit" class="btn" style="width: 100%; justify-content: center;">Odeslat zprávu</button>
        </form>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-logo">${logoHtml}</div>
      <div class="footer-links">
        ${servicesHtml ? '<a href="#services">Služby</a>' : ""}
        ${aboutText ? '<a href="#about">O nás</a>' : ""}
        <a href="#contact">Kontakt</a>
      </div>
      <div class="footer-copy">&copy; ${year} ${escapeHtml(companyName)}. Redesign preview by Webflip.</div>
    </div>
  </footer>

  <script>
    // Navbar scroll shadow
    window.addEventListener('scroll', function() {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
    });

    // Hamburger menu
    var hamburger = document.getElementById('hamburgerBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileClose = document.getElementById('mobileClose');
    hamburger.addEventListener('click', function() { mobileMenu.classList.add('open'); });
    mobileClose.addEventListener('click', function() { mobileMenu.classList.remove('open'); });
    document.querySelectorAll('.mobile-link').forEach(function(link) {
      link.addEventListener('click', function() { mobileMenu.classList.remove('open'); });
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });

    // Scroll-triggered fade-in with stagger
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in').forEach(function(el, i) {
      el.style.transitionDelay = (i % 6) * 0.08 + 's';
      observer.observe(el);
    });
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
