/**
 * Template & DOM Clustering Detection Module
 *
 * Detects which crawled pages share the same HTML template by:
 * 1. DOM Fingerprinting — structural SimHash from serialized DOM tree
 * 2. Template Clustering — Hamming-distance grouping of similar pages
 * 3. XPath Frequency Analysis — template vs content element detection
 * 4. Findings Deduplication — merging repeated issues across template clusters
 */

import * as cheerio from "cheerio";
import type { Finding } from "./supabase";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface TemplateCluster {
  id: string;
  name: string;
  templateHash: string;
  pageUrls: string[];
  pageCount: number;
  representativeUrl: string;
  commonIssues: Finding[];
  templateElements: string[];
  contentElements: string[];
}

export interface PageFingerprint {
  url: string;
  hash: bigint;
  hashHex: string;
}

export interface TemplateDetectionResult {
  clusters: TemplateCluster[];
  fingerprints: PageFingerprint[];
  deduplicatedFindings: Finding[];
  templateFindingsCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DEPTH = 6;
const HAMMING_THRESHOLD = 5;
const TEMPLATE_ELEMENT_THRESHOLD = 0.8;
const SHINGLE_SIZE = 3;
const DEDUP_MIN_PAGES = 10;

// ─── SimHash Implementation ──────────────────────────────────────────────────

const BIGINT_0 = BigInt(0);
const BIGINT_1 = BigInt(1);
const FNV_OFFSET = BigInt("0xcbf29ce484222325");
const FNV_PRIME = BigInt("0x100000001b3");
const MASK_64 = BigInt("0xFFFFFFFFFFFFFFFF");

/**
 * FNV-1a 64-bit hash for individual shingles.
 * Returns a BigInt representing a 64-bit hash.
 */
function fnv1a64(str: string): bigint {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
}

/**
 * Compute SimHash (64-bit) from a set of string tokens.
 * Uses shingle hashing + weighted bit accumulation.
 */
function computeSimHash(shingles: string[]): bigint {
  const bitCounts = new Int32Array(64);

  for (const shingle of shingles) {
    const hash = fnv1a64(shingle);
    for (let i = 0; i < 64; i++) {
      if ((hash >> BigInt(i)) & BIGINT_1) {
        bitCounts[i]++;
      } else {
        bitCounts[i]--;
      }
    }
  }

  let result = BIGINT_0;
  for (let i = 0; i < 64; i++) {
    if (bitCounts[i] > 0) {
      result |= BIGINT_1 << BigInt(i);
    }
  }
  return result;
}

/**
 * Compute Hamming distance between two 64-bit SimHash values.
 */
function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > BIGINT_0) {
    count += Number(xor & BIGINT_1);
    xor >>= BIGINT_1;
  }
  return count;
}

// ─── DOM Serialization ───────────────────────────────────────────────────────

/**
 * Serialize a DOM tree into structural representation.
 * Format: tag[child1,child2,...] recursively, max depth 6.
 * Ignores text content, focuses purely on structure.
 */
function serializeDomStructure(html: string): string {
  const $ = cheerio.load(html);

  function serializeNode(el: any, depth: number): string {
    if (depth > MAX_DEPTH) return "";
    if (el.type !== "tag") return "";

    const tagName = el.tagName.toLowerCase();
    // Skip script/style/svg content — not structural
    if (tagName === "script" || tagName === "style" || tagName === "svg") {
      return tagName + "[]";
    }

    const children = $(el)
      .children()
      .toArray()
      .map((child) => serializeNode(child as any, depth + 1))
      .filter((s) => s.length > 0);

    return `${tagName}[${children.join(",")}]`;
  }

  const body = $("body").first();
  if (body.length === 0) return "html[]";

  return serializeNode(body[0] as any, 0);
}

/**
 * Create 3-word shingles from a serialized DOM string.
 */
function createShingles(serialized: string): string[] {
  // Tokenize by splitting on brackets and commas
  const tokens = serialized
    .replace(/[\[\],]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length < SHINGLE_SIZE) {
    return [tokens.join(" ")];
  }

  const shingles: string[] = [];
  for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
    shingles.push(tokens.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return shingles;
}

// ─── DOM Fingerprinting ──────────────────────────────────────────────────────

/**
 * Generate a structural fingerprint (SimHash) for a single page.
 */
export function fingerprintPage(url: string, html: string): PageFingerprint {
  const serialized = serializeDomStructure(html);
  const shingles = createShingles(serialized);
  const hash = computeSimHash(shingles);
  return {
    url,
    hash,
    hashHex: hash.toString(16).padStart(16, "0"),
  };
}

// ─── XPath Frequency Analysis ────────────────────────────────────────────────

/**
 * Extract simplified XPath-like paths for all elements in a page.
 * Returns a set of structural paths (e.g., "body>div>header>nav>ul>li").
 */
function extractElementPaths(html: string): Set<string> {
  const $ = cheerio.load(html);
  const paths = new Set<string>();

  function walk(el: any, parentPath: string, depth: number) {
    if (depth > MAX_DEPTH || el.type !== "tag") return;

    const tagName = el.tagName.toLowerCase();
    if (tagName === "script" || tagName === "style") return;

    const path = parentPath ? `${parentPath}>${tagName}` : tagName;
    paths.add(path);

    $(el)
      .children()
      .toArray()
      .forEach((child) => walk(child as any, path, depth + 1));
  }

  const body = $("body").first();
  if (body.length > 0) {
    walk(body[0] as any, "", 0);
  }

  return paths;
}

/**
 * Analyze XPath frequency across pages in a cluster.
 * Elements appearing in >80% of pages are "template elements",
 * the rest are "content elements".
 */
function analyzeXPathFrequency(
  pagesHtml: { url: string; html: string }[]
): { templateElements: string[]; contentElements: string[] } {
  const pathCounts = new Map<string, number>();
  const totalPages = pagesHtml.length;

  for (const page of pagesHtml) {
    const paths = extractElementPaths(page.html);
    for (const path of paths) {
      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
    }
  }

  const templateElements: string[] = [];
  const contentElements: string[] = [];

  for (const [path, count] of pathCounts) {
    const frequency = count / totalPages;
    if (frequency >= TEMPLATE_ELEMENT_THRESHOLD) {
      templateElements.push(path);
    } else {
      contentElements.push(path);
    }
  }

  // Sort by path depth (shorter = more structural)
  templateElements.sort((a, b) => a.split(">").length - b.split(">").length);
  contentElements.sort((a, b) => a.split(">").length - b.split(">").length);

  return { templateElements: templateElements.slice(0, 50), contentElements: contentElements.slice(0, 50) };
}

// ─── Template Clustering ─────────────────────────────────────────────────────

/**
 * Generate a human-readable template name from a set of URLs.
 * Detects common URL path patterns (e.g., "/products/*" -> "Šablona produktů").
 */
function generateTemplateName(urls: string[]): string {
  if (urls.length === 0) return "Neznámá šablona";
  if (urls.length === 1) {
    try {
      const path = new URL(urls[0]).pathname;
      if (path === "/" || path === "") return "Šablona hlavní stránky";
      const segment = path.split("/").filter(Boolean)[0] || "";
      return `Šablona: /${segment}`;
    } catch {
      return "Šablona stránky";
    }
  }

  // Find common URL path prefix
  try {
    const paths = urls.map((u) => {
      try {
        return new URL(u).pathname;
      } catch {
        return "/";
      }
    });

    // Find the longest common path prefix
    const segments = paths.map((p) => p.split("/").filter(Boolean));
    const minLen = Math.min(...segments.map((s) => s.length));
    const commonSegments: string[] = [];

    for (let i = 0; i < minLen; i++) {
      const seg = segments[0][i];
      if (segments.every((s) => s[i] === seg)) {
        commonSegments.push(seg);
      } else {
        break;
      }
    }

    if (commonSegments.length > 0) {
      return `Šablona: /${commonSegments.join("/")}/*`;
    }

    // Try to detect common page type patterns
    const pathPatterns: Record<string, string> = {
      product: "Šablona produktů",
      products: "Šablona produktů",
      produkt: "Šablona produktů",
      produkty: "Šablona produktů",
      blog: "Šablona blogu",
      clanek: "Šablona článků",
      clanky: "Šablona článků",
      kategorie: "Šablona kategorií",
      category: "Šablona kategorií",
      sluzby: "Šablona služeb",
      services: "Šablona služeb",
      kontakt: "Šablona kontaktu",
      contact: "Šablona kontaktu",
      about: "Šablona o nás",
    };

    // Check if most URLs share a common first segment
    const firstSegments = segments.map((s) => s[0] || "").filter(Boolean);
    const segmentCounts = new Map<string, number>();
    for (const seg of firstSegments) {
      segmentCounts.set(seg, (segmentCounts.get(seg) || 0) + 1);
    }

    for (const [seg, count] of segmentCounts) {
      if (count >= urls.length * 0.6) {
        const lowerSeg = seg.toLowerCase();
        if (pathPatterns[lowerSeg]) return pathPatterns[lowerSeg];
        return `Šablona: /${seg}/*`;
      }
    }

    return `Šablona (${urls.length} stránek)`;
  } catch {
    return `Šablona (${urls.length} stránek)`;
  }
}

/**
 * Find the representative page (closest to cluster centroid).
 * The centroid is the fingerprint with the minimum total Hamming distance to all others.
 */
function findRepresentative(fingerprints: PageFingerprint[]): string {
  if (fingerprints.length === 0) return "";
  if (fingerprints.length === 1) return fingerprints[0].url;

  let minTotalDist = Infinity;
  let representative = fingerprints[0].url;

  for (const fp of fingerprints) {
    let totalDist = 0;
    for (const other of fingerprints) {
      totalDist += hammingDistance(fp.hash, other.hash);
    }
    if (totalDist < minTotalDist) {
      minTotalDist = totalDist;
      representative = fp.url;
    }
  }

  return representative;
}

/**
 * Cluster pages by template similarity using Hamming distance on SimHash.
 * Uses simple single-linkage clustering: pages within HAMMING_THRESHOLD
 * of any page in the cluster are added to that cluster.
 */
function clusterFingerprints(fingerprints: PageFingerprint[]): PageFingerprint[][] {
  const clusters: PageFingerprint[][] = [];
  const assigned = new Set<string>();

  for (const fp of fingerprints) {
    if (assigned.has(fp.url)) continue;

    // Find existing cluster this page belongs to
    let foundCluster: PageFingerprint[] | null = null;
    for (const cluster of clusters) {
      for (const member of cluster) {
        if (hammingDistance(fp.hash, member.hash) <= HAMMING_THRESHOLD) {
          foundCluster = cluster;
          break;
        }
      }
      if (foundCluster) break;
    }

    if (foundCluster) {
      foundCluster.push(fp);
    } else {
      clusters.push([fp]);
    }
    assigned.add(fp.url);
  }

  return clusters;
}

// ─── Findings Deduplication ──────────────────────────────────────────────────

/**
 * Find common issues across pages in a template cluster.
 * An issue is "common" if the same title appears on multiple pages.
 */
function findCommonIssues(
  pageFindings: Map<string, Finding[]>,
  pageUrls: string[]
): Finding[] {
  const titleCounts = new Map<string, { count: number; finding: Finding }>();

  for (const url of pageUrls) {
    const findings = pageFindings.get(url) || [];
    for (const finding of findings) {
      const key = `${finding.category}::${finding.title}`;
      const existing = titleCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        titleCounts.set(key, { count: 1, finding });
      }
    }
  }

  // Issues appearing on majority of pages in the cluster
  const threshold = Math.max(2, Math.floor(pageUrls.length * 0.5));
  return Array.from(titleCounts.values())
    .filter((v) => v.count >= threshold)
    .map((v) => v.finding);
}

/**
 * Deduplicate findings across template clusters.
 * If the same issue appears on 10+ pages in a cluster, merge into one finding
 * with boosted priority.
 */
export function deduplicateFindings(
  findings: Finding[],
  clusters: TemplateCluster[]
): { deduplicatedFindings: Finding[]; templateFindingsCount: number } {
  const result: Finding[] = [];
  const mergedTitles = new Set<string>();
  let templateFindingsCount = 0;

  // Build a lookup: URL -> cluster
  const urlToCluster = new Map<string, TemplateCluster>();
  for (const cluster of clusters) {
    for (const url of cluster.pageUrls) {
      urlToCluster.set(url, cluster);
    }
  }

  // Group findings by title to detect duplicates across clusters
  const findingsByTitle = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = `${finding.category}::${finding.title}`;
    const arr = findingsByTitle.get(key) || [];
    arr.push(finding);
    findingsByTitle.set(key, arr);
  }

  for (const [key, group] of findingsByTitle) {
    // Check if these findings are clustered together
    const clusterIds = new Set<string>();
    for (const cluster of clusters) {
      const clusterIssues = cluster.commonIssues.map(
        (f) => `${f.category}::${f.title}`
      );
      if (clusterIssues.includes(key)) {
        clusterIds.add(cluster.id);
      }
    }

    // If same issue on 10+ pages in a cluster, merge
    if (group.length >= DEDUP_MIN_PAGES && clusterIds.size > 0) {
      const cluster = clusters.find((c) => clusterIds.has(c.id));
      const templateName = cluster?.name || "neznámá šablona";
      const affectedPages = group.length;

      // Priority boost: multiply by log2(affectedPages)
      const baseFinding = group[0];
      result.push({
        category: baseFinding.category,
        severity: baseFinding.severity,
        title: baseFinding.title,
        description: `${baseFinding.description}\n\nTento problém se týká ${affectedPages} stránek používajících šablonu „${templateName}". Opravte šablonu jednou a problém zmizí na všech stránkách.`,
      });

      mergedTitles.add(key);
      templateFindingsCount++;
    }
  }

  // Add all non-merged findings
  for (const finding of findings) {
    const key = `${finding.category}::${finding.title}`;
    if (!mergedTitles.has(key)) {
      result.push(finding);
    }
  }

  return { deduplicatedFindings: result, templateFindingsCount };
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export interface TemplateDetectionInput {
  pages: { url: string; html: string }[];
  findings?: Finding[];
  pageFindings?: Map<string, Finding[]>;
}

/**
 * Run full template detection pipeline:
 * 1. Fingerprint all pages
 * 2. Cluster by structural similarity
 * 3. Analyze XPath frequencies per cluster
 * 4. Deduplicate findings
 *
 * Designed to handle up to 50 pages in <5 seconds.
 */
export function detectTemplates(input: TemplateDetectionInput): TemplateDetectionResult {
  const { pages, findings = [], pageFindings = new Map() } = input;

  // Step 1: Fingerprint all pages
  const fingerprints = pages.map((p) => fingerprintPage(p.url, p.html));

  // Step 2: Cluster by Hamming distance
  const rawClusters = clusterFingerprints(fingerprints);

  // Step 3: Build TemplateCluster objects with XPath analysis
  const clusters: TemplateCluster[] = rawClusters.map((clusterFps, idx) => {
    const pageUrls = clusterFps.map((fp) => fp.url);
    const clusterPages = pages.filter((p) => pageUrls.includes(p.url));

    // XPath frequency analysis
    const { templateElements, contentElements } = analyzeXPathFrequency(clusterPages);

    // Find common issues
    const commonIssues = findCommonIssues(pageFindings, pageUrls);

    // Representative page
    const representativeUrl = findRepresentative(clusterFps);

    // Template hash (use representative's hash)
    const repFp = clusterFps.find((fp) => fp.url === representativeUrl) || clusterFps[0];

    return {
      id: `template-${idx + 1}`,
      name: generateTemplateName(pageUrls),
      templateHash: repFp.hashHex,
      pageUrls,
      pageCount: pageUrls.length,
      representativeUrl,
      commonIssues,
      templateElements,
      contentElements,
    };
  });

  // Sort clusters by page count (largest first)
  clusters.sort((a, b) => b.pageCount - a.pageCount);

  // Step 4: Deduplicate findings
  const { deduplicatedFindings, templateFindingsCount } = deduplicateFindings(
    findings,
    clusters
  );

  return {
    clusters,
    fingerprints: fingerprints.map((fp) => ({
      url: fp.url,
      hash: fp.hash,
      hashHex: fp.hashHex,
    })),
    deduplicatedFindings,
    templateFindingsCount,
  };
}
