/**
 * Voiceover configuration for the Webflipper outreach video.
 *
 * The video uses a SINGLE pre-recorded Czech voiceover that plays over all scenes.
 * Scene timings are designed to sync with the voiceover segments below.
 *
 * To produce a voiceover:
 *   1. Record / generate the script below as one continuous audio file (MP3 or WAV).
 *   2. Place it in /public/voiceover.mp3  (for Remotion Studio preview)
 *      OR pass a remote URL via the `voiceoverUrl` prop at render time.
 *   3. The <Audio> component in Video.tsx plays it from frame 0 to the end.
 *
 * Scene-to-timestamp mapping (at 30 fps):
 *   Intro          0:00 – 0:04   (frames   0–120)
 *   Scene 1        0:04 – 0:16   (frames 120–480)    "Proč váš web ztrácí zákazníky"
 *   Scene 2        0:16 – 0:28   (frames 480–840)    "Analýza webu"
 *   Scene 3        0:28 – 0:42   (frames 840–1260)   "3 redesigny"
 *   Scene 4        0:42 – 0:52   (frames 1260–1560)  "AI Editor"
 *   Scene 5        0:52 – 1:02   (frames 1560–1860)  "Další krok / CTA"
 *
 * Note: TransitionSeries overlaps scenes by TRANSITION (18 frames = 0.6 s)
 *       so the actual frame counts include small overlaps.
 */

export const VOICEOVER_SCRIPT = {
  intro: {
    startSec: 0,
    endSec: 4,
    text: "[Hudební intro – žádný mluvený text]",
  },
  scene1_problem: {
    startSec: 4,
    endSec: 16,
    text: `Váš web {companyDomain} má několik vážných problémů.
Načítá se příliš pomalu, na mobilu je prakticky nepoužitelný
a vyhledávače ho téměř nevidí.
To znamená, že přicházíte o zákazníky každý den.`,
  },
  scene2_analysis: {
    startSec: 16,
    endSec: 28,
    text: `Náš systém Webflipper váš web kompletně analyzoval.
Celkové skóre je pouhých {overallScore} bodů ze sta.
Největší problémy jsou v rychlosti, mobilní optimalizaci a SEO.
Ale máme pro vás řešení.`,
  },
  scene3_designs: {
    startSec: 28,
    endSec: 42,
    text: `Na základě analýzy jsme vytvořili tři kompletní redesigny vašeho webu.
Každý je optimalizovaný pro rychlost, SEO i AI vyhledávače.
Vyberte si ten, který vám nejlépe sedí —
nebo je zkombinujte.`,
  },
  scene4_editor: {
    startSec: 42,
    endSec: 52,
    text: `A nejlepší část? Každý redesign si můžete sami upravit
v našem AI editoru. Stačí kliknout na prvek,
říct co chcete změnit — a editor to udělá za vás.
Žádné programování.`,
  },
  scene5_cta: {
    startSec: 52,
    endSec: 62,
    text: `Máte sedm dní na vyzkoušení — zcela zdarma.
Podívejte se na návrhy na odkazu níže.
Pokud se vám líbí, zaplaťte a web je váš.
Pokud ne — smažeme vše. Žádný závazek.`,
  },
} as const;

/**
 * Generate a personalised voiceover script for a specific company.
 * Replace placeholders with real data.
 */
export function generateVoiceoverScript(data: {
  companyDomain: string;
  overallScore: number;
}): Record<string, string> {
  const entries = Object.entries(VOICEOVER_SCRIPT);
  const result: Record<string, string> = {};

  for (const [key, segment] of entries) {
    result[key] = segment.text
      .replace("{companyDomain}", data.companyDomain)
      .replace("{overallScore}", String(data.overallScore));
  }

  return result;
}

/**
 * Total video duration in seconds (for voiceover production reference)
 */
export const VIDEO_DURATION_SECONDS = 62;
