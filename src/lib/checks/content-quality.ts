import type { Finding } from "../supabase";

// ─── Types ───

export interface ContentQualityResult {
  readability: {
    gradeLevel: number;
    totalWords: number;
    totalSentences: number;
    totalSyllables: number;
  };
  thinContent: { url: string; wordCount: number; severity: "warning" | "error" }[];
  duplicates: { pageA: string; pageB: string; similarity: number }[];
  freshness: { url: string; latestDate: Date | null; ageMonths: number | null }[];
  keywords: {
    topKeywords: { word: string; count: number; density: number }[];
    inTitle: boolean;
    inH1: boolean;
    inMetaDesc: boolean;
    inFirstParagraph: boolean;
    stuffingDetected: boolean;
  };
  findings: Finding[];
}

export interface PageContent {
  url: string;
  title: string;
  markdown: string;
  html: string;
}

// ─── Stop words (Czech + English) ───

const STOP_WORDS = new Set([
  // English
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "it", "its", "this", "that", "these", "those", "i", "you", "he", "she",
  "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
  "our", "their", "what", "which", "who", "whom", "how", "when", "where",
  "why", "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "no", "not", "only", "own", "same", "so", "than", "too",
  "very", "just", "about", "above", "after", "again", "also", "any",
  "because", "before", "between", "down", "during", "even", "here",
  "into", "if", "like", "new", "now", "off", "old", "once", "out", "over",
  "still", "then", "there", "through", "under", "up", "well",
  // Czech
  "a", "aby", "ale", "ani", "ano", "asi", "az", "bez", "bude", "budem",
  "budes", "by", "byl", "byla", "byli", "bylo", "být", "co", "ci", "další",
  "do", "ho", "i", "ja", "jak", "jako", "je", "jeho", "jej", "její",
  "jen", "ještě", "ji", "jí", "jiné", "již", "jsem", "jsi", "jsme",
  "jsou", "jste", "k", "kam", "kde", "kdo", "kdy", "když", "ke", "která",
  "které", "který", "kteří", "ku", "ma", "mají", "mezi", "mi", "mít",
  "mně", "mnou", "moc", "moje", "можно", "muj", "muze", "může", "my",
  "na", "nad", "nám", "námi", "napište", "nas", "náš", "naše", "ne",
  "nebo", "necht", "nej", "nějak", "některý", "není", "nez", "než", "nic",
  "nich", "ním", "no", "od", "on", "ona", "oni", "ono", "pak", "po",
  "pod", "podle", "pokud", "pouze", "potom", "právě", "pro", "proč",
  "proto", "protože", "před", "přes", "při", "s", "se", "si", "sice",
  "své", "svůj", "ta", "tak", "také", "tato", "te", "ten", "tedy", "tím",
  "to", "tohle", "toho", "tom", "tomto", "toto", "tu", "tuto", "ty",
  "tyto", "u", "uz", "už", "v", "vám", "vas", "váš", "vaše", "ve",
  "více", "však", "všechen", "vy", "z", "za", "zde", "ze", "že",
]);

// ─── Syllable counting ───

function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-záčďéěíňóřšťúůýž]/g, "");
  if (lower.length === 0) return 0;

  // Count vowel groups
  const vowels = /[aeiouyáčéěíóúůý]+/gi;
  const matches = lower.match(vowels);
  const count = matches ? matches.length : 0;

  return Math.max(1, count);
}

// ─── Readability Analysis ───

function analyzeReadability(text: string): {
  gradeLevel: number;
  totalWords: number;
  totalSentences: number;
  totalSyllables: number;
} {
  // Clean text: remove URLs, markdown artifacts
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_\[\]()>|`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  // Count sentences (end with . ! ?)
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const totalSentences = Math.max(1, sentences.length);

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  // Flesch-Kincaid Grade Level
  const gradeLevel =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;

  return {
    gradeLevel: Math.round(gradeLevel * 10) / 10,
    totalWords,
    totalSentences,
    totalSyllables,
  };
}

// ─── Thin Content Detection ───

function stripBoilerplate(markdown: string): string {
  // Remove common boilerplate patterns
  const lines = markdown.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim().toLowerCase();
    // Skip nav-like lines (very short, link-heavy)
    if (trimmed.length < 5) return false;
    // Skip copyright lines
    if (trimmed.includes("©") || trimmed.includes("copyright")) return false;
    // Skip cookie/privacy banners
    if (trimmed.includes("cookie") || trimmed.includes("privacy policy")) return false;
    return true;
  });
  return filtered.join(" ");
}

function detectThinContent(pages: PageContent[]): { url: string; wordCount: number; severity: "warning" | "error" }[] {
  const results: { url: string; wordCount: number; severity: "warning" | "error" }[] = [];

  for (const page of pages) {
    const content = stripBoilerplate(page.markdown);
    const wordCount = content.split(/\s+/).filter((w) => w.length > 2).length;

    if (wordCount < 100) {
      results.push({ url: page.url, wordCount, severity: "error" });
    } else if (wordCount < 300) {
      results.push({ url: page.url, wordCount, severity: "warning" });
    }
  }

  return results;
}

// ─── SimHash Duplicate Detection ───

function simpleHash(str: string): number {
  // Simple 32-bit hash (FNV-1a inspired)
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function computeSimHash(text: string): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-záčďéěíňóřšťúůýža-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length < 3) return new Array(64).fill(0);

  // Create 3-word shingles
  const bits = new Array(64).fill(0);

  for (let i = 0; i <= words.length - 3; i++) {
    const shingle = words.slice(i, i + 3).join(" ");
    const hash = simpleHash(shingle);

    // Use two 32-bit hashes to simulate 64 bits
    const hash2 = simpleHash(shingle + "_salt");

    for (let bit = 0; bit < 32; bit++) {
      bits[bit] += (hash >> bit) & 1 ? 1 : -1;
      bits[32 + bit] += (hash2 >> bit) & 1 ? 1 : -1;
    }
  }

  return bits.map((b) => (b > 0 ? 1 : 0));
}

function hammingDistance(a: number[], b: number[]): number {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance;
}

function detectDuplicates(pages: PageContent[]): { pageA: string; pageB: string; similarity: number }[] {
  if (pages.length < 2) return [];

  const hashes = pages.map((p) => ({
    url: p.url,
    hash: computeSimHash(stripBoilerplate(p.markdown)),
  }));

  const duplicates: { pageA: string; pageB: string; similarity: number }[] = [];

  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      const dist = hammingDistance(hashes[i].hash, hashes[j].hash);
      if (dist <= 3) {
        const similarity = Math.round(((64 - dist) / 64) * 100);
        duplicates.push({
          pageA: hashes[i].url,
          pageB: hashes[j].url,
          similarity,
        });
      }
    }
  }

  return duplicates;
}

// ─── Content Freshness ───

const DATE_PATTERNS = [
  // ISO format: 2024-01-15
  /(\d{4})-(\d{1,2})-(\d{1,2})/g,
  // European: 15.01.2024, 15. 1. 2024
  /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/g,
  // US: 01/15/2024, January 15, 2024
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
  // Written: 15 January 2024, January 15 2024
  /(\d{1,2})\.?\s+(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
  /(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\.?,?\s+(\d{4})/gi,
];

function extractDates(text: string): Date[] {
  const dates: Date[] = [];

  for (const pattern of DATE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const dateStr = match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() <= new Date().getFullYear() + 1) {
          dates.push(parsed);
        }
      } catch {
        // Skip unparseable dates
      }
    }
  }

  // Also try year-only matches for copyright etc.
  const yearMatches = text.match(/(?:©|\bcopyright\b)\s*(\d{4})/gi);
  if (yearMatches) {
    for (const ym of yearMatches) {
      const yearStr = ym.match(/(\d{4})/)?.[1];
      if (yearStr) {
        const year = parseInt(yearStr);
        if (year > 2000 && year <= new Date().getFullYear() + 1) {
          dates.push(new Date(year, 0, 1));
        }
      }
    }
  }

  return dates;
}

function analyzeFreshness(pages: PageContent[]): { url: string; latestDate: Date | null; ageMonths: number | null }[] {
  const now = new Date();
  return pages.map((page) => {
    const dates = extractDates(page.markdown);
    if (dates.length === 0) {
      return { url: page.url, latestDate: null, ageMonths: null };
    }
    const latestDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const ageMonths = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return { url: page.url, latestDate, ageMonths };
  });
}

// ─── Keyword Analysis ───

function analyzeKeywords(
  text: string,
  title: string,
  h1Text: string,
  metaDescription: string
): {
  topKeywords: { word: string; count: number; density: number }[];
  inTitle: boolean;
  inH1: boolean;
  inMetaDesc: boolean;
  inFirstParagraph: boolean;
  stuffingDetected: boolean;
} {
  const words = text
    .toLowerCase()
    .replace(/[^a-záčďéěíňóřšťúůýža-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const totalWords = words.length;
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / totalWords) * 1000) / 10,
    }));

  const primaryKeyword = sorted[0]?.word || "";
  const titleLower = title.toLowerCase();
  const h1Lower = h1Text.toLowerCase();
  const metaLower = metaDescription.toLowerCase();

  // First paragraph: first 200 words
  const firstParagraph = words.slice(0, 200).join(" ");

  return {
    topKeywords: sorted,
    inTitle: titleLower.includes(primaryKeyword),
    inH1: h1Lower.includes(primaryKeyword),
    inMetaDesc: metaLower.includes(primaryKeyword),
    inFirstParagraph: firstParagraph.includes(primaryKeyword),
    stuffingDetected: sorted.some((kw) => kw.density > 3),
  };
}

// ─── Main Export ───

export function analyzeContentQuality(
  pages: PageContent[],
  mainPageTitle: string,
  mainPageH1: string,
  mainPageMetaDesc: string
): ContentQualityResult {
  const findings: Finding[] = [];

  // Combine all markdown for readability
  const allText = pages.map((p) => stripBoilerplate(p.markdown)).join(" ");

  // 1. Readability
  const readability = analyzeReadability(allText);

  if (readability.totalWords > 50) {
    if (readability.gradeLevel > 12) {
      findings.push({
        category: "content",
        severity: "warning",
        title: "Příliš složitý text",
        description: `Úroveň čitelnosti je ${readability.gradeLevel} (Flesch-Kincaid). Pro obecný webový obsah je ideální úroveň 6–8. Zjednodušte věty a používejte kratší slova, aby byl text srozumitelný širšímu publiku.`,
      });
    } else if (readability.gradeLevel < 3) {
      findings.push({
        category: "content",
        severity: "info",
        title: "Příliš jednoduchý text",
        description: `Úroveň čitelnosti je ${readability.gradeLevel} (Flesch-Kincaid). Text může působit příliš jednoduše. Zvažte přidání odbornějšího obsahu pro větší důvěryhodnost.`,
      });
    } else {
      findings.push({
        category: "content",
        severity: "ok",
        title: "Dobrá čitelnost",
        description: `Úroveň čitelnosti ${readability.gradeLevel} (Flesch-Kincaid) je vhodná pro webový obsah.`,
      });
    }
  }

  // 2. Thin content
  const thinContent = detectThinContent(pages);
  const thinErrors = thinContent.filter((t) => t.severity === "error");
  const thinWarnings = thinContent.filter((t) => t.severity === "warning");

  if (thinErrors.length > 0) {
    findings.push({
      category: "content",
      severity: "critical",
      title: "Kriticky málo obsahu",
      description: `${thinErrors.length} stránek má méně než 100 slov. Přidejte podstatný obsah, protože stránky s nedostatečným textem mají slabé hodnocení ve vyhledávačích a neposkytují uživatelům užitečné informace.`,
    });
  }
  if (thinWarnings.length > 0) {
    findings.push({
      category: "content",
      severity: "warning",
      title: "Nedostatečný obsah",
      description: `${thinWarnings.length} stránek má méně než 300 slov. Rozšiřte obsah alespoň na 300+ slov, aby stránky lépe konvertovaly a byly viditelné ve vyhledávačích.`,
    });
  }

  // 3. Duplicate content
  const duplicates = detectDuplicates(pages);
  if (duplicates.length > 0) {
    findings.push({
      category: "content",
      severity: "warning",
      title: "Duplicitní obsah",
      description: `Nalezeno ${duplicates.length} párů stránek s velmi podobným obsahem (${duplicates.map((d) => `${shortenUrl(d.pageA)} ↔ ${shortenUrl(d.pageB)}`).join(", ")}). Duplicitní obsah zhoršuje SEO, protože vyhledávače penalizují opakující se text. Unikátní obsah na každé stránce zlepší indexaci.`,
    });
  }

  // 4. Freshness
  const freshness = analyzeFreshness(pages);
  const stalePages = freshness.filter((f) => f.ageMonths !== null && f.ageMonths > 24);
  const noDatesPages = freshness.filter((f) => f.latestDate === null);

  if (stalePages.length > 0) {
    findings.push({
      category: "content",
      severity: "info",
      title: "Zastaralý obsah",
      description: `${stalePages.length} stránek obsahuje data starší než 2 roky. Aktualizujte obsah, aby web působil aktuálně a relevantně — vyhledávače upřednostňují čerstvý obsah.`,
    });
  }
  if (noDatesPages.length > pages.length / 2 && pages.length > 1) {
    findings.push({
      category: "content",
      severity: "info",
      title: "Chybí data publikace",
      description: `Na ${noDatesPages.length} z ${pages.length} stránek nebylo nalezeno žádné datum. Přidejte data publikace nebo poslední aktualizace, aby uživatelé i vyhledávače viděli, že obsah je aktuální.`,
    });
  }

  // 5. Keywords
  const keywords = analyzeKeywords(allText, mainPageTitle, mainPageH1, mainPageMetaDesc);

  if (keywords.stuffingDetected) {
    const stuffedWords = keywords.topKeywords.filter((kw) => kw.density > 3);
    findings.push({
      category: "content",
      severity: "warning",
      title: "Přehuštění klíčovými slovy",
      description: `Slova ${stuffedWords.map((w) => `"${w.word}" (${w.density}%)`).join(", ")} se vyskytují příliš často (hustota > 3 %). Snižte opakování, protože vyhledávače penalizují keyword stuffing a text ztrácí přirozenost.`,
    });
  }

  if (keywords.topKeywords.length > 0) {
    const primary = keywords.topKeywords[0].word;
    const missingIn: string[] = [];
    if (!keywords.inTitle) missingIn.push("title");
    if (!keywords.inH1) missingIn.push("H1");
    if (!keywords.inMetaDesc) missingIn.push("meta description");

    if (missingIn.length > 0) {
      findings.push({
        category: "content",
        severity: "warning",
        title: "Klíčové slovo chybí v důležitých místech",
        description: `Hlavní klíčové slovo "${primary}" chybí v: ${missingIn.join(", ")}. Přidejte ho přirozeně do těchto míst, protože vyhledávače jim přikládají největší váhu pro určení relevance stránky.`,
      });
    }
  }

  return {
    readability,
    thinContent,
    duplicates,
    freshness,
    keywords,
    findings,
  };
}

// Helper
function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url.slice(0, 40);
  }
}
