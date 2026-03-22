import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SceneIntro } from "./scenes/SceneIntro";
import { Scene1Outdated } from "./scenes/Scene1Outdated";
import { Scene2Webflipper } from "./scenes/Scene2Webflip";
import { Scene3ThreeDesigns } from "./scenes/Scene3ThreeDesigns";
import { Scene4AIEditor } from "./scenes/Scene4AIEditor";
import { Scene5Decision } from "./scenes/Scene5Decision";

export type ScoreDetail = {
  label: string;
  score: number;
};

export type DesignVariant = {
  name: string;
  screenshotUrl: string;
  features: string[];
};

export type OutreachVideoProps = {
  companyName: string;
  companyDomain: string;
  contactName?: string;
  overallScore: number;
  scores: ScoreDetail[];
  problems: string[];
  variants: DesignVariant[];
  originalScreenshotUrl: string;
  voiceoverUrl?: string;
  landingPageUrl: string;
};

/**
 * Scene durations tuned to match ~81s voiceover:
 *
 * Intro:      150 frames =  5.0s  → "Připravili jsme si pro vás něco speciálního."
 * Scene 1:    480 frames = 16.0s  → Problems (pomalé načítání, mobil, SEO, AI)
 * Scene 2:    570 frames = 19.0s  → Analysis (120 parametrů, nový web)
 * Scene 3:    510 frames = 17.0s  → 3 redesigny
 * Scene 4:    420 frames = 14.0s  → AI Editor
 * Scene 5:    540 frames = 18.0s  → CTA + QR kód
 *
 * Transitions: 5 × 18 = 90 frames = 3s
 * Total: 2670 - 90 = 2580 net frames = 86s
 */
export const OutreachVideo: React.FC<OutreachVideoProps> = (props) => {
  const TRANSITION = 18;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      {/* Voiceover audio track */}
      {props.voiceoverUrl && (
        <Audio src={props.voiceoverUrl} volume={1} />
      )}

      <TransitionSeries>
        {/* Intro - 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneIntro
            companyDomain={props.companyDomain}
            contactName={props.contactName}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
        />

        {/* Scene 1: Why your web is outdated - 16s */}
        <TransitionSeries.Sequence durationInFrames={480}>
          <Scene1Outdated
            originalScreenshotUrl={props.originalScreenshotUrl}
            problems={props.problems}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 2: Webflipper analyzed - 19s */}
        <TransitionSeries.Sequence durationInFrames={570}>
          <Scene2Webflipper
            companyDomain={props.companyDomain}
            overallScore={props.overallScore}
            scores={props.scores}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
        />

        {/* Scene 3: Three redesigns - 17s */}
        <TransitionSeries.Sequence durationInFrames={510}>
          <Scene3ThreeDesigns variants={props.variants} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 4: AI Editor demo - 14s */}
        <TransitionSeries.Sequence durationInFrames={420}>
          <Scene4AIEditor />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
        />

        {/* Scene 5: CTA + QR - 18s (extra 2s for voiceover pause) */}
        <TransitionSeries.Sequence durationInFrames={540}>
          <Scene5Decision
            companyName={props.companyName}
            landingPageUrl={props.landingPageUrl}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
