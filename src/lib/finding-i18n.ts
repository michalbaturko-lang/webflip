import type { Finding } from "./supabase";

type Locale = "en" | "de" | "cs" | "sk";

interface TranslatedText {
  title: string;
  /** Use {0}, {1}, etc. for numeric placeholders extracted from the English description */
  description: string;
}

type FindingTranslations = Record<string, Record<Exclude<Locale, "en">, TranslatedText>>;

/**
 * Extract all numbers (integers and decimals like "3.2" or "0.103") from a string.
 */
function extractNumbers(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) || [];
}

/**
 * Replace {0}, {1}, ... placeholders with extracted values.
 */
function fillTemplate(template: string, values: string[]): string {
  return template.replace(/\{(\d+)\}/g, (_, idx) => values[parseInt(idx)] ?? "?");
}

// ---------------------------------------------------------------------------
// Translation map: English title → { cs, de, sk } with title + description
// Descriptions use {0}, {1}, ... for numbers extracted from the English text.
// ---------------------------------------------------------------------------

const translations: FindingTranslations = {
  // ── Performance ──
  "Slow LCP": {
    cs: { title: "Pomalé LCP", description: "Largest Contentful Paint je {0}s. Mělo by být pod 2,5s." },
    de: { title: "Langsames LCP", description: "Largest Contentful Paint beträgt {0}s. Sollte unter 2,5s liegen." },
    sk: { title: "Pomalé LCP", description: "Largest Contentful Paint je {0}s. Malo by byť pod 2,5s." },
  },
  "LCP needs improvement": {
    cs: { title: "LCP potřebuje zlepšení", description: "LCP je {0}s. Cíl: pod 2,5s." },
    de: { title: "LCP verbesserungsbedürftig", description: "LCP beträgt {0}s. Ziel: unter 2,5s." },
    sk: { title: "LCP potrebuje zlepšenie", description: "LCP je {0}s. Cieľ: pod 2,5s." },
  },
  "Good LCP": {
    cs: { title: "Dobré LCP", description: "LCP je {0}s — rychlé." },
    de: { title: "Gutes LCP", description: "LCP beträgt {0}s — schnell." },
    sk: { title: "Dobré LCP", description: "LCP je {0}s — rýchle." },
  },
  "High layout shift": {
    cs: { title: "Vysoký posun layoutu", description: "CLS je {0}. Mělo by být pod 0,1." },
    de: { title: "Hohe Layoutverschiebung", description: "CLS beträgt {0}. Sollte unter 0,1 liegen." },
    sk: { title: "Vysoký posun layoutu", description: "CLS je {0}. Malo by byť pod 0,1." },
  },
  "CLS needs improvement": {
    cs: { title: "CLS potřebuje zlepšení", description: "CLS je {0}. Cíl: pod 0,1." },
    de: { title: "CLS verbesserungsbedürftig", description: "CLS beträgt {0}. Ziel: unter 0,1." },
    sk: { title: "CLS potrebuje zlepšenie", description: "CLS je {0}. Cieľ: pod 0,1." },
  },
  "Slow First Paint": {
    cs: { title: "Pomalý First Paint", description: "FCP je {0}s. Uživatelé vidí prázdnou obrazovku příliš dlouho." },
    de: { title: "Langsamer First Paint", description: "FCP beträgt {0}s. Nutzer sehen zu lange einen leeren Bildschirm." },
    sk: { title: "Pomalý First Paint", description: "FCP je {0}s. Používatelia vidia prázdnu obrazovku príliš dlho." },
  },
  "High blocking time": {
    cs: { title: "Vysoký čas blokování", description: "Total Blocking Time je {0}ms. Stránka reaguje pomalu." },
    de: { title: "Hohe Blockierzeit", description: "Total Blocking Time beträgt {0}ms. Seite reagiert träge." },
    sk: { title: "Vysoký čas blokovania", description: "Total Blocking Time je {0}ms. Stránka reaguje pomaly." },
  },
  "Very large page": {
    cs: { title: "Velmi velká stránka", description: "Stránka má {0}MB. Měla by být pod 3MB pro mobilní zařízení." },
    de: { title: "Sehr große Seite", description: "Seite ist {0}MB groß. Sollte unter 3MB für Mobilgeräte sein." },
    sk: { title: "Veľmi veľká stránka", description: "Stránka má {0}MB. Mala by byť pod 3MB pre mobilné zariadenia." },
  },
  "Large page size": {
    cs: { title: "Velká velikost stránky", description: "Stránka má {0}MB. Zvažte optimalizaci." },
    de: { title: "Große Seitengröße", description: "Seite ist {0}MB groß. Optimierung empfohlen." },
    sk: { title: "Veľká veľkosť stránky", description: "Stránka má {0}MB. Zvážte optimalizáciu." },
  },
  "No text compression": {
    cs: { title: "Žádná textová komprese", description: "Zapněte gzip/brotli kompresi pro menší přenosovou velikost." },
    de: { title: "Keine Textkomprimierung", description: "Aktivieren Sie gzip/brotli-Komprimierung für kleinere Übertragungsgrößen." },
    sk: { title: "Žiadna textová kompresia", description: "Zapnite gzip/brotli kompresiu pre menšiu prenosovú veľkosť." },
  },
  "No modern image formats": {
    cs: { title: "Žádné moderní obrazové formáty", description: "Použijte WebP/AVIF místo JPEG/PNG pro menší velikost obrázků." },
    de: { title: "Keine modernen Bildformate", description: "Verwenden Sie WebP/AVIF statt JPEG/PNG für kleinere Bildgrößen." },
    sk: { title: "Žiadne moderné obrazové formáty", description: "Použite WebP/AVIF namiesto JPEG/PNG pre menšiu veľkosť obrázkov." },
  },
  "No lazy loading": {
    cs: { title: "Žádné lazy loading", description: "Obrázky mimo zobrazení by mohly být lazy-loadovány pro rychlejší načtení." },
    de: { title: "Kein Lazy Loading", description: "Nicht sichtbare Bilder könnten lazy geladen werden für schnelleres Laden." },
    sk: { title: "Žiadne lazy loading", description: "Obrázky mimo zobrazenia by mohli byť lazy-loadované pre rýchlejšie načítanie." },
  },
  "PageSpeed unavailable": {
    cs: { title: "PageSpeed nedostupný", description: "Nepodařilo se spojit s Google PageSpeed API." },
    de: { title: "PageSpeed nicht verfügbar", description: "Google PageSpeed API konnte nicht erreicht werden." },
    sk: { title: "PageSpeed nedostupný", description: "Nepodarilo sa spojiť s Google PageSpeed API." },
  },

  // ── SEO ──
  "Missing page title": {
    cs: { title: "Chybí titulek stránky", description: "Stránka nemá tag <title>. To je kritické pro pozice ve vyhledávačích." },
    de: { title: "Seitentitel fehlt", description: "Die Seite hat kein <title>-Tag. Kritisch für Suchmaschinen-Rankings." },
    sk: { title: "Chýba titulok stránky", description: "Stránka nemá tag <title>. To je kritické pre pozície vo vyhľadávačoch." },
  },
  "Title too short": {
    cs: { title: "Titulek příliš krátký", description: "Titulek má {0} znaků. Doporučeno: 50-60 znaků." },
    de: { title: "Titel zu kurz", description: "Titel hat {0} Zeichen. Empfohlen: 50-60 Zeichen." },
    sk: { title: "Titulok príliš krátky", description: "Titulok má {0} znakov. Odporúčané: 50-60 znakov." },
  },
  "Title too long": {
    cs: { title: "Titulek příliš dlouhý", description: "Titulek má {0} znaků. Google ořezává po ~60 znacích." },
    de: { title: "Titel zu lang", description: "Titel hat {0} Zeichen. Google schneidet nach ~60 Zeichen ab." },
    sk: { title: "Titulok príliš dlhý", description: "Titulok má {0} znakov. Google orezáva po ~60 znakoch." },
  },
  "Good page title": {
    cs: { title: "Dobrý titulek stránky", description: "Titulek je dobře optimalizovaný ({0} znaků)." },
    de: { title: "Guter Seitentitel", description: "Titel ist gut optimiert ({0} Zeichen)." },
    sk: { title: "Dobrý titulok stránky", description: "Titulok je dobre optimalizovaný ({0} znakov)." },
  },
  "Missing meta description": {
    cs: { title: "Chybí meta popis", description: "Nebyl nalezen meta description. Vyhledávače ho používají ve výsledcích." },
    de: { title: "Meta-Beschreibung fehlt", description: "Keine Meta-Beschreibung gefunden. Suchmaschinen nutzen diese in Ergebnissen." },
    sk: { title: "Chýba meta popis", description: "Nebol nájdený meta description. Vyhľadávače ho používajú vo výsledkoch." },
  },
  "Meta description too short": {
    cs: { title: "Meta popis příliš krátký", description: "Popis má {0} znaků. Doporučeno: 140-160." },
    de: { title: "Meta-Beschreibung zu kurz", description: "Beschreibung hat {0} Zeichen. Empfohlen: 140-160." },
    sk: { title: "Meta popis príliš krátky", description: "Popis má {0} znakov. Odporúčané: 140-160." },
  },
  "Meta description too long": {
    cs: { title: "Meta popis příliš dlouhý", description: "Popis má {0} znaků. Google ořezává po ~160." },
    de: { title: "Meta-Beschreibung zu lang", description: "Beschreibung hat {0} Zeichen. Google schneidet nach ~160 ab." },
    sk: { title: "Meta popis príliš dlhý", description: "Popis má {0} znakov. Google orezáva po ~160." },
  },
  "Good meta description": {
    cs: { title: "Dobrý meta popis", description: "Popis je dobře optimalizovaný ({0} znaků)." },
    de: { title: "Gute Meta-Beschreibung", description: "Beschreibung ist gut optimiert ({0} Zeichen)." },
    sk: { title: "Dobrý meta popis", description: "Popis je dobre optimalizovaný ({0} znakov)." },
  },
  "Missing H1 heading": {
    cs: { title: "Chybí nadpis H1", description: "Nebyl nalezen tag H1. Každá stránka by měla mít právě jeden H1." },
    de: { title: "H1-Überschrift fehlt", description: "Kein H1-Tag gefunden. Jede Seite sollte genau ein H1 haben." },
    sk: { title: "Chýba nadpis H1", description: "Nebol nájdený tag H1. Každá stránka by mala mať práve jeden H1." },
  },
  "Multiple H1 headings": {
    cs: { title: "Více nadpisů H1", description: "Nalezeno {0} tagů H1. Doporučuje se mít právě jeden." },
    de: { title: "Mehrere H1-Überschriften", description: "{0} H1-Tags gefunden. Best Practice ist genau eines." },
    sk: { title: "Viacero nadpisov H1", description: "Nájdených {0} tagov H1. Odporúča sa mať práve jeden." },
  },
  "H1 heading present": {
    cs: { title: "Nadpis H1 přítomen", description: "Stránka má právě jeden nadpis H1." },
    de: { title: "H1-Überschrift vorhanden", description: "Seite hat genau eine H1-Überschrift." },
    sk: { title: "Nadpis H1 prítomný", description: "Stránka má práve jeden nadpis H1." },
  },
  "Broken heading hierarchy": {
    cs: { title: "Narušená hierarchie nadpisů", description: "Nadpisy přeskakují úrovně (např. H1 → H3). Používejte postupné úrovně." },
    de: { title: "Fehlerhafte Überschriftenhierarchie", description: "Überschriften überspringen Ebenen (z.B. H1 → H3). Verwenden Sie aufeinanderfolgende Ebenen." },
    sk: { title: "Narušená hierarchia nadpisov", description: "Nadpisy preskakujú úrovne (napr. H1 → H3). Používajte postupné úrovne." },
  },
  "Poor image alt text coverage": {
    cs: { title: "Slabé pokrytí alt textů", description: "Pouze {0}% obrázků má alt text ({1}/{2} chybí)." },
    de: { title: "Schlechte Alt-Text-Abdeckung", description: "Nur {0}% der Bilder haben Alt-Text ({1}/{2} fehlen)." },
    sk: { title: "Slabé pokrytie alt textov", description: "Iba {0}% obrázkov má alt text ({1}/{2} chýba)." },
  },
  "Incomplete alt text": {
    cs: { title: "Neúplný alt text", description: "{0}% obrázků má alt text. {1} obrázků chybí alt." },
    de: { title: "Unvollständiger Alt-Text", description: "{0}% der Bilder haben Alt-Text. {1} Bilder ohne Alt." },
    sk: { title: "Neúplný alt text", description: "{0}% obrázkov má alt text. {1} obrázkov chýba alt." },
  },
  "Good alt text coverage": {
    cs: { title: "Dobré pokrytí alt textů", description: "{0}% obrázků má alt text." },
    de: { title: "Gute Alt-Text-Abdeckung", description: "{0}% der Bilder haben Alt-Text." },
    sk: { title: "Dobré pokrytie alt textov", description: "{0}% obrázkov má alt text." },
  },
  "Missing canonical tag": {
    cs: { title: "Chybí kanonický tag", description: "Není zadána kanonická URL. Pomáhá předcházet problémům s duplicitním obsahem." },
    de: { title: "Canonical-Tag fehlt", description: "Keine kanonische URL angegeben. Hilft gegen Duplicate-Content-Probleme." },
    sk: { title: "Chýba kanonický tag", description: "Nie je zadaná kanonická URL. Pomáha predchádzať problémom s duplicitným obsahom." },
  },
  "Canonical tag present": {
    cs: { title: "Kanonický tag přítomen", description: "Stránka má kanonickou URL." },
    de: { title: "Canonical-Tag vorhanden", description: "Seite hat eine kanonische URL." },
    sk: { title: "Kanonický tag prítomný", description: "Stránka má kanonickú URL." },
  },
  "Missing Open Graph tags": {
    cs: { title: "Chybí Open Graph tagy", description: "Žádné OG tagy. Sdílení na sociálních sítích použije fallback." },
    de: { title: "Open Graph Tags fehlen", description: "Keine OG-Tags. Social Sharing nutzt Fallbacks." },
    sk: { title: "Chýbajú Open Graph tagy", description: "Žiadne OG tagy. Zdieľanie na sociálnych sieťach použije fallback." },
  },
  "Incomplete Open Graph": {
    cs: { title: "Neúplný Open Graph", description: "Pouze {0}/3 základních OG tagů (title, description, image)." },
    de: { title: "Unvollständiger Open Graph", description: "Nur {0}/3 wesentliche OG-Tags vorhanden (title, description, image)." },
    sk: { title: "Neúplný Open Graph", description: "Iba {0}/3 základných OG tagov (title, description, image)." },
  },
  "Open Graph tags complete": {
    cs: { title: "Open Graph tagy kompletní", description: "Všechny základní OG tagy jsou přítomny." },
    de: { title: "Open Graph Tags vollständig", description: "Alle wesentlichen OG-Tags sind vorhanden." },
    sk: { title: "Open Graph tagy kompletné", description: "Všetky základné OG tagy sú prítomné." },
  },
  "No structured data": {
    cs: { title: "Žádná strukturovaná data", description: "Nebyl nalezen Schema.org markup (JSON-LD ani Microdata). Rich výsledky se nezobrazí." },
    de: { title: "Keine strukturierten Daten", description: "Kein Schema.org-Markup gefunden (JSON-LD oder Microdata). Keine Rich Results." },
    sk: { title: "Žiadne štruktúrované dáta", description: "Nebol nájdený Schema.org markup (JSON-LD ani Microdata). Rich výsledky sa nezobrazia." },
  },
  "Structured data present": {
    cs: { title: "Strukturovaná data přítomna", description: "Nalezeno {0} JSON-LD blok(ů) a {1} microdata element(ů)." },
    de: { title: "Strukturierte Daten vorhanden", description: "{0} JSON-LD-Block(e) und {1} Microdata-Element(e) gefunden." },
    sk: { title: "Štruktúrované dáta prítomné", description: "Nájdených {0} JSON-LD blok(ov) a {1} microdata element(ov)." },
  },
  "Few internal links": {
    cs: { title: "Málo interních odkazů", description: "Pouze {0} interních odkazů. Interní prolinkování pomáhá SEO." },
    de: { title: "Wenige interne Links", description: "Nur {0} interne Links gefunden. Interne Verlinkung hilft SEO." },
    sk: { title: "Málo interných odkazov", description: "Iba {0} interných odkazov. Interné prelinkovanie pomáha SEO." },
  },
  "Missing viewport meta": {
    cs: { title: "Chybí viewport meta tag", description: "Žádný viewport meta tag. Stránka se nezobrazí správně na mobilních zařízeních." },
    de: { title: "Viewport-Meta fehlt", description: "Kein Viewport-Meta-Tag. Seite wird auf Mobilgeräten nicht richtig dargestellt." },
    sk: { title: "Chýba viewport meta tag", description: "Žiadny viewport meta tag. Stránka sa nezobrazí správne na mobilných zariadeniach." },
  },
  "Viewport not responsive": {
    cs: { title: "Viewport není responzivní", description: "Viewport meta neobsahuje width=device-width." },
    de: { title: "Viewport nicht responsiv", description: "Viewport-Meta enthält kein width=device-width." },
    sk: { title: "Viewport nie je responzívny", description: "Viewport meta neobsahuje width=device-width." },
  },
  "Missing lang attribute": {
    cs: { title: "Chybí atribut lang", description: "HTML element nemá atribut lang. Pomáhá vyhledávačům a přístupnosti." },
    de: { title: "Lang-Attribut fehlt", description: "HTML-Element hat kein lang-Attribut. Hilft Suchmaschinen und Barrierefreiheit." },
    sk: { title: "Chýba atribút lang", description: "HTML element nemá atribút lang. Pomáha vyhľadávačom a prístupnosti." },
  },
  "Page set to noindex": {
    cs: { title: "Stránka má noindex", description: "Robots meta tag má noindex — tato stránka se nezobrazí ve výsledcích vyhledávání." },
    de: { title: "Seite auf noindex gesetzt", description: "Robots-Meta-Tag hat noindex — diese Seite erscheint nicht in Suchergebnissen." },
    sk: { title: "Stránka má noindex", description: "Robots meta tag má noindex — táto stránka sa nezobrazí vo výsledkoch vyhľadávania." },
  },
  "Missing Twitter Card": {
    cs: { title: "Chybí Twitter Card", description: "Žádné Twitter Card meta tagy. Tweety s odkazy nebudou mít bohatý náhled." },
    de: { title: "Twitter Card fehlt", description: "Keine Twitter-Card-Meta-Tags. Tweets mit Links zeigen keine Rich-Previews." },
    sk: { title: "Chýba Twitter Card", description: "Žiadne Twitter Card meta tagy. Tweety s odkazmi nebudú mať bohatý náhľad." },
  },

  // ── Security ──
  "No HTTPS": {
    cs: { title: "Bez HTTPS", description: "Stránka nepoužívá HTTPS. Všechny moderní weby musí používat SSL/TLS šifrování." },
    de: { title: "Kein HTTPS", description: "Seite nutzt kein HTTPS. Alle modernen Websites müssen SSL/TLS-Verschlüsselung verwenden." },
    sk: { title: "Bez HTTPS", description: "Stránka nepoužíva HTTPS. Všetky moderné weby musia používať SSL/TLS šifrovanie." },
  },
  "HTTPS enabled": {
    cs: { title: "HTTPS aktivní", description: "Stránka používá HTTPS šifrování." },
    de: { title: "HTTPS aktiviert", description: "Seite nutzt HTTPS-Verschlüsselung." },
    sk: { title: "HTTPS aktívne", description: "Stránka používa HTTPS šifrovanie." },
  },
  "Mixed content detected": {
    cs: { title: "Detekován smíšený obsah", description: "{0} zdroj(ů) načítaných přes HTTP na HTTPS stránce." },
    de: { title: "Mixed Content erkannt", description: "{0} Ressource(n) über HTTP auf einer HTTPS-Seite geladen." },
    sk: { title: "Detekovaný zmiešaný obsah", description: "{0} zdroj(ov) načítaných cez HTTP na HTTPS stránke." },
  },
  "Missing CSP header": {
    cs: { title: "Chybí CSP hlavička", description: "Žádná Content-Security-Policy hlavička. CSP pomáhá předcházet XSS útokům." },
    de: { title: "CSP-Header fehlt", description: "Kein Content-Security-Policy-Header. CSP hilft gegen XSS-Angriffe." },
    sk: { title: "Chýba CSP hlavička", description: "Žiadna Content-Security-Policy hlavička. CSP pomáha predchádzať XSS útokom." },
  },
  "CSP header present": {
    cs: { title: "CSP hlavička přítomna", description: "Content-Security-Policy hlavička je nastavena." },
    de: { title: "CSP-Header vorhanden", description: "Content-Security-Policy-Header ist gesetzt." },
    sk: { title: "CSP hlavička prítomná", description: "Content-Security-Policy hlavička je nastavená." },
  },
  "Missing HSTS header": {
    cs: { title: "Chybí HSTS hlavička", description: "Žádná Strict-Transport-Security hlavička. HSTS nutí prohlížeče používat HTTPS." },
    de: { title: "HSTS-Header fehlt", description: "Kein Strict-Transport-Security-Header. HSTS zwingt Browser zu HTTPS." },
    sk: { title: "Chýba HSTS hlavička", description: "Žiadna Strict-Transport-Security hlavička. HSTS núti prehliadače používať HTTPS." },
  },
  "HSTS enabled": {
    cs: { title: "HSTS aktivní", description: "Strict-Transport-Security hlavička je přítomna." },
    de: { title: "HSTS aktiviert", description: "Strict-Transport-Security-Header ist vorhanden." },
    sk: { title: "HSTS aktívne", description: "Strict-Transport-Security hlavička je prítomná." },
  },
  "Clickjacking risk": {
    cs: { title: "Riziko clickjackingu", description: "Žádné X-Frame-Options nebo CSP frame-ancestors. Stránka může být zranitelná." },
    de: { title: "Clickjacking-Risiko", description: "Kein X-Frame-Options oder CSP frame-ancestors. Seite könnte anfällig sein." },
    sk: { title: "Riziko clickjackingu", description: "Žiadne X-Frame-Options alebo CSP frame-ancestors. Stránka môže byť zraniteľná." },
  },
  "Missing X-Content-Type-Options": {
    cs: { title: "Chybí X-Content-Type-Options", description: "Hlavička není nastavena. Přidejte 'nosniff' proti MIME type sniffingu." },
    de: { title: "X-Content-Type-Options fehlt", description: "Header nicht gesetzt. 'nosniff' hinzufügen gegen MIME-Type-Sniffing." },
    sk: { title: "Chýba X-Content-Type-Options", description: "Hlavička nie je nastavená. Pridajte 'nosniff' proti MIME type sniffingu." },
  },
  "No Referrer-Policy": {
    cs: { title: "Žádná Referrer-Policy", description: "Referrer-Policy hlavička není nastavena. Může unikovat URL info třetím stranám." },
    de: { title: "Keine Referrer-Policy", description: "Referrer-Policy-Header nicht gesetzt. URL-Infos könnten an Dritte gelangen." },
    sk: { title: "Žiadna Referrer-Policy", description: "Referrer-Policy hlavička nie je nastavená. Môže unikať URL info tretím stranám." },
  },
  "No Permissions-Policy": {
    cs: { title: "Žádná Permissions-Policy", description: "Zvažte přidání Permissions-Policy pro kontrolu funkcí prohlížeče." },
    de: { title: "Keine Permissions-Policy", description: "Erwägen Sie Permissions-Policy zur Kontrolle von Browser-Funktionen." },
    sk: { title: "Žiadna Permissions-Policy", description: "Zvážte pridanie Permissions-Policy pre kontrolu funkcií prehliadača." },
  },
  "Could not check headers": {
    cs: { title: "Nelze zkontrolovat hlavičky", description: "Nepodařilo se získat HTTP hlavičky pro bezpečnostní analýzu." },
    de: { title: "Header-Prüfung fehlgeschlagen", description: "HTTP-Header konnten nicht für die Sicherheitsanalyse abgerufen werden." },
    sk: { title: "Nedá sa skontrolovať hlavičky", description: "Nepodarilo sa získať HTTP hlavičky pre bezpečnostnú analýzu." },
  },
  "Exposed email addresses": {
    cs: { title: "Vystavené emailové adresy", description: "Nalezeno {0} emailových adres v textu stránky. Zvažte obfuskaci." },
    de: { title: "Exponierte E-Mail-Adressen", description: "{0} E-Mail-Adresse(n) im Seitentext gefunden. Verschleierung empfohlen." },
    sk: { title: "Vystavené emailové adresy", description: "Nájdených {0} emailových adries v texte stránky. Zvážte obfuskáciu." },
  },
  "No cookie consent detected": {
    cs: { title: "Žádný cookie consent", description: "Nebyl nalezen banner pro souhlas s cookies. Vyžadováno GDPR/ePrivacy v EU." },
    de: { title: "Kein Cookie-Consent erkannt", description: "Kein Cookie-Consent-Banner gefunden. Erforderlich durch DSGVO/ePrivacy in der EU." },
    sk: { title: "Žiadny cookie consent", description: "Nebol nájdený banner pre súhlas s cookies. Vyžadované GDPR/ePrivacy v EÚ." },
  },
  "No privacy policy link": {
    cs: { title: "Žádný odkaz na ochranu soukromí", description: "Nebyl nalezen odkaz na stránku s ochranou soukromí. Právně vyžadováno." },
    de: { title: "Kein Datenschutz-Link", description: "Kein Link zur Datenschutzseite gefunden. Gesetzlich vorgeschrieben." },
    sk: { title: "Žiadny odkaz na ochranu súkromia", description: "Nebol nájdený odkaz na stránku s ochranou súkromia. Právne vyžadované." },
  },
  "Privacy policy present": {
    cs: { title: "Ochrana soukromí přítomna", description: "Odkaz na stránku s ochranou soukromí nalezen." },
    de: { title: "Datenschutzerklärung vorhanden", description: "Link zur Datenschutzseite gefunden." },
    sk: { title: "Ochrana súkromia prítomná", description: "Odkaz na stránku s ochranou súkromia nájdený." },
  },
  "Unsafe JavaScript patterns": {
    cs: { title: "Nebezpečné JavaScript vzory", description: "Nalezena nebezpečná DOM manipulace v inline skriptech. Bezpečnostní riziko." },
    de: { title: "Unsichere JavaScript-Muster", description: "Unsichere DOM-Manipulation in Inline-Skripten gefunden. Sicherheitsrisiko." },
    sk: { title: "Nebezpečné JavaScript vzory", description: "Nájdená nebezpečná DOM manipulácia v inline skriptoch. Bezpečnostné riziko." },
  },

  // ── UX ──
  "No viewport meta tag": {
    cs: { title: "Chybí viewport meta tag", description: "Stránka se nebude správně škálovat na mobilních zařízeních." },
    de: { title: "Kein Viewport-Meta-Tag", description: "Seite wird auf Mobilgeräten nicht richtig skaliert." },
    sk: { title: "Chýba viewport meta tag", description: "Stránka sa nebude správne škálovať na mobilných zariadeniach." },
  },
  "Viewport not fully responsive": {
    cs: { title: "Viewport není plně responzivní", description: "Viewport meta nenastavuje width=device-width." },
    de: { title: "Viewport nicht vollständig responsiv", description: "Viewport-Meta setzt kein width=device-width." },
    sk: { title: "Viewport nie je plne responzívny", description: "Viewport meta nenastavuje width=device-width." },
  },
  "Responsive viewport": {
    cs: { title: "Responzivní viewport", description: "Mobilní viewport je správně nastaven." },
    de: { title: "Responsiver Viewport", description: "Mobiler Viewport ist korrekt konfiguriert." },
    sk: { title: "Responzívny viewport", description: "Mobilný viewport je správne nastavený." },
  },
  "Poor semantic structure": {
    cs: { title: "Špatná sémantická struktura", description: "Pouze {0}/4 sémantických elementů (nav, main, header, footer)." },
    de: { title: "Schlechte semantische Struktur", description: "Nur {0}/4 semantische Elemente (nav, main, header, footer)." },
    sk: { title: "Zlá sémantická štruktúra", description: "Iba {0}/4 sémantických elementov (nav, main, header, footer)." },
  },
  "Partial semantic HTML": {
    cs: { title: "Částečné sémantické HTML", description: "{0}/4 sémantických elementů přítomno. Zvažte doplnění chybějících." },
    de: { title: "Teilweise semantisches HTML", description: "{0}/4 semantische Elemente vorhanden. Ergänzen Sie fehlende." },
    sk: { title: "Čiastočné sémantické HTML", description: "{0}/4 sémantických elementov prítomných. Zvážte doplnenie chýbajúcich." },
  },
  "Good semantic structure": {
    cs: { title: "Dobrá sémantická struktura", description: "Všechny hlavní sémantické elementy přítomny (nav, main, header, footer)." },
    de: { title: "Gute semantische Struktur", description: "Alle wichtigen semantischen Elemente vorhanden (nav, main, header, footer)." },
    sk: { title: "Dobrá sémantická štruktúra", description: "Všetky hlavné sémantické elementy prítomné (nav, main, header, footer)." },
  },
  "No navigation found": {
    cs: { title: "Žádná navigace", description: "Nebyly nalezeny navigační odkazy. Uživatelé nemohou procházet web." },
    de: { title: "Keine Navigation gefunden", description: "Keine Navigationslinks erkannt. Nutzer können die Seite nicht erkunden." },
    sk: { title: "Žiadna navigácia", description: "Neboli nájdené navigačné odkazy. Používatelia nemôžu prechádzať web." },
  },
  "Minimal navigation": {
    cs: { title: "Minimální navigace", description: "Pouze {0} navigační odkaz(y). Zvažte přidání dalších." },
    de: { title: "Minimale Navigation", description: "Nur {0} Navigationslink(s). Mehr Links empfohlen." },
    sk: { title: "Minimálna navigácia", description: "Iba {0} navigačný odkaz(y). Zvážte pridanie ďalších." },
  },
  "No clear CTA buttons": {
    cs: { title: "Žádné jasné CTA tlačítka", description: "Nebyly nalezeny výrazné call-to-action tlačítka." },
    de: { title: "Keine klaren CTA-Buttons", description: "Keine prominenten Call-to-Action-Buttons erkannt." },
    sk: { title: "Žiadne jasné CTA tlačidlá", description: "Neboli nájdené výrazné call-to-action tlačidlá." },
  },
  "CTA buttons present": {
    cs: { title: "CTA tlačítka přítomna", description: "Nalezeno {0} call-to-action element(ů)." },
    de: { title: "CTA-Buttons vorhanden", description: "{0} Call-to-Action-Element(e) gefunden." },
    sk: { title: "CTA tlačidlá prítomné", description: "Nájdených {0} call-to-action element(ov)." },
  },
  "Form inputs missing labels": {
    cs: { title: "Formuláře bez popisků", description: "Některé formulářové vstupy nemají popisky ani placeholdery." },
    de: { title: "Formularfelder ohne Labels", description: "Einige Formularfelder haben weder Labels noch Platzhalter." },
    sk: { title: "Formuláre bez popiskov", description: "Niektoré formulárové vstupy nemajú popisky ani placeholdery." },
  },
  "No required field indicators": {
    cs: { title: "Žádné indikátory povinných polí", description: "Formulář nemá atributy 'required'. Uživatelé neví, která pole jsou povinná." },
    de: { title: "Keine Pflichtfeld-Indikatoren", description: "Formular hat keine 'required'-Attribute. Nutzer wissen nicht, welche Felder Pflicht sind." },
    sk: { title: "Žiadne indikátory povinných polí", description: "Formulár nemá atribúty 'required'. Používatelia nevedia, ktoré polia sú povinné." },
  },
  "Small touch targets": {
    cs: { title: "Malé dotykové oblasti", description: "{0} interaktivních elementů může být příliš malých pro dotyk (< 44px)." },
    de: { title: "Kleine Touch-Ziele", description: "{0} interaktive Elemente könnten zu klein für Touch sein (< 44px)." },
    sk: { title: "Malé dotykové oblasti", description: "{0} interaktívnych elementov môže byť príliš malých pre dotyk (< 44px)." },
  },
  "No accessibility features": {
    cs: { title: "Žádné funkce přístupnosti", description: "Žádné ARIA atributy, role nebo skip linky. Přístupnost je důležitá." },
    de: { title: "Keine Barrierefreiheit", description: "Keine ARIA-Labels, Rollen oder Skip-Links gefunden." },
    sk: { title: "Žiadne funkcie prístupnosti", description: "Žiadne ARIA atribúty, role alebo skip linky. Prístupnosť je dôležitá." },
  },
  "Limited accessibility": {
    cs: { title: "Omezená přístupnost", description: "Základní funkce přístupnosti přítomny, ale mohou být vylepšeny." },
    de: { title: "Eingeschränkte Barrierefreiheit", description: "Grundlegende Barrierefreiheit vorhanden, aber verbesserungsfähig." },
    sk: { title: "Obmedzená prístupnosť", description: "Základné funkcie prístupnosti prítomné, ale môžu byť vylepšené." },
  },
  "Good accessibility": {
    cs: { title: "Dobrá přístupnost", description: "ARIA atributy a funkce přístupnosti jsou dobře implementovány." },
    de: { title: "Gute Barrierefreiheit", description: "ARIA-Attribute und Barrierefreiheits-Features sind gut implementiert." },
    sk: { title: "Dobrá prístupnosť", description: "ARIA atribúty a funkcie prístupnosti sú dobre implementované." },
  },
  "No loading indicators": {
    cs: { title: "Žádné indikátory načítání", description: "Žádné skeleton obrazovky nebo loading indikátory. Zvažte přidání." },
    de: { title: "Keine Ladeindikatoren", description: "Keine Skeleton-Screens oder Ladeindikatoren erkannt." },
    sk: { title: "Žiadne indikátory načítania", description: "Žiadne skeleton obrazovky alebo loading indikátory. Zvážte pridanie." },
  },
  "Weak visual hierarchy": {
    cs: { title: "Slabá vizuální hierarchie", description: "Pouze {0} nadpisů (H1-H3). Více nadpisů pomáhá uživatelům procházet obsah." },
    de: { title: "Schwache visuelle Hierarchie", description: "Nur {0} Überschriften (H1-H3). Mehr Überschriften helfen beim Scannen." },
    sk: { title: "Slabá vizuálna hierarchia", description: "Iba {0} nadpisov (H1-H3). Viac nadpisov pomáha používateľom prechádzať obsah." },
  },
  "External links without target": {
    cs: { title: "Externí odkazy bez target", description: "Některé externí odkazy se neotevírají v nové záložce." },
    de: { title: "Externe Links ohne Target", description: "Einige externe Links öffnen sich nicht in einem neuen Tab." },
    sk: { title: "Externé odkazy bez target", description: "Niektoré externé odkazy sa neotvárajú v novej záložke." },
  },

  // ── Content ──
  "Very thin content": {
    cs: { title: "Velmi tenký obsah", description: "Pouze ~{0} slov. Stránky potřebují podstatný obsah pro důvěryhodnost a SEO." },
    de: { title: "Sehr dünner Inhalt", description: "Nur ~{0} Wörter. Seiten brauchen substanziellen Inhalt für Glaubwürdigkeit und SEO." },
    sk: { title: "Veľmi tenký obsah", description: "Iba ~{0} slov. Stránky potrebujú podstatný obsah pre dôveryhodnosť a SEO." },
  },
  "Limited content": {
    cs: { title: "Omezený obsah", description: "~{0} slov. Zvažte přidání podrobnějších informací." },
    de: { title: "Begrenzter Inhalt", description: "~{0} Wörter. Erwägen Sie detailliertere Informationen." },
    sk: { title: "Obmedzený obsah", description: "~{0} slov. Zvážte pridanie podrobnejších informácií." },
  },
  "Good content volume": {
    cs: { title: "Dobrý objem obsahu", description: "~{0} slov obsahu." },
    de: { title: "Gutes Inhaltsvolumen", description: "~{0} Wörter Inhalt." },
    sk: { title: "Dobrý objem obsahu", description: "~{0} slov obsahu." },
  },
  "No contact information": {
    cs: { title: "Žádné kontaktní údaje", description: "Žádný telefon, email nebo adresa. Kontaktní údaje budují důvěru." },
    de: { title: "Keine Kontaktinformationen", description: "Kein Telefon, E-Mail oder Adresse. Kontaktdaten schaffen Vertrauen." },
    sk: { title: "Žiadne kontaktné údaje", description: "Žiadny telefón, email alebo adresa. Kontaktné údaje budujú dôveru." },
  },
  "Contact info present": {
    cs: { title: "Kontaktní údaje přítomny", description: "Nalezeno {0} kontaktních signálů (telefon/email/adresa)." },
    de: { title: "Kontaktinfos vorhanden", description: "{0} Kontaktsignal(e) gefunden (Telefon/E-Mail/Adresse)." },
    sk: { title: "Kontaktné údaje prítomné", description: "Nájdených {0} kontaktných signálov (telefón/email/adresa)." },
  },
  "No trust signals": {
    cs: { title: "Žádné signály důvěry", description: "Nebyly nalezeny recenze, reference ani odznaky důvěry. Sociální důkaz zvyšuje konverze." },
    de: { title: "Keine Vertrauenssignale", description: "Keine Testimonials, Bewertungen oder Trust-Badges. Social Proof steigert Conversions." },
    sk: { title: "Žiadne signály dôvery", description: "Neboli nájdené recenzie, referencie ani odznaky dôvery. Sociálny dôkaz zvyšuje konverzie." },
  },
  "Trust signals found": {
    cs: { title: "Signály důvěry nalezeny", description: "Byly detekovány recenze nebo prvky důvěry." },
    de: { title: "Vertrauenssignale gefunden", description: "Testimonials oder Vertrauenselemente erkannt." },
    sk: { title: "Signály dôvery nájdené", description: "Boli detekované recenzie alebo prvky dôvery." },
  },
  "Outdated copyright": {
    cs: { title: "Zastaralý copyright", description: "Copyright rok je {0}. Aktualizujte na {1}." },
    de: { title: "Veraltetes Copyright", description: "Copyright-Jahr ist {0}. Aktualisieren Sie auf {1}." },
    sk: { title: "Zastaraný copyright", description: "Copyright rok je {0}. Aktualizujte na {1}." },
  },
  "Current copyright year": {
    cs: { title: "Aktuální copyright", description: "Copyright rok {0} je aktuální." },
    de: { title: "Aktuelles Copyright", description: "Copyright-Jahr {0} ist aktuell." },
    sk: { title: "Aktuálny copyright", description: "Copyright rok {0} je aktuálny." },
  },
  "AI analysis unavailable": {
    cs: { title: "AI analýza nedostupná", description: "Nepodařilo se provést hloubkovou analýzu obsahu. Základní kontroly dokončeny." },
    de: { title: "KI-Analyse nicht verfügbar", description: "Tiefenanalyse konnte nicht durchgeführt werden. Grundprüfungen abgeschlossen." },
    sk: { title: "AI analýza nedostupná", description: "Nepodarilo sa vykonať hĺbkovú analýzu obsahu. Základné kontroly dokončené." },
  },

  // ── AI Visibility ──
  "Blocked from AI crawlers": {
    cs: { title: "Blokováno pro AI crawlery", description: "Robots meta blokuje indexaci. AI systémy jako ChatGPT, Perplexity nebudou tento web citovat." },
    de: { title: "Für KI-Crawler blockiert", description: "Robots-Meta blockiert Indexierung. KI-Systeme wie ChatGPT, Perplexity werden diese Seite nicht referenzieren." },
    sk: { title: "Blokované pre AI crawlery", description: "Robots meta blokuje indexáciu. AI systémy ako ChatGPT, Perplexity nebudú tento web citovať." },
  },
  "AI-crawlable": {
    cs: { title: "Dostupné pro AI", description: "Žádné omezení robotů bránící AI systémům v přístupu k obsahu." },
    de: { title: "KI-crawlbar", description: "Keine Robots-Einschränkungen, die KI-Systeme am Zugriff hindern." },
    sk: { title: "Dostupné pre AI", description: "Žiadne obmedzenia robotov brániace AI systémom v prístupe k obsahu." },
  },
  "Poor content structure": {
    cs: { title: "Špatná struktura obsahu", description: "Málo nadpisů, odstavců a seznamů. AI systémy potřebují dobře strukturovaný obsah." },
    de: { title: "Schlechte Inhaltsstruktur", description: "Wenige Überschriften, Absätze und Listen. KI-Systeme brauchen gut strukturierten Inhalt." },
    sk: { title: "Zlá štruktúra obsahu", description: "Málo nadpisov, odstavcov a zoznamov. AI systémy potrebujú dobre štruktúrovaný obsah." },
  },
  "Moderate content structure": {
    cs: { title: "Průměrná struktura obsahu", description: "Struktura obsahu je ok, ale mohla by být vylepšena více sekcemi." },
    de: { title: "Mäßige Inhaltsstruktur", description: "Inhaltsstruktur ist okay, könnte aber mit mehr Abschnitten verbessert werden." },
    sk: { title: "Priemerná štruktúra obsahu", description: "Štruktúra obsahu je ok, ale mohla by byť vylepšená viac sekciami." },
  },
  "Good content structure": {
    cs: { title: "Dobrá struktura obsahu", description: "Dobře organizováno s nadpisy, odstavci a seznamy — ideální pro AI." },
    de: { title: "Gute Inhaltsstruktur", description: "Gut organisiert mit Überschriften, Absätzen und Listen — ideal für KI." },
    sk: { title: "Dobrá štruktúra obsahu", description: "Dobre organizované s nadpismi, odsekmi a zoznamami — ideálne pre AI." },
  },
  "FAQ Schema present": {
    cs: { title: "FAQ Schema přítomno", description: "FAQPage schema markup nalezen. AI asistenti mohou přímo odpovídat z vašeho FAQ." },
    de: { title: "FAQ-Schema vorhanden", description: "FAQPage-Schema-Markup gefunden. KI-Assistenten können direkt aus Ihrem FAQ antworten." },
    sk: { title: "FAQ Schema prítomné", description: "FAQPage schema markup nájdený. AI asistenti môžu priamo odpovedať z vášho FAQ." },
  },
  "FAQ without schema": {
    cs: { title: "FAQ bez schématu", description: "FAQ obsah existuje, ale chybí FAQPage schema markup. Přidejte ho pro AI systémy." },
    de: { title: "FAQ ohne Schema", description: "FAQ-Inhalt vorhanden, aber kein FAQPage-Schema-Markup. Für KI-Systeme hinzufügen." },
    sk: { title: "FAQ bez schémy", description: "FAQ obsah existuje, ale chýba FAQPage schema markup. Pridajte ho pre AI systémy." },
  },
  "No FAQ section": {
    cs: { title: "Žádná FAQ sekce", description: "Žádný FAQ obsah ani schéma. FAQ stránky jsou hojně využívány AI asistenty." },
    de: { title: "Kein FAQ-Bereich", description: "Kein FAQ-Inhalt oder Schema. FAQ-Seiten werden häufig von KI-Assistenten genutzt." },
    sk: { title: "Žiadna FAQ sekcia", description: "Žiadny FAQ obsah ani schéma. FAQ stránky sú hojne využívané AI asistentmi." },
  },
  "Weak brand signals": {
    cs: { title: "Slabé signály značky", description: "Identita značky není silně zastoupena. AI systémy nemusí přesně reprezentovat vaši značku." },
    de: { title: "Schwache Markensignale", description: "Markenidentität nicht stark vertreten. KI-Systeme könnten Ihre Marke ungenau darstellen." },
    sk: { title: "Slabé signály značky", description: "Identita značky nie je silne zastúpená. AI systémy nemusia presne reprezentovať vašu značku." },
  },
  "Strong brand presence": {
    cs: { title: "Silná přítomnost značky", description: "Značka je dobře zastoupena v titulku, nadpisech a struktuře obsahu." },
    de: { title: "Starke Markenpräsenz", description: "Marke ist gut vertreten in Titel, Überschriften und Inhaltsstruktur." },
    sk: { title: "Silná prítomnosť značky", description: "Značka je dobre zastúpená v titulku, nadpisoch a štruktúre obsahu." },
  },
  "No Schema.org markup": {
    cs: { title: "Žádný Schema.org markup", description: "Žádná strukturovaná data. Schema.org pomáhá AI systémům pochopit kontext obsahu." },
    de: { title: "Kein Schema.org-Markup", description: "Keine strukturierten Daten. Schema.org hilft KI-Systemen den Inhaltskontext zu verstehen." },
    sk: { title: "Žiadny Schema.org markup", description: "Žiadne štruktúrované dáta. Schema.org pomáha AI systémom pochopiť kontext obsahu." },
  },
  "Thin content": {
    cs: { title: "Tenký obsah", description: "Pouze ~{0} slov. AI systémy potřebují podstatný obsah pro přesné citace." },
    de: { title: "Dünner Inhalt", description: "Nur ~{0} Wörter. KI-Systeme brauchen substanziellen Inhalt für genaue Referenzen." },
    sk: { title: "Tenký obsah", description: "Iba ~{0} slov. AI systémy potrebujú podstatný obsah pre presné citácie." },
  },
};

/**
 * Translate a finding's title and description to the given locale.
 * Falls back to the original English text if no translation is found.
 */
export function translateFinding(finding: Finding, locale: string): Finding {
  if (locale === "en") return finding;

  const localeKey = locale as Exclude<Locale, "en">;
  const entry = translations[finding.title];

  if (!entry || !entry[localeKey]) return finding;

  const { title, description } = entry[localeKey];
  const numbers = extractNumbers(finding.description);

  return {
    ...finding,
    title,
    description: fillTemplate(description, numbers),
  };
}

/**
 * Translate an array of findings.
 */
export function translateFindings(findings: Finding[], locale: string): Finding[] {
  return findings.map((f) => translateFinding(f, locale));
}
