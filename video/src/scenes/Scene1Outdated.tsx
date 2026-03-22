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
import {
  GradientBackground,
  FloatingOrbs,
  GridOverlay,
  NoiseOverlay,
  GlassCard,
} from "../components/GradientBackground";
import { BrowserFrame } from "../components/BrowserFrame";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  originalScreenshotUrl: string;
  problems: string[];
};

export const Scene1Outdated: React.FC<Props> = ({
  originalScreenshotUrl,
  problems,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [25, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#2a0a18", "#1a0533", "#0c1445"]} />
      <FloatingOrbs count={5} color="239, 68, 68" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          padding: "48px 72px",
          display: "flex",
          flexDirection: "row",
          gap: 48,
          alignItems: "stretch",
        }}
      >
        {/* Left: Title + Problems */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              marginBottom: 40,
            }}
          >
            {/* Section pill */}
            <GlassCard
              intensity="light"
              style={{
                display: "inline-flex",
                padding: "6px 18px",
                borderRadius: 30,
                marginBottom: 18,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#fca5a5",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                }}
              >
                Problém
              </span>
            </GlassCard>

            <div
              style={{
                fontSize: 50,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.15,
              }}
            >
              Proč váš web
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #f87171, #fb923c)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ztrácí zákazníky
              </span>
            </div>
          </div>

          {/* Problem list — glass cards */}
          <Sequence from={25} layout="none">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {problems.slice(0, 4).map((problem, i) => {
                const pSpring = spring({
                  frame: frame - 25,
                  fps,
                  delay: i * 15,
                  config: { damping: 14, stiffness: 80 },
                });
                const pOpacity = interpolate(pSpring, [0, 1], [0, 1]);
                const pX = interpolate(pSpring, [0, 1], [30, 0]);

                return (
                  <GlassCard
                    key={i}
                    intensity="light"
                    style={{
                      opacity: pOpacity,
                      transform: `translateX(${pX}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "20px 24px",
                      borderRadius: 16,
                      borderLeft: "3px solid rgba(248, 113, 113, 0.6)",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "rgba(248, 113, 113, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: "#fca5a5",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      ✗
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        color: "rgba(255,255,255,0.8)",
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      {problem}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </Sequence>
        </div>

        {/* Right: Screenshot in browser frame */}
        <div
          style={{
            flex: 0.9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sequence from={10} layout="none">
            <BrowserFrame
              url="uzlateholva.cz"
              screenshotUrl={originalScreenshotUrl}
              width={720}
              height={560}
              delay={10}
              problemOverlay
              badge="Zastaralý"
              badgeColor="#ef4444"
            />
          </Sequence>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
