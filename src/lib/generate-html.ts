import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import type { DesignVariant, AnalysisRow, ExtractedAssets, BusinessProfile, SiteType } from "./supabase";
import { getHeroImage, type HeroImageResult } from "./hero-image";

// ── Template Data Interface ──

interface TemplateData {
  companyName: string;
  headline: string;
  subheadline: string;
  metaDescription: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  language: string;
  heroImageUrl: string;
  siteType: SiteType;
  navLinks: { text: string; href: string }[];
  services: { title: string; description: string; icon: string }[];
  aboutText: string;
  stats: { number: string; label: string }[];
  testimonials: { quote: string; author: string; role: string }[];
  faqItems: { question: string; answer: string }[];
  blogPosts: { title: string; excerpt: string; date: string; imageUrl: string }[];
  products: { name: string; description: string; price: string; imageUrl: string }[];
  gallery: { url: string; alt: string }[];
  socialLinks: string[];
  phone: string;
  email: string;
  address: string;
}

// ── Variant → Template File Mapping ──

function getTemplateFile(variantName: string): string {
  const name = variantName.toLowerCase();
  if (name.includes("corporate") || name.includes("clean") || name.includes("brand") || name.includes("faithful")) {
    return "corporate-clean.html";
  }
  if (name.includes("modern") || name.includes("bold") || name.includes("edge") || name.includes("dark")) {
    return "modern-bold.html";
  }
  if (name.includes("elegant") || name.includes("minimal") || name.includes("luxury")) {
    return "elegant-minimal.html";
  }
  // Default fallback
  return "corporate-clean.html";
}

// ── Main Export ──

export async function generateHtmlVariants(
  analysis: Pick<AnalysisRow, "url" | "score_performance" | "score_seo" | "score_security" | "score_ux" | "score_content" | "score_overall">,
  variants: DesignVariant[],
  crawledContent: string,
  assets?: ExtractedAssets | null,
  businessProfile?: BusinessProfile | null
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const anthropic = new Anthropic({ apiKey });
  const content = crawledContent.slice(0, 20000);

  // Run content extraction + hero image search in parallel
  let templateData: TemplateData;
  let heroImage: HeroImageResult | null = null;

  const [contentResult, heroResult] = await Promise.allSettled([
    extractStructuredContent(anthropic, analysis.url, content, assets, businessProfile),
    getHeroImage(businessProfile, assets),
  ]);

  if (contentResult.status === "fulfilled") {
    templateData = contentResult.value;
  } else {
    console.error("[generate-html] Content extraction failed:", contentResult.reason);
    templateData = buildFallbackTemplateData(analysis.url, content, assets);
  }

  if (heroResult.status === "fulfilled") {
    heroImage = heroResult.value;
    console.log(`[generate-html] Hero image source: ${heroImage.source}`);
  }

  // Override hero image — use generated/stock image instead of original site's baked-text hero
  if (heroImage && heroImage.source !== "original") {
    templateData.heroImageUrl = heroImage.url;
  }

  // Fill each variant's template
  const results = variants.map((variant) => {
    try {
      const templateFile = getTemplateFile(variant.name);
      const templatePath = path.join(process.cwd(), "src/templates", templateFile);
      const template = fs.readFileSync(templatePath, "utf-8");

      // Override primaryColor with variant's palette
      const variantData: TemplateData = {
        ...templateData,
        primaryColor: variant.palette.primary,
      };

      // Build dynamic navLinks from sections with actual content
      variantData.navLinks = buildDynamicNavLinks(variantData);

      let html = fillTemplate(template, variantData);
      html = postProcessHtml(html, variant);

      // Inject Unsplash attribution if applicable
      if (heroImage?.source === "unsplash" && heroImage.photographer) {
        const attrHtml = `<a href="${heroImage.photographerUrl || '#'}?utm_source=webflip&utm_medium=referral" target="_blank" rel="noopener noreferrer" style="position:absolute;bottom:0.75rem;right:1rem;z-index:20;font-size:0.625rem;color:rgba(255,255,255,0.5);text-decoration:none;font-family:system-ui">Photo: ${heroImage.photographer} / Unsplash</a>`;
        html = html.replace(/<\/section>\s*(?=\s*<main)/, `${attrHtml}</section>\n`);
      }

      html = injectTheftProtection(html);
      return validateHtml(html, variantData.companyName);
    } catch (err) {
      console.error(`[generate-html] Template fill failed for ${variant.name}:`, err);
      return buildFallbackHtml(variant, analysis.url, content, assets);
    }
  });

  return results;
}

// ── Content Extraction via Haiku ──

async function extractStructuredContent(
  anthropic: Anthropic,
  url: string,
  crawledContent: string,
  assets?: ExtractedAssets | null,
  businessProfile?: BusinessProfile | null
): Promise<TemplateData> {
  let siteHost: string;
  try { siteHost = new URL(url).hostname; } catch { siteHost = url; }
  const companyName = assets?.companyName || siteHost;

  // Build business intelligence context for the prompt
  const businessContext = businessProfile
    ? buildBusinessContext(businessProfile)
    : "";

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a content extraction specialist. Analyze this crawled website content and extract structured data for a website redesign.

COMPANY: "${companyName}" (${url})
${businessContext}
CRAWLED CONTENT:
${crawledContent}

AVAILABLE ASSETS:
- Logo: ${assets?.logo || "none"}
- Favicon: ${assets?.favicon || "none"}
- Images: ${(assets?.images || []).slice(0, 15).map(img => img.url).join(", ") || "none"}
- Phone: ${assets?.phoneNumbers?.join(", ") || "none"}
- Email: ${assets?.emails?.join(", ") || "none"}
- Address: ${assets?.address || "none"}
- Social Links: ${assets?.socialLinks?.join(", ") || "none"}
- Nav Links: ${(assets?.navLinks || []).map(l => `${l.text}: ${l.href}`).join(", ") || "none"}

INSTRUCTIONS:
CRITICAL LANGUAGE RULE: ${businessProfile ? `The detected language is "${businessProfile.language}".` : "Detect the website language (cs/en/de/sk)."} Every single piece of text you output — headlines, descriptions, blog titles, FAQ questions and answers, testimonial quotes, stat labels, navLink texts — MUST be in that language. ZERO English text is acceptable when the language is not "en". This includes ALL generated content like blog posts, FAQ items, and testimonials.

1. Extract ALL real content from the crawled data — NEVER invent placeholder text for services/about/stats
2. Blog posts: Extract ONLY real blog posts/articles found in the crawled content. If no real articles exist, return an EMPTY blogPosts array []. NEVER generate fictional blog posts — only use real articles from the crawled website.
3. Generate 5-8 FAQ items — ${businessProfile
  ? `use these seed topics based on real customer questions: ${businessProfile.faqSeedTopics.slice(0, 6).join("; ")}. Answers MUST reference "${companyName}"'s actual services (${businessProfile.coreServices.slice(0, 3).map(s => s.name).join(", ")}) and value propositions (${businessProfile.valuePropositions.slice(0, 2).join("; ")}). Address pain points: ${businessProfile.painPointsSolved.slice(0, 3).join("; ")}`
  : "relevant to the company's services, in the detected language"}
4. Extract real stats/numbers if present (years, clients, projects, satisfaction)${businessProfile?.keyBusinessClaims.length ? ` — known claims: ${businessProfile.keyBusinessClaims.slice(0, 4).join("; ")}` : ""}
5. ALWAYS generate at least 3 realistic client testimonials with name, role/company, and review text in the site language. If real testimonials exist in the crawled content, use those. Otherwise create realistic ones that reference specific services of "${companyName}". Never leave testimonials empty.
6. Use real service/product names and descriptions from the crawled content
7. For service icons, use one of: briefcase, chart, shield, globe, users, code, heart, star, lightbulb, target
8. navLinks must include anchor links to ALL sections present on the page (services, about, gallery, blog, testimonials, faq, contact). Use #section-id format. The text of each navLink MUST be in the detected language.
${businessProfile ? `9. The headline/subheadline should reflect the core value proposition: ${businessProfile.valuePropositions[0] || businessProfile.summary}` : ""}

8b. Products: Extract ONLY real physical/digital products found in the crawled content (name, description, price, image URL). Products are things people BUY — NOT navigation pages like "Home", "About Us", "Products". If no real products exist, return an EMPTY products array []. NEVER put page names or navigation items into products.
8c. For blog posts: ONLY extract real articles found in the crawled content. Return empty blogPosts[] if no real articles exist. NEVER generate fictional articles.
8d. Social links: Extract ALL real social media URLs from the site (LinkedIn, YouTube, Facebook, Instagram, Twitter/X, etc.). Use the FULL URLs found in the crawled content. NEVER use placeholder social URLs.

Return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:
{
  "companyName": "string",
  "headline": "string - main heading from site or company tagline",
  "subheadline": "string - subtitle or company description",
  "metaDescription": "string - SEO meta description",
  "language": "cs|en|de|sk",
  "navLinks": [{"text": "string", "href": "#section-id"}],
  "services": [{"title": "string", "description": "string", "icon": "string"}],
  "aboutText": "string - about company paragraph",
  "stats": [{"number": "string like 15+ or 98%", "label": "string"}],
  "testimonials": [{"quote": "string", "author": "string", "role": "string"}],
  "faqItems": [{"question": "string", "answer": "string"}],
  "blogPosts": [{"title": "string", "excerpt": "string", "date": "string like 2024-01-15", "imageUrl": "string or empty"}],
  "products": [{"name": "string", "description": "string", "price": "string or empty", "imageUrl": "string or empty"}],
  "gallery": [{"url": "string absolute URL", "alt": "string"}],
  "socialLinks": ["url strings"],
  "phone": "string",
  "email": "string",
  "address": "string"
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON response — handle potential code fences
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error("[generate-html] Failed to parse Haiku response as JSON, using fallback");
    return buildFallbackTemplateData(url, "", assets);
  }

  // Use ONLY real blog posts from crawled data — never generated content
  let blogPosts: TemplateData["blogPosts"] = [];
  if (assets?.blogPosts && assets.blogPosts.length >= 2) {
    blogPosts = assets.blogPosts.slice(0, 6).map(bp => ({
      title: bp.title,
      excerpt: bp.excerpt || "",
      date: bp.date || new Date().toISOString().slice(0, 10),
      imageUrl: bp.featuredImage || "",
    }));
  }
  // If no real blog posts from crawl, blog section will be hidden via IF:blogPosts

  // Use real products from crawled data if available
  let products: TemplateData["products"] = [];
  if (assets?.products && assets.products.length > 0) {
    products = assets.products.slice(0, 12).map(p => ({
      name: p.name,
      description: p.description || "",
      price: p.price || "",
      imageUrl: p.imageUrl || "",
    }));
  } else if (Array.isArray(parsed.products)) {
    // Filter out nav-link-like entries that LLM sometimes injects (Home, About Us, etc.)
    const navLikeNames = new Set(["home", "about", "about us", "contact", "blog", "services", "products", "gallery", "faq", "testimonials"]);
    products = (parsed.products as Array<Record<string, string>>)
      .filter(p => p.name && !navLikeNames.has(p.name.toLowerCase().trim()))
      .map(p => ({
        name: p.name || "",
        description: p.description || "",
        price: p.price || "",
        imageUrl: p.imageUrl || "",
      }));
  }

  // Build TemplateData from parsed response, with fallbacks
  return {
    companyName: (parsed.companyName as string) || companyName,
    headline: (parsed.headline as string) || companyName,
    subheadline: (parsed.subheadline as string) || "",
    metaDescription: (parsed.metaDescription as string) || assets?.metaDescription || "",
    logoUrl: assets?.logo || "",
    faviconUrl: assets?.favicon || "",
    primaryColor: "#1B2A4A",
    language: (parsed.language as string) || "en",
    heroImageUrl: assets?.heroImageUrl || "",
    siteType: assets?.siteType || "corporate",
    navLinks: Array.isArray(parsed.navLinks) ? parsed.navLinks as TemplateData["navLinks"] : assets?.navLinks || [],
    services: Array.isArray(parsed.services) ? parsed.services as TemplateData["services"] : [],
    aboutText: (parsed.aboutText as string) || "",
    stats: Array.isArray(parsed.stats) ? parsed.stats as TemplateData["stats"] : [],
    testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials as TemplateData["testimonials"] : [],
    faqItems: Array.isArray(parsed.faqItems) ? parsed.faqItems as TemplateData["faqItems"] : [],
    blogPosts,
    products,
    gallery: Array.isArray(parsed.gallery)
      ? parsed.gallery as TemplateData["gallery"]
      : (assets?.images || []).filter(img => img.context !== "icon" && img.context !== "logo").slice(0, 8).map(img => ({ url: img.url, alt: img.alt || companyName })),
    socialLinks: Array.isArray(parsed.socialLinks) ? parsed.socialLinks as string[] : assets?.socialLinks || [],
    phone: (parsed.phone as string) || assets?.phoneNumbers?.[0] || "",
    email: (parsed.email as string) || assets?.emails?.[0] || "",
    address: (parsed.address as string) || assets?.address || "",
  };
}

// ── Template i18n Translations ──

const TRANSLATIONS: Record<string, Record<string, string>> = {
  section_products: { cs: 'Naše produkty', sk: 'Naše produkty', en: 'Our Products', de: 'Unsere Produkte' },
  section_services: { cs: 'Naše služby', sk: 'Naše služby', en: 'Our Services', de: 'Unsere Dienstleistungen' },
  section_about: { cs: 'O nás', sk: 'O nás', en: 'About Us', de: 'Über uns' },
  section_blog: { cs: 'Nejnovější články', sk: 'Najnovšie články', en: 'Latest Insights', de: 'Neuigkeiten' },
  section_testimonials: { cs: 'Reference klientů', sk: 'Referencie klientov', en: 'Client Testimonials', de: 'Kundenstimmen' },
  section_faq: { cs: 'Časté dotazy', sk: 'Časté otázky', en: 'FAQ', de: 'Häufige Fragen' },
  section_gallery: { cs: 'Naše galerie', sk: 'Naša galéria', en: 'Our Gallery', de: 'Unsere Galerie' },
  section_contact: { cs: 'Kontaktujte nás', sk: 'Kontaktujte nás', en: 'Get in Touch', de: 'Kontaktieren Sie uns' },
  section_map: { cs: 'Kde nás najdete', sk: 'Kde nás nájdete', en: 'Find Us', de: 'So finden Sie uns' },
  cta_services: { cs: 'Naše služby', sk: 'Naše služby', en: 'Our Services', de: 'Unsere Dienste' },
  cta_learn_more: { cs: 'Zjistit více', sk: 'Zistiť viac', en: 'Learn More', de: 'Mehr erfahren' },
  cta_read_more: { cs: 'Číst dále', sk: 'Čítať ďalej', en: 'Read More', de: 'Weiterlesen' },
  cta_contact: { cs: 'Kontaktujte nás', sk: 'Kontaktujte nás', en: 'Contact Us', de: 'Kontakt' },
  cta_send_message: { cs: 'Odeslat zprávu', sk: 'Odoslať správu', en: 'Send Message', de: 'Nachricht senden' },
  nav_products: { cs: 'Produkty', sk: 'Produkty', en: 'Products', de: 'Produkte' },
  nav_services: { cs: 'Služby', sk: 'Služby', en: 'Services', de: 'Dienstleistungen' },
  nav_about: { cs: 'O nás', sk: 'O nás', en: 'About', de: 'Über uns' },
  nav_blog: { cs: 'Blog', sk: 'Blog', en: 'Blog', de: 'Blog' },
  nav_testimonials: { cs: 'Reference', sk: 'Referencie', en: 'Testimonials', de: 'Referenzen' },
  nav_faq: { cs: 'Časté dotazy', sk: 'Časté otázky', en: 'FAQ', de: 'FAQ' },
  nav_gallery: { cs: 'Galerie', sk: 'Galéria', en: 'Gallery', de: 'Galerie' },
  nav_contact: { cs: 'Kontakt', sk: 'Kontakt', en: 'Contact', de: 'Kontakt' },
  label_what_we_do: { cs: 'Co děláme', sk: 'Čo robíme', en: 'What We Do', de: 'Was wir tun' },
  label_latest_updates: { cs: 'Aktuality', sk: 'Aktuality', en: 'Latest Updates', de: 'Neuigkeiten' },
  label_contact_info: { cs: 'Kontaktní údaje', sk: 'Kontaktné údaje', en: 'Contact Information', de: 'Kontaktdaten' },
  label_phone: { cs: 'Telefon', sk: 'Telefón', en: 'Phone', de: 'Telefon' },
  label_email: { cs: 'E-mail', sk: 'E-mail', en: 'Email', de: 'E-Mail' },
  label_address: { cs: 'Adresa', sk: 'Adresa', en: 'Address', de: 'Adresse' },
  label_send_message: { cs: 'Napište nám', sk: 'Napíšte nám', en: 'Send Us a Message', de: 'Schreiben Sie uns' },
  label_full_name: { cs: 'Celé jméno', sk: 'Celé meno', en: 'Full Name', de: 'Vollständiger Name' },
  label_email_address: { cs: 'E-mailová adresa', sk: 'E-mailová adresa', en: 'Email Address', de: 'E-Mail-Adresse' },
  label_phone_number: { cs: 'Telefonní číslo', sk: 'Telefónne číslo', en: 'Phone Number', de: 'Telefonnummer' },
  label_subject: { cs: 'Předmět', sk: 'Predmet', en: 'Subject', de: 'Betreff' },
  label_message: { cs: 'Zpráva', sk: 'Správa', en: 'Message', de: 'Nachricht' },
  label_quick_links: { cs: 'Rychlé odkazy', sk: 'Rýchle odkazy', en: 'Quick Links', de: 'Schnelllinks' },
  label_navigation: { cs: 'Navigace', sk: 'Navigácia', en: 'Navigation', de: 'Navigation' },
  label_connect: { cs: 'Spojte se s námi', sk: 'Spojte sa s nami', en: 'Connect', de: 'Verbinden' },
  placeholder_name: { cs: 'Vaše celé jméno', sk: 'Vaše celé meno', en: 'Your full name', de: 'Ihr vollständiger Name' },
  placeholder_email: { cs: 'vas@email.cz', sk: 'vas@email.sk', en: 'your@email.com', de: 'ihre@email.de' },
  placeholder_phone: { cs: 'Vaše telefonní číslo', sk: 'Vaše telefónne číslo', en: 'Your phone number', de: 'Ihre Telefonnummer' },
  placeholder_message: { cs: 'Jak vám můžeme pomoci?', sk: 'Ako vám môžeme pomôcť?', en: 'How can we help you?', de: 'Wie können wir Ihnen helfen?' },
  select_subject: { cs: 'Vyberte předmět', sk: 'Vyberte predmet', en: 'Select a subject', de: 'Betreff wählen' },
  select_general: { cs: 'Obecný dotaz', sk: 'Všeobecný dotaz', en: 'General Inquiry', de: 'Allgemeine Anfrage' },
  select_consultation: { cs: 'Konzultace', sk: 'Konzultácia', en: 'Consultation', de: 'Beratung' },
  select_services: { cs: 'Služby', sk: 'Služby', en: 'Services', de: 'Dienstleistungen' },
  select_other: { cs: 'Jiné', sk: 'Iné', en: 'Other', de: 'Sonstiges' },
  subtitle_products: { cs: 'Naše nejoblíbenější produkty a řešení', sk: 'Naše najobľúbenejšie produkty a riešenia', en: 'Our most popular products and solutions', de: 'Unsere beliebtesten Produkte und Lösungen' },
  subtitle_services: { cs: 'Pečlivě připravená řešení pro váš úspěch', sk: 'Starostlivo pripravené riešenia pre váš úspech', en: 'Carefully crafted solutions for your success', de: 'Sorgfältig erarbeitete Lösungen für Ihren Erfolg' },
  subtitle_about: { cs: 'Náš příběh a hodnoty', sk: 'Náš príbeh a hodnoty', en: 'Our story and values', de: 'Unsere Geschichte und Werte' },
  subtitle_blog: { cs: 'Novinky a aktuální informace', sk: 'Novinky a aktuálne informácie', en: 'News and latest updates', de: 'Neuigkeiten und aktuelle Informationen' },
  subtitle_testimonials: { cs: 'Co o nás říkají naši klienti', sk: 'Čo o nás hovoria naši klienti', en: 'Hear what our clients say about working with us', de: 'Was unsere Kunden über uns sagen' },
  subtitle_faq: { cs: 'Odpovědi na nejčastější dotazy ohledně našich služeb', sk: 'Odpovede na najčastejšie otázky o našich službách', en: 'Find answers to the most common questions about our services', de: 'Antworten auf die häufigsten Fragen zu unseren Dienstleistungen' },
  subtitle_gallery: { cs: 'Přehled našich prací a projektů', sk: 'Prehľad našich prác a projektov', en: 'A visual showcase of our work and projects', de: 'Ein visueller Überblick unserer Arbeiten und Projekte' },
  subtitle_contact: { cs: 'Rádi od vás uslyšíme. Kontaktujte nás a společně najdeme řešení.', sk: 'Radi od vás počujeme. Kontaktujte nás a spoločne nájdeme riešenie.', en: 'We would love to hear from you. Reach out and let us discuss how we can help.', de: 'Wir freuen uns auf Ihre Nachricht. Kontaktieren Sie uns.' },
  subtitle_map: { cs: 'Navštivte nás nebo si zobrazte trasu na mapě', sk: 'Navštívte nás alebo si zobrazte trasu na mape', en: 'Visit us at our office or get directions using the map below', de: 'Besuchen Sie uns oder nutzen Sie die Karte für die Wegbeschreibung' },
  cookie_text: { cs: 'Používáme cookies ke zlepšení vašeho zážitku z prohlížení, poskytování personalizovaného obsahu a analýze návštěvnosti. Kliknutím na \u201ePřijmout\u201c souhlasíte s používáním cookies.', sk: 'Používame cookies na zlepšenie vášho zážitku z prehliadania, poskytovanie personalizovaného obsahu a analýzu návštevnosti. Kliknutím na \u201ePrijať\u201c súhlasíte s používaním cookies.', en: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking \u201cAccept\u201d, you consent to our use of cookies.', de: 'Wir verwenden Cookies, um Ihr Browsing-Erlebnis zu verbessern, personalisierte Inhalte bereitzustellen und unseren Datenverkehr zu analysieren. Durch Klicken auf \u201eAkzeptieren\u201c stimmen Sie der Verwendung von Cookies zu.' },
  cookie_accept: { cs: 'Přijmout', sk: 'Prijať', en: 'Accept', de: 'Akzeptieren' },
  cookie_decline: { cs: 'Odmítnout', sk: 'Odmietnuť', en: 'Decline', de: 'Ablehnen' },
  footer_rights: { cs: 'Všechna práva vyhrazena.', sk: 'Všetky práva vyhradené.', en: 'All rights reserved.', de: 'Alle Rechte vorbehalten.' },
  skip_to_content: { cs: 'Přeskočit na obsah', sk: 'Preskočiť na obsah', en: 'Skip to main content', de: 'Zum Inhalt springen' },
  scroll_down: { cs: 'Posunout dolů', sk: 'Posunúť nadol', en: 'Scroll down', de: 'Nach unten scrollen' },
};

function tt(key: string, lang: string): string {
  return TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.['en'] || key;
}

// ── Template Filling ──

function fillTemplate(template: string, data: TemplateData): string {
  let html = template;

  // 1. Set html lang attribute
  html = html.replace(/lang="TEMPLATE_VAR_language"/g, `lang="${escapeAttr(data.language)}"`);

  // 2. Handle conditional sections — <!-- IF:name -->...<!-- /IF:name -->
  const conditionalFields: Record<string, string> = {
    address: data.address,
    heroImage: data.heroImageUrl,
    products: data.products.length >= 2 ? "true" : "",
    blogPosts: data.blogPosts.length >= 2 ? "true" : "",
    stats: data.stats.length >= 1 ? "true" : "",
    testimonials: data.testimonials.length >= 1 ? "true" : "",
    faqItems: data.faqItems.length >= 1 ? "true" : "",
    gallery: data.gallery.length >= 3 ? "true" : "",
    services: data.services.length >= 2 ? "true" : "",
  };
  for (const [field, value] of Object.entries(conditionalFields)) {
    const ifRegex = new RegExp(`<!-- IF:${field} -->([\\s\\S]*?)<!-- /IF:${field} -->`, "g");
    if (value && value.trim()) {
      // Keep the content, remove markers
      html = html.replace(ifRegex, "$1");
    } else {
      // Remove the entire conditional block
      html = html.replace(ifRegex, "");
    }
  }

  // 3. Handle repeating sections — <!-- REPEAT:name -->...<!-- /REPEAT:name -->
  const repeatSections: Record<string, Record<string, string>[]> = {
    stats: data.stats.map(s => ({
      TEMPLATE_VAR_statNumber: escapeHtml(s.number),
      TEMPLATE_VAR_statLabel: escapeHtml(s.label),
    })),
    services: data.services.map(s => ({
      TEMPLATE_VAR_serviceTitle: escapeHtml(s.title),
      TEMPLATE_VAR_serviceDescription: escapeHtml(s.description),
      TEMPLATE_VAR_serviceIcon: getServiceIconSvg(s.icon),
    })),
    testimonials: data.testimonials.map(t => ({
      TEMPLATE_VAR_testimonialQuote: escapeHtml(t.quote),
      TEMPLATE_VAR_testimonialAuthor: escapeHtml(t.author),
      TEMPLATE_VAR_testimonialRole: escapeHtml(t.role),
    })),
    faqItems: data.faqItems.map(f => ({
      TEMPLATE_VAR_faqQuestion: escapeHtml(f.question),
      TEMPLATE_VAR_faqAnswer: escapeHtml(f.answer),
    })),
    blogPosts: data.blogPosts.map(b => ({
      TEMPLATE_VAR_blogTitle: escapeHtml(b.title),
      TEMPLATE_VAR_blogExcerpt: escapeHtml(b.excerpt),
      TEMPLATE_VAR_blogDate: escapeHtml(b.date),
      TEMPLATE_VAR_blogImageUrl: b.imageUrl || "",
    })),
    products: data.products.map(p => ({
      TEMPLATE_VAR_productName: escapeHtml(p.name),
      TEMPLATE_VAR_productDescription: escapeHtml(p.description),
      TEMPLATE_VAR_productPrice: escapeHtml(p.price),
      TEMPLATE_VAR_productImageUrl: p.imageUrl || "",
    })),
    gallery: data.gallery.map(g => ({
      TEMPLATE_VAR_galleryUrl: g.url,
      TEMPLATE_VAR_galleryAlt: escapeHtml(g.alt),
    })),
    socialLinks: data.socialLinks.map(url => ({
      TEMPLATE_VAR_socialUrl: url,
      TEMPLATE_VAR_socialIcon: getSocialIconSvg(url),
      TEMPLATE_VAR_socialLabel: getSocialLabel(url),
    })),
    navLinks: data.navLinks.map(l => ({
      TEMPLATE_VAR_navText: escapeHtml(l.text),
      TEMPLATE_VAR_navHref: escapeAttr(l.href),
    })),
  };

  for (const [sectionName, items] of Object.entries(repeatSections)) {
    const repeatRegex = new RegExp(
      `<!-- REPEAT:${sectionName} -->([\\s\\S]*?)<!-- /REPEAT:${sectionName} -->`,
      "g"
    );

    html = html.replace(repeatRegex, (_match, itemTemplate: string) => {
      if (items.length === 0) return "";
      return items.map((item) => {
        let itemHtml = itemTemplate;
        for (const [key, value] of Object.entries(item)) {
          itemHtml = itemHtml.replace(new RegExp(key, "g"), value);
        }
        return itemHtml;
      }).join("\n");
    });
  }

  // 4. Replace scalar template variables
  const lang = data.language || 'en';
  const scalarReplacements: Record<string, string> = {
    TEMPLATE_VAR_companyName: escapeHtml(data.companyName),
    TEMPLATE_VAR_headline: escapeHtmlLight(data.headline),
    TEMPLATE_VAR_subheadline: escapeHtmlLight(data.subheadline),
    TEMPLATE_VAR_metaDescription: escapeAttr(data.metaDescription),
    TEMPLATE_VAR_logoUrl: data.logoUrl,
    TEMPLATE_VAR_faviconUrl: data.faviconUrl,
    TEMPLATE_VAR_primaryColor: data.primaryColor,
    TEMPLATE_VAR_language: data.language,
    TEMPLATE_VAR_heroImageUrl: data.heroImageUrl,
    TEMPLATE_VAR_phone: escapeHtml(data.phone),
    TEMPLATE_VAR_email: escapeHtml(data.email),
    TEMPLATE_VAR_address: escapeHtml(data.address),
    TEMPLATE_VAR_aboutText: escapeHtml(data.aboutText),
    TEMPLATE_VAR_year: String(new Date().getFullYear()),
    // i18n translations
    TEMPLATE_VAR_section_products: tt('section_products', lang),
    TEMPLATE_VAR_section_services: tt('section_services', lang),
    TEMPLATE_VAR_section_about: tt('section_about', lang),
    TEMPLATE_VAR_section_blog: tt('section_blog', lang),
    TEMPLATE_VAR_section_testimonials: tt('section_testimonials', lang),
    TEMPLATE_VAR_section_faq: tt('section_faq', lang),
    TEMPLATE_VAR_section_gallery: tt('section_gallery', lang),
    TEMPLATE_VAR_section_contact: tt('section_contact', lang),
    TEMPLATE_VAR_cta_services: tt('cta_services', lang),
    TEMPLATE_VAR_cta_learn_more: tt('cta_learn_more', lang),
    TEMPLATE_VAR_cta_read_more: tt('cta_read_more', lang),
    TEMPLATE_VAR_cta_contact: tt('cta_contact', lang),
    TEMPLATE_VAR_nav_services: tt('nav_services', lang),
    TEMPLATE_VAR_nav_about: tt('nav_about', lang),
    TEMPLATE_VAR_nav_blog: tt('nav_blog', lang),
    TEMPLATE_VAR_nav_testimonials: tt('nav_testimonials', lang),
    TEMPLATE_VAR_nav_faq: tt('nav_faq', lang),
    TEMPLATE_VAR_nav_gallery: tt('nav_gallery', lang),
    TEMPLATE_VAR_nav_contact: tt('nav_contact', lang),
    TEMPLATE_VAR_label_what_we_do: tt('label_what_we_do', lang),
    TEMPLATE_VAR_label_latest_updates: tt('label_latest_updates', lang),
    TEMPLATE_VAR_label_contact_info: tt('label_contact_info', lang),
    TEMPLATE_VAR_label_phone: tt('label_phone', lang),
    TEMPLATE_VAR_label_email: tt('label_email', lang),
    TEMPLATE_VAR_label_address: tt('label_address', lang),
    TEMPLATE_VAR_label_send_message: tt('label_send_message', lang),
    TEMPLATE_VAR_label_full_name: tt('label_full_name', lang),
    TEMPLATE_VAR_label_email_address: tt('label_email_address', lang),
    TEMPLATE_VAR_label_phone_number: tt('label_phone_number', lang),
    TEMPLATE_VAR_label_subject: tt('label_subject', lang),
    TEMPLATE_VAR_label_message: tt('label_message', lang),
    TEMPLATE_VAR_label_quick_links: tt('label_quick_links', lang),
    TEMPLATE_VAR_label_navigation: tt('label_navigation', lang),
    TEMPLATE_VAR_label_connect: tt('label_connect', lang),
    TEMPLATE_VAR_placeholder_name: tt('placeholder_name', lang),
    TEMPLATE_VAR_placeholder_email: tt('placeholder_email', lang),
    TEMPLATE_VAR_placeholder_phone: tt('placeholder_phone', lang),
    TEMPLATE_VAR_placeholder_message: tt('placeholder_message', lang),
    TEMPLATE_VAR_select_subject: tt('select_subject', lang),
    TEMPLATE_VAR_select_general: tt('select_general', lang),
    TEMPLATE_VAR_select_consultation: tt('select_consultation', lang),
    TEMPLATE_VAR_select_services: tt('select_services', lang),
    TEMPLATE_VAR_select_other: tt('select_other', lang),
    TEMPLATE_VAR_subtitle_products: tt('subtitle_products', lang),
    TEMPLATE_VAR_nav_products: tt('nav_products', lang),
    TEMPLATE_VAR_subtitle_services: tt('subtitle_services', lang),
    TEMPLATE_VAR_subtitle_about: tt('subtitle_about', lang),
    TEMPLATE_VAR_subtitle_blog: tt('subtitle_blog', lang),
    TEMPLATE_VAR_subtitle_testimonials: tt('subtitle_testimonials', lang),
    TEMPLATE_VAR_subtitle_faq: tt('subtitle_faq', lang),
    TEMPLATE_VAR_subtitle_gallery: tt('subtitle_gallery', lang),
    TEMPLATE_VAR_subtitle_contact: tt('subtitle_contact', lang),
    TEMPLATE_VAR_subtitle_map: tt('subtitle_map', lang),
    TEMPLATE_VAR_section_map: tt('section_map', lang),
    TEMPLATE_VAR_cta_send_message: tt('cta_send_message', lang),
    TEMPLATE_VAR_skip_to_content: tt('skip_to_content', lang),
    TEMPLATE_VAR_scroll_down: tt('scroll_down', lang),
    TEMPLATE_VAR_cookie_text: tt('cookie_text', lang),
    TEMPLATE_VAR_cookie_accept: tt('cookie_accept', lang),
    TEMPLATE_VAR_cookie_decline: tt('cookie_decline', lang),
    TEMPLATE_VAR_footer_rights: tt('footer_rights', lang),
  };

  for (const [key, value] of Object.entries(scalarReplacements)) {
    html = html.replace(new RegExp(key, "g"), value);
  }

  // 5. Apply cinematic hero image if available
  if (data.heroImageUrl) {
    // Insert img element into hero__image-container
    html = html.replace(
      /<!-- HERO_IMAGE -->/,
      `<img src="${escapeAttr(data.heroImageUrl)}" alt="${escapeAttr(data.companyName)}" onerror="this.parentElement.style.display='none'">`
    );
    // Remove the data attribute placeholder
    html = html.replace(/\s*data-hero-image="[^"]*"/, "");
  } else {
    // Remove the hero image container content and data attribute when no image
    html = html.replace(/<!-- HERO_IMAGE -->/, "");
    html = html.replace(/\s*data-hero-image="[^"]*"/, "");
  }

  // 6. Handle logo display — show image or text fallback
  if (data.logoUrl) {
    // Remove text logo fallback markers if image logo exists
    html = html.replace(/<!-- LOGO_TEXT_ONLY -->([\s\S]*?)<!-- \/LOGO_TEXT_ONLY -->/g, "");
    html = html.replace(/<!-- LOGO_IMAGE -->/g, "");
    html = html.replace(/<!-- \/LOGO_IMAGE -->/g, "");
  } else {
    // Remove image logo markers if no image
    html = html.replace(/<!-- LOGO_IMAGE -->([\s\S]*?)<!-- \/LOGO_IMAGE -->/g, "");
    html = html.replace(/<!-- LOGO_TEXT_ONLY -->/g, "");
    html = html.replace(/<!-- \/LOGO_TEXT_ONLY -->/g, "");
  }

  return html;
}

// ── Post-Processing ──

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
    result = result.replace("</style>", `${reducedMotionCSS}\n  </style>`);
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

  return result;
}

// ── Validation ──

function validateHtml(html: string, companyName: string): string {
  let result = html;

  // Check for unfilled template variables
  const unfilledVars = result.match(/TEMPLATE_VAR_\w+/g);
  if (unfilledVars) {
    console.warn("[validate] Unfilled template variables found:", [...new Set(unfilledVars)]);
    // Remove unfilled variables rather than leaving them visible
    for (const v of new Set(unfilledVars)) {
      result = result.replace(new RegExp(v, "g"), "");
    }
  }

  // Check for placeholder text
  const placeholders = ["Lorem ipsum", "Example Domain", "Acme Corp", "Your Company", "placeholder.com", "example.com"];
  for (const ph of placeholders) {
    if (result.toLowerCase().includes(ph.toLowerCase())) {
      console.warn(`[validate] Placeholder text found: "${ph}"`);
    }
  }

  // Ensure company name is present
  if (companyName && !result.includes(companyName)) {
    console.warn("[validate] Company name not found in output HTML");
  }

  // Ensure all img src URLs are absolute
  result = result.replace(/src="(\/[^"]+)"/g, (match, path) => {
    // Relative paths starting with / are acceptable in templates
    return match;
  });

  return result;
}

// ── Fallback Template Data (no API call) ──

function buildFallbackTemplateData(
  url: string,
  crawledContent: string,
  assets?: ExtractedAssets | null
): TemplateData {
  let siteHost: string;
  try { siteHost = new URL(url).hostname; } catch { siteHost = url; }
  const companyName = assets?.companyName || siteHost;

  const lines = (crawledContent || "").split("\n").filter(l => l.trim().length > 10);
  const headings = lines.filter(l => l.startsWith("#")).map(l => l.replace(/^#+\s*/, "").trim());
  const paragraphs = lines.filter(l => !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("!") && l.trim().length > 40);

  return {
    companyName,
    headline: headings[0] || companyName,
    subheadline: paragraphs[0] || "",
    metaDescription: assets?.metaDescription || paragraphs[0]?.slice(0, 160) || "",
    logoUrl: assets?.logo || "",
    faviconUrl: assets?.favicon || "",
    primaryColor: "#1B2A4A",
    language: "en",
    heroImageUrl: assets?.heroImageUrl || "",
    siteType: assets?.siteType || "corporate",
    navLinks: assets?.navLinks || [],
    services: headings.slice(1, 7).map((title, i) => ({
      title,
      description: paragraphs[i + 1] || "",
      icon: ["briefcase", "chart", "shield", "globe", "users", "code"][i % 6],
    })),
    aboutText: paragraphs.slice(1, 4).join(" "),
    stats: extractStats(crawledContent || "").map(s => ({ number: String(s.number), label: s.label })),
    testimonials: extractTestimonials(crawledContent || "").map(t => ({
      quote: t.text,
      author: t.author,
      role: t.role || "",
    })),
    faqItems: extractFaqItems(crawledContent || ""),
    blogPosts: [],
    products: (assets?.products || []).slice(0, 12).map(p => ({
      name: p.name, description: p.description, price: p.price || "", imageUrl: p.imageUrl || "",
    })),
    gallery: (assets?.images || []).filter(img => img.context !== "icon" && img.context !== "logo").slice(0, 8).map(img => ({ url: img.url, alt: img.alt || companyName })),
    socialLinks: assets?.socialLinks || [],
    phone: assets?.phoneNumbers?.[0] || "",
    email: assets?.emails?.[0] || "",
    address: assets?.address || "",
  };
}

// ── Fallback HTML Builder (template-based) ──

function buildFallbackHtml(
  variant: DesignVariant,
  url: string,
  crawledContent?: string,
  assets?: ExtractedAssets | null
): string {
  const templateData = buildFallbackTemplateData(url, crawledContent || "", assets);
  templateData.primaryColor = variant.palette.primary;

  try {
    const templateFile = getTemplateFile(variant.name);
    const templatePath = path.join(process.cwd(), "src/templates", templateFile);
    const template = fs.readFileSync(templatePath, "utf-8");
    let html = fillTemplate(template, templateData);
    html = postProcessHtml(html, variant);
    return validateHtml(html, templateData.companyName);
  } catch (err) {
    console.error("[generate-html] Fallback template read failed:", err);
    return buildMinimalFallbackHtml(templateData, variant);
  }
}

// ── Minimal Inline Fallback (if templates can't be read) ──

function buildMinimalFallbackHtml(data: TemplateData, variant: DesignVariant): string {
  const p = variant.palette;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${escapeAttr(data.language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeAttr(data.metaDescription)}">
  <meta name="theme-color" content="${p.primary}">
  <title>${escapeHtml(data.companyName)}</title>
  ${data.faviconUrl ? `<link rel="icon" href="${data.faviconUrl}" />` : ""}
  <style>
    :root { --primary: ${p.primary}; --bg: ${p.bg}; --text: ${p.text}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .hero { min-height: 70vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 80px 24px; }
    .hero h1 { font-size: clamp(2rem, 5vw, 4rem); margin-bottom: 16px; }
    .hero p { font-size: 1.1rem; opacity: 0.8; max-width: 600px; margin: 0 auto 32px; }
    .btn { display: inline-block; padding: 14px 32px; background: var(--primary); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .section { padding: 80px 24px; }
    .footer { padding: 40px 24px; text-align: center; opacity: 0.6; font-size: 0.85rem; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <h1>${escapeHtml(data.headline)}</h1>
        ${data.subheadline ? `<p>${escapeHtml(data.subheadline)}</p>` : ""}
        <a href="#contact" class="btn">${tt('cta_contact', data.language || 'en')}</a>
      </div>
    </section>
  </main>
  <footer class="footer">&copy; ${year} ${escapeHtml(data.companyName)}</footer>
</body>
</html>`;
}

// ── Social Media Icon Helpers ──

function getSocialLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("facebook.com") || u.includes("fb.com")) return "Facebook";
  if (u.includes("linkedin.com")) return "LinkedIn";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("twitter.com") || u.includes("x.com")) return "X";
  if (u.includes("pinterest.com")) return "Pinterest";
  if (u.includes("tiktok.com")) return "TikTok";
  return "Social";
}

function getSocialIconSvg(url: string): string {
  const label = getSocialLabel(url);
  const c = "currentColor";
  const icons: Record<string, string> = {
    Facebook: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    LinkedIn: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    YouTube: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    Instagram: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>`,
    X: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    Pinterest: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>`,
    TikTok: `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
  };
  return icons[label] || `<svg viewBox="0 0 24 24" fill="${c}" width="20" height="20"><circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2"/><path d="M8 12h8M12 8v8" stroke="${c}" stroke-width="2"/></svg>`;
}

// ── Service Icon SVG Generator ──

function getServiceIconSvg(iconName: string): string {
  const color = "currentColor";
  const icons: Record<string, string> = {
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    globe: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>`,
    target: `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  };
  return icons[iconName] || icons.briefcase;
}

// ── Business Context Builder ──

function buildBusinessContext(profile: BusinessProfile): string {
  const parts: string[] = ["\nBUSINESS INTELLIGENCE (use this to inform all generated content):"];
  parts.push(`Industry: ${profile.industry}${profile.industrySegment ? ` → ${profile.industrySegment}` : ""}`);
  parts.push(`Summary: ${profile.summary}`);
  if (profile.targetAudience.length) parts.push(`Target Audience: ${profile.targetAudience.join("; ")}`);
  if (profile.valuePropositions.length) parts.push(`Value Props: ${profile.valuePropositions.join("; ")}`);
  if (profile.coreServices.length) parts.push(`Core Services: ${profile.coreServices.map(s => s.name).join(", ")}`);
  if (profile.painPointsSolved.length) parts.push(`Pain Points Solved: ${profile.painPointsSolved.join("; ")}`);
  if (profile.differentiators.length) parts.push(`Differentiators: ${profile.differentiators.join("; ")}`);
  parts.push(`Brand Voice: ${profile.brandVoice}, Maturity: ${profile.businessMaturity}`);
  if (profile.geographicFocus) parts.push(`Geographic Focus: ${profile.geographicFocus}`);
  if (profile.contentThemes.length) parts.push(`Content Themes: ${profile.contentThemes.join("; ")}`);
  return parts.join("\n") + "\n";
}

// ── Dynamic Navigation Builder ──

/**
 * Build navLinks dynamically from sections that have content.
 * This ensures nav links only point to rendered sections (no 404s)
 * and always use #section-id anchors (never external URLs).
 */
function buildDynamicNavLinks(data: TemplateData): TemplateData["navLinks"] {
  const lang = data.language || "en";
  const links: TemplateData["navLinks"] = [];

  // Order per TEMPLATE-STANDARDS rule #11:
  // Services → Products → About → Gallery → Blog → Testimonials → FAQ → Contact
  if (data.services.length >= 2) {
    links.push({ text: tt("nav_services", lang), href: "#services" });
  }
  if (data.products.length >= 2) {
    links.push({ text: tt("nav_products", lang), href: "#products" });
  }
  if (data.aboutText.trim()) {
    links.push({ text: tt("nav_about", lang), href: "#about" });
  }
  if (data.gallery.length >= 3) {
    links.push({ text: tt("nav_gallery", lang), href: "#gallery" });
  }
  if (data.blogPosts.length >= 2) {
    links.push({ text: tt("nav_blog", lang), href: "#blog" });
  }
  if (data.testimonials.length >= 1) {
    links.push({ text: tt("nav_testimonials", lang), href: "#testimonials" });
  }
  if (data.faqItems.length >= 1) {
    links.push({ text: tt("nav_faq", lang), href: "#faq" });
  }
  // Contact is always shown
  links.push({ text: tt("nav_contact", lang), href: "#contact" });

  return links;
}

// ── HTML Theft Protection ──

/**
 * Inject anti-theft protection into generated HTML previews.
 * Prevents easy copying of source code and adds a visual watermark.
 */
function injectTheftProtection(html: string): string {
  const protectionCSS = `
    /* Anti-theft: disable text selection on body */
    body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
    /* Allow selection inside forms */
    input, textarea, select { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }
    /* Watermark overlay */
    body::after {
      content: 'PREVIEW';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 8vw;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      pointer-events: none;
      z-index: 99999;
      white-space: nowrap;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }`;

  const protectionJS = `
  <script>
  (function(){
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
    // Disable common copy shortcuts
    document.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    });
    // Intercept all link clicks to prevent navigation away from preview
    document.addEventListener('click', function(e){
      var link = e.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      // Allow anchor links (scroll within page)
      if (href.startsWith('#')) return;
      // Prevent all other navigation (external URLs, relative paths)
      e.preventDefault();
    });
  })();
  </script>`;

  // Inject CSS before </style>
  let result = html;
  if (result.includes("</style>")) {
    result = result.replace("</style>", `${protectionCSS}\n  </style>`);
  }

  // Inject JS and base target before </body>
  result = result.replace("</body>", `${protectionJS}\n</body>`);

  return result;
}

// ── Helper Functions ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Light escape for visible text (headlines, subheadlines) — keeps & as-is for readability */
function escapeHtmlLight(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Extract stats/numbers from crawled content for the stats bar.
 */
function extractStats(content: string): { number: number; label: string }[] {
  const stats: { number: number; label: string }[] = [];
  const seen = new Set<number>();

  const patterns = [
    /(\d{1,6})\+?\s*(let|years?|roků|roku)\s*(zkušeností|experience|praxe|na trhu)?/gi,
    /(\d{1,6})\+?\s*(klientů|clients?|zákazníků|customers?|spokojených)/gi,
    /(\d{1,6})\+?\s*(projektů|projects?|realizací|zakázek|completed)/gi,
    /(\d{1,3})\s*%\s*(spokojenost|satisfaction|úspěšnost|success)/gi,
    /(\d{1,6})\+?\s*(zaměstnanců|employees?|členů|members?|team)/gi,
  ];

  const labels = [
    ["Let zkušeností", "Roků praxe"],
    ["Spokojených klientů", "Klientů"],
    ["Dokončených projektů", "Projektů"],
    ["Spokojenost", "Úspěšnost"],
    ["Členů týmu", "Zaměstnanců"],
  ];

  for (let i = 0; i < patterns.length && stats.length < 4; i++) {
    const match = patterns[i].exec(content);
    if (match) {
      const num = parseInt(match[1]);
      if (num > 0 && num < 1000000 && !seen.has(num)) {
        seen.add(num);
        stats.push({ number: num, label: labels[i][0] });
      }
    }
  }

  return stats;
}

/**
 * Extract testimonials from crawled content.
 */
function extractTestimonials(content: string): { text: string; author: string; role?: string }[] {
  const testimonials: { text: string; author: string; role?: string }[] = [];
  const quotePatterns = [
    /"([^"]{30,300})"\s*[-—–]\s*([A-ZÁ-Ž][a-zá-ž]+ [A-ZÁ-Ž][a-zá-ž]+)(?:\s*,\s*(.+?))?(?:\n|$)/g,
    /„([^"]{30,300})"\s*[-—–]\s*([A-ZÁ-Ž][a-zá-ž]+ [A-ZÁ-Ž][a-zá-ž]+)(?:\s*,\s*(.+?))?(?:\n|$)/g,
  ];

  for (const pattern of quotePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null && testimonials.length < 3) {
      testimonials.push({
        text: match[1].trim(),
        author: match[2].trim(),
        role: match[3]?.trim(),
      });
    }
  }

  return testimonials;
}

/**
 * Extract FAQ items from crawled content.
 */
function extractFaqItems(content: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length - 1 && items.length < 6; i++) {
    const line = lines[i];
    if (line.endsWith("?") && line.length > 15 && line.length < 200) {
      const answer = lines[i + 1];
      if (answer && !answer.endsWith("?") && answer.length > 20) {
        items.push({
          question: line.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, ""),
          answer: answer.slice(0, 300),
        });
        i++;
      }
    }
  }

  return items;
}
