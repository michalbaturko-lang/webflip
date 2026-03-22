import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground, GridOverlay } from "../components/GradientBackground";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

const ARGUMENTS = [
  {
    icon: "🤖",
    title: "AI vás nevidí",
    desc: "ChatGPT, Perplexity a AI asistenti váš web přeskakují. Nemáte strukturovaná data, schéma markup ani správné meta tagy.",
    color: "#ef4444",
  },
  {
    icon: "📱",
    title: "Není mobilní",
    desc: "60 % návštěvníků přichází z mobilu. Starý design ztrácí zákazníky ještě dřív, než stihnou zavolat.",
    color: "#f59e0b",
  },
  {
    icon: "🐌",
    title: "Pomalé načítání",
    desc: "Každá sekunda navíc snižuje konverzi o 7 %. Velké obrázky a zastaralý kód vás stojí peníze.",
    color: "#f97316",
  },
  {
    icon: "🔒",
    title: "Bezpečnostní díry",
    desc: "Chybějící HTTPS, zastaralé pluginy a slabé hlavičky ohrožují vaše zákazníky i vaši reputaci.",
    color: "#dc2626",
  },
];

type ArgumentCardProps = {
  icon: string;
  title: string;
  desc: string;
  color: string;
  index: number;
};

const ArgumentCard: React.FC<ArgumentCardProps> = ({
  icon,
  title,
  desc,
  color,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay: index * 25,
    config: { damping: 200 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateX = interpolate(entrance, [0, 1], [80, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        alignItems: "flex-start",
        gap: 24,
        padding: "24px 32px",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        borderLeft: `4px solid ${color}`,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#ffffff",
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
};

export const Scene1Outdated: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#1a0a0a", "#2a0a1a", "#1a0a2e"]} />
      <GridOverlay />

      <AbsoluteFill style={{ padding: "60px 100px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#ef4444",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            Problém
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            Proč váš web{" "}
            <span style={{ color: "#ef4444" }}>ztrácí zákazníky</span>
          </div>
        </div>

        {/* Arguments */}
        <Sequence from={20} layout="none">
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ARGUMENTS.map((arg, i) => (
              <ArgumentCard key={i} {...arg} index={i} />
            ))}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
