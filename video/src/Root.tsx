import { Composition, staticFile } from "remotion";
import { OutreachVideo, type OutreachVideoProps } from "./Video";

/**
 * Lambda version for deployment tracking
 * Increment when making changes to the video composition
 */
export const outreachVideoLambdaVersion = "1.0.0";

const DEFAULT_PROPS: OutreachVideoProps = {
  companyName: "Restaurace U Zlatého Lva",
  companyDomain: "uzlateholva.cz",
  contactName: "Jan Novák",
  overallScore: 38,
  scores: [
    { label: "Rychlost", score: 43 },
    { label: "Mobil", score: 26 },
    { label: "SEO", score: 33 },
    { label: "Bezpečnost", score: 58 },
    { label: "Přístupnost", score: 30 },
    { label: "AI viditelnost", score: 22 },
  ],
  problems: [
    "Web se načítá přes 6 sekund — návštěvníci odcházejí",
    "Na mobilu je web rozbitý — 60 % lidí ho zavře",
    "Google váš web téměř nevidí — špatné SEO",
    "AI asistenti váš web zcela ignorují",
  ],
  variants: [
    {
      name: "Moderní",
      screenshotUrl: "https://placehold.co/1200x800/3b82f6/ffffff?text=Modern+Design",
      features: ["Responzivní design", "Optimalizované SEO", "AI viditelnost", "Rychlé načítání", "SSL zabezpečení", "Kontaktní formulář"],
    },
    {
      name: "Profesionální",
      screenshotUrl: "https://placehold.co/1200x800/8b5cf6/ffffff?text=Professional",
      features: ["Responzivní design", "Optimalizované SEO", "AI viditelnost", "Rychlé načítání", "SSL zabezpečení", "Kontaktní formulář"],
    },
    {
      name: "Konverzní",
      screenshotUrl: "https://placehold.co/1200x800/06b6d4/ffffff?text=Conversion",
      features: ["Responzivní design", "Optimalizované SEO", "AI viditelnost", "Rychlé načítání", "SSL zabezpečení", "Kontaktní formulář"],
    },
  ],
  originalScreenshotUrl: "https://placehold.co/1200x800/1a1a2e/666666?text=Original+Web",
  voiceoverUrl: staticFile("voiceover.mp3"),
  landingPageUrl: "https://webflipper.app/preview/uzlateholva.cz",
};

// Scene durations: 150 + 480 + 570 + 510 + 420 + 540 = 2670
// Transitions: 5 × 18 = 90
// Total: 2670 - 90 = 2580 frames = 86s
const TOTAL_FRAMES = 2580;

export const RemotionRoot = () => {
  return (
    <Composition
      id="WebflipperVideo"
      component={OutreachVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={DEFAULT_PROPS}
    />
  );
};
