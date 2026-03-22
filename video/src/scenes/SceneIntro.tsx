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
  weights: ["400", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = { companyDomain: string };

export const SceneIntro: React.FC<Props> = ({ companyDomain }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const logoOpacity = interpolate(logoScale, [0, 1], [0, 1]);

  // Text entrance
  const textEntrance = spring({ frame, fps, delay: 20, config: { damping: 200 } });
  const textOpacity = interpolate(textEntrance, [0, 1], [0, 1]);
  const textY = interpolate(textEntrance, [0, 1], [30, 0]);

  // Domain entrance
  const domainEntrance = spring({ frame, fps, delay: 40, config: { damping: 200 } });
  const domainOpacity = interpolate(domainEntrance, [0, 1], [0, 1]);

  // Pulsing glow
  const glowSize = interpolate(frame, [0, 60], [80, 120], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0a0a2e", "#1a1040", "#0a0a2e"]} />
      <GridOverlay />

      {/* Center content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Webflip logo / badge */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            marginBottom: 32,
            position: "relative",
          }}
        >
          {/* Glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: glowSize,
              height: glowSize,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
              transform: "translate(-50%, -50%)",
            }}
          />
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              position: "relative",
            }}
          >
            Webflip
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 400,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          AI-Powered Website Redesign
        </div>

        {/* Domain badge */}
        <Sequence from={40} layout="none">
          <div
            style={{
              opacity: domainOpacity,
              marginTop: 48,
              padding: "14px 32px",
              borderRadius: 50,
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              fontSize: 22,
              color: "#a5b4fc",
              fontWeight: 600,
            }}
          >
            Analýza pro: {companyDomain}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
