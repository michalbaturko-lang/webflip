import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SceneIntro } from "./scenes/SceneIntro";
import { Scene1Outdated } from "./scenes/Scene1Outdated";
import { Scene2Webflip } from "./scenes/Scene2Webflip";
import { Scene3ThreeDesigns } from "./scenes/Scene3ThreeDesigns";
import { Scene4AIEditor } from "./scenes/Scene4AIEditor";
import { Scene5Decision } from "./scenes/Scene5Decision";

export type OutreachVideoProps = {
  companyName: string;
  companyDomain: string;
  overallScore: number;
};

export const OutreachVideo: React.FC<OutreachVideoProps> = ({
  companyName,
  companyDomain,
  overallScore,
}) => {
  const TRANSITION = 20;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      <TransitionSeries>
        {/* Intro - 4s */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <SceneIntro companyDomain={companyDomain} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 1: Why your web is outdated - 14s */}
        <TransitionSeries.Sequence durationInFrames={420}>
          <Scene1Outdated />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 2: Webflip analyzed & redesigned - 14s */}
        <TransitionSeries.Sequence durationInFrames={420}>
          <Scene2Webflip
            companyDomain={companyDomain}
            overallScore={overallScore}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 3: Pick from 3 redesigns - 10s */}
        <TransitionSeries.Sequence durationInFrames={300}>
          <Scene3ThreeDesigns />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 4: AI Editor - 12s */}
        <TransitionSeries.Sequence durationInFrames={360}>
          <Scene4AIEditor />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION })}
        />

        {/* Scene 5: Decision CTA - 12s */}
        <TransitionSeries.Sequence durationInFrames={360}>
          <Scene5Decision companyName={companyName} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
