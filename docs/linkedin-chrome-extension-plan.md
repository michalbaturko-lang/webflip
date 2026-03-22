# LinkedIn Chrome Extension — Architektura

## Přehled

Chrome extension, která čte pending LinkedIn tasky z Webflipper API a pomáhá je vykonávat přímo na LinkedIn. Extension **neautomatizuje** akce plně (kvůli riziku banu), ale maximálně zjednodušuje workflow operátora.

## Architektura

```
┌─────────────────────────────────────────────────┐
│  Webflipper API                                 │
│  GET  /api/admin/linkedin/tasks?status=pending  │
│  POST /api/admin/linkedin/tasks/:id/complete    │
│  POST /api/admin/linkedin/tasks/:id/skip        │
└─────────────────┬───────────────────────────────┘
                  │ fetch (with admin token)
┌─────────────────▼───────────────────────────────┐
│  Chrome Extension (Background Service Worker)    │
│  • Polls API every 60s for pending tasks        │
│  • Badge shows count of pending tasks           │
│  • Stores admin token in chrome.storage         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Content Script (injected on linkedin.com)       │
│  • Floating sidebar panel s aktuálním taskem    │
│  • Pre-fills zprávy do LinkedIn message boxu    │
│  • "Splněno" / "Přeskočit" tlačítka            │
│  • Auto-navigate na profil z tasku              │
└─────────────────────────────────────────────────┘
```

## Komponenty

### 1. Background Service Worker (`background.ts`)
- Polling Webflipper API pro pending tasky
- Badge management (počet nevyřízených)
- Token management (admin auth)
- Message relay mezi popup a content script

### 2. Popup (`popup.html` + `popup.ts`)
- Login formulář (Webflipper admin token)
- Seznam pending tasků s prioritou
- Statistiky (dnes splněno, celkem pending)
- Nastavení (polling interval, auto-navigate)

### 3. Content Script (`content.ts`)
Injektuje se na `*.linkedin.com/*`:

**Floating Panel (pravý dolní roh):**
- Aktuální task: typ (connection_request / message / follow_up)
- Jméno kontaktu + firma + domain
- Template zprávy (připravená, personalizovaná)
- Tlačítka: "Kopírovat zprávu" / "Vložit" / "Splněno" / "Přeskočit"
- Next/Previous pro procházení tasků

**Akce podle typu tasku:**

| Typ | Co extension udělá | Co operátor udělá |
|-----|---------------------|-------------------|
| `connection_request` | Otevře profil, zkopíruje note do clipboardu | Klikne "Connect" → "Add a note" → Ctrl+V → Send |
| `message` | Otevře messaging thread, vloží text do inputu | Zkontroluje, upraví, klikne Send |
| `follow_up` | Otevře existující thread, vloží follow-up text | Zkontroluje, klikne Send |
| `endorsement` | Otevře sekci Skills na profilu | Klikne na endorsement ručně |
| `comment` | Otevře aktivitu kontaktu | Napíše komentář ručně |

### 4. API Endpoints (nové v Webflipperu)

```typescript
// GET /api/admin/linkedin/tasks
// Query params: status=pending, limit=20
// Returns: LinkedInTask[] s CRM record daty

// POST /api/admin/linkedin/tasks/:id/complete
// Body: { actual_message?: string }
// Marks task as completed

// POST /api/admin/linkedin/tasks/:id/skip
// Body: { reason?: string }
// Marks task as skipped
```

## Bezpečnost

- **Žádná automatizace klikání** — extension pouze naviguje a pre-filluje, nekliká za uživatele
- **Rate limiting** — max 20 connection requestů/den, 50 zpráv/den (LinkedIn limity)
- **Cooldown** — minimálně 30s mezi akcemi
- **Human-in-the-loop** — operátor vždy potvrzuje akci
- **Detekce** — extension nemodifikuje LinkedIn DOM způsobem detekovatelným LinkedIn

## Projekt Struktura

```
linkedin-extension/
├── manifest.json          # Chrome extension manifest v3
├── background.ts          # Service worker
├── content.ts             # LinkedIn content script
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── components/
│   ├── TaskPanel.ts       # Floating task panel
│   └── MessageHelper.ts   # Message pre-fill logic
├── lib/
│   ├── api.ts             # Webflipper API client
│   ├── linkedin-dom.ts    # LinkedIn DOM helpers
│   └── rate-limiter.ts    # Client-side rate limiting
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## MVP Scope (Fáze 1)

1. Login s admin tokenem
2. Fetch pending tasků z API
3. Floating panel na LinkedIn s aktuálním taskem
4. Copy-to-clipboard pro zprávy
5. Mark as completed/skipped
6. Badge s počtem pending

## Fáze 2

- Auto-navigate na profil
- Pre-fill zprávy přímo do LinkedIn message inputu
- Denní statistiky v popup
- Keyboard shortcuts (N = next, C = copy, D = done)

## Fáze 3

- Smart timing (doporučení nejlepšího času k odeslání)
- A/B testing template zpráv
- Analytics (response rate per template)
- Bulk queue management
