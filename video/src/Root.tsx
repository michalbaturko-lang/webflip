import { Composition } from "remotion";
import { OutreachVideo, type OutreachVideoProps } from "./Video";

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
      features: ["Responzivní", "Rychlé načítání", "Čistý design"],
    },
    {
      name: "Profesionální",
      screenshotUrl: "https://placehold.co/1200x800/8b5cf6/ffffff?text=Professional",
      features: ["Firemní branding", "SEO ready", "Kontaktní formuláře"],
    },
    {
      name: "Konverzní",
      screenshotUrl: "https://placehold.co/1200x800/06b6d4/ffffff?text=Conversion",
      features: ["Lead magnet", "Social proof", "A/B testovaný"],
    },
  ],
  originalScreenshotUrl: "https://placehold.co/1200x800/1a1a2e/666666?text=Original+Web",
  landingPageUrl: "https://webflipper.app/preview/uzlateholva.cz",
};

// Total frames: 120 + 360 + 360 + 420 + 300 + 300 - (5 transitions * 18) = 1770
const TOTAL_FRAMES = 1770;

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
