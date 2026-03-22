# Webflipper — Master Prompts pro generování webů

## Zdroj
Extrahováno z viral tweetu (9 Claude + Figma Make promptů) + vlastní úpravy pro Webflipper workflow.

---

## PROMPT 1: Architecture Strategist

```
You are a Principal Architect at Vercel.
I need to build a [WEBSITE_TYPE] for [COMPANY_NAME].

Requirements:
- Target audience: [DESCRIBE]
- Key features: [LIST 3-5]
- Tech: Next.js 15, React, Tailwind CSS v4, TypeScript

Deliver:
1. Site map with all pages and sections
2. Component hierarchy (atomic design)
3. Data flow diagram
4. SEO strategy (meta, structured data, sitemap)
5. Performance budget (Core Web Vitals targets)
6. Responsive breakpoint strategy
```

---

## PROMPT 2: Design System Generator

```
You are a Design Director at Apple.
Create a design system for [BRAND_NAME].

Brand attributes: [MINIMAL/BOLD/LUXURY/PLAYFUL]
Industry: [INDUSTRY]
Existing brand colors (if any): [COLORS]

Generate:
1. Color palette:
   - Primary (main brand color + 5 shades)
   - Secondary (accent + 5 shades)
   - Semantic (success, warning, error, info)
   - Dark mode variants
   - Background/surface hierarchy (3+ levels)

2. Typography scale (9 levels):
   - Display (hero headlines): 72px / 800 weight
   - H1: 48px / 700
   - H2: 36px / 700
   - H3: 24px / 600
   - H4: 20px / 600
   - Body large: 18px / 400
   - Body: 16px / 400
   - Small: 14px / 400
   - Caption: 12px / 400
   - Line heights, letter spacing for each

3. Spacing system (4px base grid):
   - Component padding
   - Section margins
   - Grid gaps

4. Border radius tokens:
   - Small (buttons): 8px
   - Medium (cards): 16px
   - Large (containers): 24px
   - Full (pills): 9999px

5. Shadow system:
   - Subtle, medium, strong, glow
   - Dark mode shadow adjustments

6. Glass morphism specs:
   - Background: rgba(255,255,255,0.05)
   - Border: 1px solid rgba(255,255,255,0.1)
   - Backdrop-filter: blur(12px)
```

---

## PROMPT 3: Conversion Copywriter

```
You are a Conversion Copywriter at Ogilvy.
Write all copy for a [WEBSITE_TYPE].

Brand voice: [PROFESSIONAL/CASUAL/BOLD]
Target: [AUDIENCE]
Goal: [CONVERSION/AWARENESS/RETENTION]
Language: [LANGUAGE]

Deliver for each page section:
1. Hero:
   - Headline: max 8 words, benefit-driven
   - Subheadline: max 25 words, clarify the offer
   - CTA button text: max 4 words, action-oriented
   - Social proof line: max 10 words

2. Features/Benefits:
   - 3-6 feature blocks
   - Each: icon suggestion + title (3 words) + description (15 words)

3. How It Works:
   - 3 steps, each: number + title (3 words) + description (12 words)

4. Pricing/Value:
   - Price anchor (competitor cost)
   - Your price with framing
   - "What's included" list (5-8 items)
   - Risk reversal statement

5. FAQ:
   - 6-8 questions (objection-handling focus)
   - Answers: max 2 sentences each

6. Final CTA:
   - Urgency-driven headline
   - Reinforcement of key benefit
   - Same CTA as hero

Rules:
- No jargon unless audience expects it
- Every headline passes the "so what?" test
- Benefits over features
- Specific numbers over vague claims
```

---

## PROMPT 4: Animation & Interaction Spec

```
You are a Motion Designer at Apple.
Design interactions for a [WEBSITE_TYPE].

Design language: [SUBTLE/DYNAMIC/CINEMATIC]

Page load sequence:
- Navbar: fade in, 300ms, ease-out
- Hero headline: slide up 20px + fade, 600ms, 0.1s stagger per line
- Hero subtitle: slide up 15px + fade, 500ms, 200ms delay
- CTA: scale 0.95→1 + fade, 400ms, 300ms delay
- Social proof: fade in, 400ms, 500ms delay
- Background blobs: continuous float animation, 20s duration, infinite

Scroll behaviors:
- Navbar: shrink from 80px→60px, background opacity 0→0.8, ease-out 300ms
- Section headers: slide up 20px + fade, triggered at 20% viewport
- Cards: stagger reveal, 0.1s between each, slide up 30px
- Score counters: count up animation from 0, 1.5s duration, ease-out
- Parallax: background elements move at 0.5x scroll speed

Hover states:
- Buttons: scale 1.02, background lighten 10%, 200ms ease
- Cards: translateY -4px, shadow increase, border glow, 250ms ease
- Links: color transition, underline slide-in from left, 200ms

Click transitions:
- Button press: scale 0.98, 100ms, spring back
- Page transitions: fade out 200ms, fade in 300ms
- Modal: backdrop fade 200ms, modal slide up + scale 0.95→1, 300ms spring

Performance:
- Use transform and opacity only (GPU accelerated)
- will-change on animated elements
- Reduce motion media query fallback
- No animation on elements below fold until visible (IntersectionObserver)
```

---

## PROMPT 5: Responsive Decision Matrix

```
You are a Responsive Design Specialist.
Plan breakpoints for a [WEBSITE_TYPE].

Breakpoints:
- Mobile: 375px (base)
- Tablet: 768px
- Desktop: 1280px
- Large: 1440px+

For each section, define:

| Section | Mobile (375) | Tablet (768) | Desktop (1280+) |
|---------|-------------|--------------|-----------------|
| Navbar | Hamburger menu, logo left | Same | Horizontal links, CTA button |
| Hero | Stack vertical, text-left, input full-width | Center, input 80% | Center, input max-w-2xl |
| Features | 1 col stack | 2 col grid | 3 col grid |
| Cards | Full width, stack | 2 col | 3 col |
| Pricing | Stack vertical | 2 col | Side by side |
| FAQ | Full width accordion | Same, max-w-2xl | max-w-3xl centered |
| Footer | Stack 1 col | 2 col | 4 col |

Typography scaling:
- Hero title: 32px → 48px → 72px
- Section titles: 24px → 32px → 48px
- Body: 16px (constant)
- CTA buttons: 14px → 16px

Spacing:
- Section padding: py-16 → py-24 → py-32
- Container: px-4 → px-6 → px-8
- Card gaps: gap-4 → gap-6 → gap-8

Content priority (mobile):
- Hide: decorative elements, secondary images
- Collapse: detailed descriptions → show more
- Simplify: multi-column → single column
- Sticky: CTA button at bottom on mobile
```

---

## PROMPT 6: QA & Optimization Checklist

```
You are a QA Engineer at Google.
Review this website against these criteria:

Performance (Core Web Vitals):
□ LCP < 2.5s
□ FID/INP < 200ms
□ CLS < 0.1
□ Total page weight < 500KB (initial load)
□ Images: WebP/AVIF, lazy loaded, sized
□ Fonts: preloaded, display:swap
□ CSS: critical inline, rest deferred
□ JS: code-split, tree-shaken

Accessibility (WCAG 2.2 AA):
□ Color contrast ≥ 4.5:1 (text), ≥ 3:1 (large text)
□ Focus indicators visible
□ Alt text on all images
□ Semantic HTML (header, main, nav, footer)
□ Keyboard navigable
□ Screen reader tested
□ Reduced motion support

SEO:
□ Unique title + meta description per page
□ Open Graph + Twitter cards
□ Structured data (Organization, FAQ, Product)
□ Sitemap.xml
□ Robots.txt
□ Canonical URLs
□ H1 hierarchy correct

Security:
□ HTTPS everywhere
□ CSP headers
□ X-Frame-Options
□ Input sanitization
□ No exposed API keys
□ GDPR cookie consent

Mobile:
□ Touch targets ≥ 44x44px
□ No horizontal scroll
□ Viewport meta tag
□ Fast tap (no 300ms delay)
□ Thumb-friendly navigation
```

---

## DESIGN REFERENCE: Dark SaaS Aesthetic (Design Rocket style)

Inspirace z templates: Sync, Radiant, AI Datalog, Start AI, Automation Ally

Key design patterns:
- **Background**: Near-black (#0a0a0a to #111111), NOT pure black
- **Gradient accents**: Blue→Purple, Cyan→Blue, or brand color glow
- **Glass cards**: Semi-transparent bg, subtle border, backdrop-blur
- **Typography**: Inter/Geist, extra bold headlines (700-800), thin body (300-400)
- **Glow effects**: Colored blur behind key elements (buttons, cards, hero)
- **Grid patterns**: Subtle dot or line grid overlay at 2-5% opacity
- **Floating elements**: Subtle parallax cards/badges in background
- **CTA buttons**: Solid bright color on dark, rounded-xl, hover glow
- **Section dividers**: Gradient fade lines, not hard borders
- **Trust badges**: Monochrome logos in a row, low opacity
- **Spacing**: Generous — sections at py-24 to py-32 minimum
- **Border-radius**: 12-20px on cards, 8-12px on buttons
- **Shadows**: Colored glow shadows, not traditional box-shadows

Color palette example:
- Background: #0a0a0f
- Surface 1: rgba(255,255,255,0.03)
- Surface 2: rgba(255,255,255,0.06)
- Border: rgba(255,255,255,0.08)
- Text primary: #ffffff
- Text secondary: #9ca3af (gray-400)
- Text muted: #6b7280 (gray-500)
- Accent primary: #3b82f6 (blue-500)
- Accent secondary: #8b5cf6 (purple-500)
- Success: #22c55e
- Warning: #eab308
- Error: #ef4444
