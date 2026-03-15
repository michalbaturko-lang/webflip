# CLAUDE.md — Instrukce pro Claude Code

Tento soubor definuje pravidla a kontext pro práci s tímto projektem. Claude Code ho čte na začátku každé session.

## Povinná reference

> **Při práci na šablonách (`src/templates/`), generování HTML (`src/lib/generate-html.ts`) nebo jakékoli úpravě obsahu webu VŽDY nejdřív přečti [docs/TEMPLATE-STANDARDS.md](docs/TEMPLATE-STANDARDS.md).**

Tento dokument obsahuje 11 oblastí pravidel kvality, které MUSÍ být dodržovány při každém commitu.

## Architektura projektu

- **Framework:** Next.js App Router (v16), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL), API routes v `src/app/api/`
- **AI:** Anthropic SDK (Claude Haiku) pro extrakci obsahu
- **i18n:** next-intl (cs, sk, en, de)
- **Crawling:** Cheerio pro HTML parsing

## Šablonový systém

### Šablony (3 varianty)
- `src/templates/corporate-clean.html`
- `src/templates/elegant-minimal.html`
- `src/templates/modern-bold.html`

### Klíčové funkce (`src/lib/generate-html.ts`)
- **`generateHtmlVariants()`** — hlavní entry point, generuje HTML pro všechny varianty
- **`extractStructuredContent()`** — extrakce strukturovaných dat z crawlu přes Claude Haiku
- **`fillTemplate()`** — plnění šablon daty (proměnné, podmínky, opakující se sekce)
- **`buildBusinessContext()`** — business intelligence kontext pro generování
- **`postProcessHtml()`** — meta tagy, accessibility CSS
- **`validateHtml()`** — kontrola nevyplněných proměnných

### Placeholder systém
- **`TEMPLATE_VAR_*`** — skalární proměnné (název, barva, text...)
- **`<!-- IF:field -->...<!-- ENDIF:field -->`** — podmíněné renderování sekcí
- **`<!-- REPEAT:section -->...<!-- ENDREPEAT:section -->`** — opakující se bloky (služby, testimonials, FAQ...)

## Workflow generování

1. Uživatel zadá URL → `analyze` API route
2. Crawl webu (Cheerio) + PageSpeed skóre
3. Claude Haiku extrahuje strukturovaný obsah
4. `fillTemplate()` naplní 3 šablony daty
5. Výsledek uložen do Supabase, vygenerován token
6. Uživatel si prohlíží/edituje varianty v preview UI

## Pravidla pro vývoj

1. **Šablony:** Před jakoukoli změnou šablon přečti `docs/TEMPLATE-STANDARDS.md`
2. **i18n:** Žádné hardcoded stringy v šablonách — vše přes `TEMPLATE_VAR_*` a `tt()` funkci
3. **Prázdné sekce:** Sekce bez dat se nesmí renderovat (ani nadpis, ani nav odkaz)
4. **Obrázky:** Každý `<img>` musí mít `onerror` fallback a popisný alt text v jazyce stránky
5. **Bezpečnost:** Vždy escapovat uživatelský obsah (`escapeHtml()`, `escapeAttr()`)
