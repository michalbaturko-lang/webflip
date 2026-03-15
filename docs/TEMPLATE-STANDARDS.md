# Template Quality Standards

Tento dokument definuje závazná pravidla pro generování webů ze šablon. Všechna pravidla MUSÍ být dodržena při každém commitu a při každé úpravě šablon nebo `generate-html.ts`.

---

## 1. LOKALIZACE (i18n)

### Základní princip
**Nulová tolerance k jazykovému mixu.** KAŽDÝ viditelný řetězec musí jít přes i18n systém (`TEMPLATE_VAR_*` proměnné + `tt()` funkce).

### Kontrolní seznam — všechny tyto elementy MUSÍ být lokalizované:
- [ ] Navigační položky
- [ ] CTA tlačítka (texty i aria-labels)
- [ ] Nadpisy sekcí (h1, h2, h3)
- [ ] Podtitulky sekcí
- [ ] Footer sloupce (nadpisy i položky)
- [ ] Footer legal texty (copyright, podmínky)
- [ ] Cookie banner (text i tlačítka)
- [ ] Formulářové labely a placeholdery
- [ ] Popisky statistik
- [ ] Kontaktní labely (telefon, email, adresa)

### Formátování
- **Telefonní placeholder:** lokální formát (`+420 123 456 789` pro CZ, ne `+1 (555) 123-4567`)
- **Formát data:** lokální lidsky čitelný (`15. ledna 2024`, ne `2024-01-15`)
- **Fallback jazyk:** jazyk z URL (route), NIKDY ne EN jako tichý default

### Validace
Automatický scan na anglické řetězce mimo `TEMPLATE_VAR_*`. Jakýkoli hardcoded anglický text v šabloně je bug.

---

## 2. PRÁZDNÉ SEKCE

### Základní princip
**Sekce bez obsahu se NERENDERUJE** — včetně jejího nadpisu.

### Pravidla
- Odkaz na prázdnou sekci se odstraní z navigace i footeru
- Pattern: podmíněné renderování přes `<!-- IF:field -->...<!-- ENDIF:field -->`
- Prázdná sekce = nemá žádný obsahový blok, nebo má méně položek než minimum

### Minimální počty obsahu
| Typ sekce    | Minimum položek |
|-------------|----------------|
| Testimonials | >= 1            |
| Blog         | >= 2            |
| Galerie      | >= 3            |
| Services     | >= 2            |

Pokud počet položek nedosahuje minima, sekci nezobrazovat.

---

## 3. OBRÁZKY

### Hero sekce
- Pokud nemáme obrázek z crawlu → fallback z Unsplash/Pexels podle oboru klienta
- Pokud ani fallback → gradient s texturou (ne prázdný bílý prostor)

### About sekce
- Pokud nemáme obrázek → přepnout na full-width text layout
- NIKDY nezobrazovat prázdný bílý box

### Obecná pravidla
- Každý `<img>` MUSÍ mít `onerror` fallback (schovat element nebo zobrazit tematický placeholder)
- Alt texty musí být popisné a v jazyce stránky
- Galerie: filtrovat nevhodné obrázky (alergenové tabulky, reklamy cizích brandů, nízká kvalita)

---

## 4. GENERICKÉ AI TEXTY

### Podtitulky sekcí
Generovat kontextově podle oboru klienta, ne genericky.

### Blacklist frází — automaticky nahradit kontextovým obsahem:
- "tailored solutions"
- "industry updates"
- "discerning clients"
- "decades of experience"
- "foundation of trust"
- "cutting-edge technology"
- "state-of-the-art"
- "world-class service"

### About text
MUSÍ obsahovat konkrétní detaily extrahované z crawlu (rok založení, lokalita, speciality). Generický "lorem ipsum" styl je nepřijatelný.

### FAQ
Kontrolovat, že neobsahují anglická slova uprostřed českých/slovenských vět (typický AI artefakt).

---

## 5. STATISTIKY

### Pravidla
- Ověřovat čísla proti zdrojovým datům z crawlu
- Číslo musí gramaticky souhlasit s popiskem:
  - `1 platforma` / `3 platformy` / `5 platforem`
  - `1 rok` / `3 roky` / `5 let`
- Stats musí být "wow" čísla z pohledu zákazníka:
  - Roky tradice, hodnocení na Googlu, počet hostů/klientů, počet realizací
- Pokud nemáme přesvědčivá čísla z crawlu → sekci nezobrazovat

### Anti-pattern
Nikdy negenerovat vymyšlená čísla. Statistiky bez zdrojových dat = skrytá sekce.

---

## 6. IKONY

### Mapování obor → ikony

| Obor          | Vhodné ikony                                    |
|--------------|------------------------------------------------|
| Restaurace    | utensils, flame, beer, truck, chef-hat          |
| Kadeřnictví   | scissors, droplet, sparkles, palette            |
| Auto servis   | wrench, car, gauge, shield                      |
| Fitness       | dumbbell, heart-pulse, timer, trophy            |
| IT / Tech     | code, server, shield-check, cpu                 |
| Beauty        | sparkles, heart, star, flower                   |
| Právní služby | scale, file-text, shield, landmark              |
| Stavebnictví  | hammer, hard-hat, ruler, building               |

### Pravidla
- Ikony přiřazovat podle **názvu služby**, ne náhodně
- **Žádná ikona > nesmyslná ikona** — lepší je ikonu vynechat než přiřadit nevhodnou
- Minimální velikost: 24×24px, ideálně 32×32px v kartách služeb

---

## 7. NAVIGACE A FOOTER

### Navigace
- Generuje se **dynamicky z naplněných sekcí** — prázdné sekce nemají nav odkaz
- Pořadí: Home → Services → About → (Gallery) → (Blog) → (Testimonials) → Contact

### Footer
- Footer links = podmnožina navigace
- **Social ikony:** zobrazovat JEN pro sítě nalezené při crawlu (ne generické Facebook/Instagram/Twitter)
- Social ikony musí mít dostatečný kontrast vůči pozadí footeru
- **Legal links:** nezobrazovat pokud cílový web nemá tyto stránky (GDPR, obchodní podmínky)

---

## 8. KONTAKT, MAPA, FORMULÁŘ

### Google Maps
- Použít **iframe embed**: `maps.google.com/maps?q=...&output=embed`
- **NEPOUŽÍVAT** Google Maps JavaScript API (vyžaduje API klíč)

### Formulář
- Buď funkční endpoint (action URL), nebo čistě informační kontaktní blok
- NIKDY nezobrazovat formulář, který nikam neodešle data

### Kontaktní údaje
- Placeholdery lokalizované včetně telefonního formátu
- **Otevírací doba** prominentně v kontaktní sekci (ne schovaná v FAQ)
- **Telefon:** `tel:` link pro mobilní kliknutí (`<a href="tel:+420123456789">`)

---

## 9. BLOG

### Základní princip
Zobrazit **JEN** pokud zdrojový web má reálné články nalezené při crawlu.

### Pravidla
- Bez reálných dat = sekci úplně schovat
- Data článků lokálně formátovaná (nebo žádná data)
- **Nikdy negenerovat fiktivní články** — ani "Lorem ipsum", ani AI vymyšlené texty
- Minimum pro zobrazení: 2 reálné články

---

## 10. VIZUÁLNÍ KONZISTENCE

### Spacing
- White space mezi sekcemi: maximálně 80px (`py-20` v Tailwindu)
- Konzistentní padding uvnitř sekcí

### Grid layout
- Počet karet zarovnat na násobky sloupců:
  - 3-column grid → 3, 6, 9 karet
  - 2-column grid → 2, 4, 6 karet
  - Lichý počet = visuální nekonzistence

### Logo
- Minimální šířka: 120px
- Dostatečný kontrast vůči pozadí headeru

### Barevná paleta podle oboru
| Obor          | Barvy                          |
|--------------|-------------------------------|
| Restaurace    | Teplé (červená, oranžová, hnědá) |
| Tech / IT     | Modré, šedé, zelené             |
| Beauty / Spa  | Pastelové (růžová, levandule)   |
| Právní        | Tmavé, konzervativní (navy, šedá) |
| Fitness       | Energické (oranžová, zelená, černá) |

### CTA tlačítka
- Text VŽDY viditelný — nikdy bílý text na světlém pozadí
- Minimální kontrast: **4.5:1 WCAG AA**
- Hover stav vizuálně odlišný

---

## 11. TECHNICKÉ MINIMUM

### HTML
- `<html lang="...">` atribut podle jazyka stránky (`cs`, `sk`, `en`, `de`)
- `<title>` = název firmy + popis + lokalita (např. "Restaurace U Lípy — Tradiční česká kuchyně, Praha")

### Structured Data
- LocalBusiness nebo Restaurant schema (`application/ld+json`) z crawl dat
- Zahrnout: name, address, telephone, openingHours, geo coordinates

### Heading hierarchie
- `<h1>` — pouze JEDEN na stránce (hero nadpis)
- `<h2>` — nadpisy sekcí
- `<h3>` — podnadpisy v rámci sekcí
- Nikdy nepřeskakovat úrovně (h1 → h3 bez h2)

### Accessibility
- Cookie banner v jazyce stránky
- Alt texty popisné a lokalizované
- Touch targets minimálně **44×44px** (WCAG 2.1 AA)
- Focus states na interaktivních elementech

---

## Implementační tabulka

Kde v kódu se jednotlivé oblasti fixují:

| Oblast                  | Soubor / komponenta                        | Co se řeší                                                |
|------------------------|-------------------------------------------|----------------------------------------------------------|
| 1. Lokalizace           | `src/lib/generate-html.ts` → `tt()`, `fillTemplate()` | Překlady, formátování dat a telefonů                     |
| 2. Prázdné sekce        | `src/lib/generate-html.ts` → `fillTemplate()` | `<!-- IF:field -->` podmíněné renderování                 |
| 3. Obrázky              | `src/templates/*.html`, `fillTemplate()`   | `onerror` fallbacky, alt texty, layout bez obrázku       |
| 4. Generické texty      | `src/lib/generate-html.ts` → `extractStructuredContent()` | Prompt engineering, blacklist frází                       |
| 5. Statistiky           | `src/lib/generate-html.ts` → `extractStats()` | Validace čísel, gramatická shoda, minimum dat             |
| 6. Ikony                | `src/lib/generate-html.ts` → `getServiceIconSvg()` | Mapování obor→ikona, velikosti                           |
| 7. Navigace a footer    | `src/templates/*.html`, `fillTemplate()`   | Dynamické generování nav, podmíněné social ikony         |
| 8. Kontakt / mapa       | `src/templates/*.html`                     | Iframe embed, `tel:` linky, otevírací doba               |
| 9. Blog                 | `src/lib/generate-html.ts` → `extractStructuredContent()` | Podmíněné zobrazení, validace reálných dat               |
| 10. Vizuální konzistence | `src/templates/*.html`, CSS                | Spacing, grid zarovnání, barvy, kontrast                 |
| 11. Technické minimum   | `src/lib/generate-html.ts` → `postProcessHtml()`, šablony | lang atribut, title, schema, heading hierarchie          |
