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
  NoiseOverlay,
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

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#1a0a12", "#09090b"]} />
      <FloatingOrbs count={4} color="239, 68, 68" />
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          padding: "56px 80px",
          display: "flex",
          flexDirection: "row",
          gap: 56,
        }}
      >
        {/* Left: Title + Problems */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Section label + title */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 15,
                color: "#ef4444",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 4,
                marginBottom: 14,
              }}
            >
              Problém
            </div>
            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.15,
              }}
            >
              Proč váš web
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ztrácí zákazníky
              </span>
            </div>
          </div>

          {/* Problem list */}
          <Sequence from={25} layout="none">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {problems.slice(0, 4).map((problem, i) => {
                const pSpring = spring({
                  frame: frame - 25,
                  fps,
                  delay: i * 18,
                  config: { damping: 200 },
                });
                const pOpacity = interpolate(pSpring, [0, 1], [0, 1]);
                const pX = interpolate(pSpring, [0, 1], [40, 0]);

                return (
                  <div
                    key={i}
                    style={{
                      opacity: pOpacity,
                      transform: `translateX(${pX}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "18px 24px",
                      background: "rgba(239, 68, 68, 0.06)",
                      borderRadius: 14,
                      borderLeft: "3px solid rgba(239, 68, 68, 0.5)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        color: "#ef4444",
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      ✗
                    </div>
                    <div
                      style={{
                        fontSize: 19,
                        color: "rgba(255,255,255,0.75)",
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      {problem}
                    </div>
                  </div>
                );
              })}
            </div>
          </Sequence>
        </div>

        {/* Right: Screenshot of original web in browser frame */}
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
              height={500}
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
