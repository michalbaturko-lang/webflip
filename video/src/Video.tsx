import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SceneIntro } from "./scenes/SceneIntro";
import { Scene1Outdated } from "./scenes/Scene1Outdated";
import { Scene2Webflipper } from "./scenes/Scene2Webflipper";
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

export const OutreachVideo: React.FC<OutreachVideoProps> = (props) => {
  const TRANSITION = 18;

  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      {/* Voiceover audio track */}
      {props.voiceoverUrl && (
        <Audio src={props.voiceoverUrl} volume={1} />
      )}

      <TransitionSeries>
        {/* Intro - 4s */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <SceneIntro
            companyDomain={props.companyDomain}
            contactName={props.contactName}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
        />

        {/* Scene 1: Why your web is outdated - 12s */}
        <TransitionSeries.Sequence durationInFrames={360}>
          <Scene1Outdated
            originalScreenshotUrl={props.originalScreenshotUrl}
            problems={props.problems}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 2: Webflipper analyzed - 12s */}
        <TransitionSeries.Sequence durationInFrames={360}>
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

        {/* Scene 3: Three redesigns with real screenshots - 14s */}
        <TransitionSeries.Sequence durationInFrames={420}>
          <Scene3ThreeDesigns variants={props.variants} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 4: AI Editor demo - 10s */}
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene4AIEditor />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION })}
        />

        {/* Scene 5: CTA - 10s */}
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene5Decision
            companyName={props.companyName}
            landingPageUrl={props.landingPageUrl}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
