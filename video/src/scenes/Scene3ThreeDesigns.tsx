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
import type { DesignVariant } from "../Video";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

const CARD_COLORS = ["#60a5fa", "#a78bfa", "#22d3ee"];

type Props = {
  variants: DesignVariant[];
};

export const Scene3ThreeDesigns: React.FC<Props> = ({ variants }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [25, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#1a0533", "#0c1445", "#0a2540"]} />
      <FloatingOrbs count={6} color="139, 92, 246" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill style={{ padding: "36px 52px", display: "flex", flexDirection: "column" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <GlassCard
            intensity="light"
            style={{
              display: "inline-flex",
              padding: "5px 16px",
              borderRadius: 30,
              marginBottom: 12,
              border: "1px solid rgba(168,85,247,0.25)",
              background: "rgba(168,85,247,0.08)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#c4b5fd",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              Vaše nové weby
            </span>
          </GlassCard>

          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Vyberte si z{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa, #818cf8)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              3 redesignů
            </span>
          </div>
        </div>

        {/* Three browser frames — appear faster (from=8 instead of 20) */}
        <Sequence from={8} layout="none">
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              alignItems: "flex-start",
              flex: 1,
            }}
          >
            {variants.slice(0, 3).map((variant, i) => {
              const cardDelay = 8 + i * 14; // faster stagger
              const cardSpring = spring({
                frame,
                fps,
                delay: cardDelay,
                config: { damping: 12, stiffness: 80 },
              });
              const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);
              const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);
              const cardY = interpolate(cardSpring, [0, 1], [50, 0]);

              // Gentle floating for center card
              const isCenter = i === 1;
              const floatY = isCenter ? Math.sin(frame * 0.03) * 4 : 0;

              return (
                <div
                  key={i}
                  style={{
                    opacity: cardOpacity,
                    transform: `scale(${cardScale}) translateY(${cardY + floatY}px)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    maxWidth: 540,
                  }}
                >
                  <BrowserFrame
                    url={`webflipper.app/preview/${i + 1}`}
                    screenshotUrl={variant.screenshotUrl}
                    width={500}
                    height={320}
                    delay={cardDelay + 3}
                    badge={`#${i + 1}`}
                    badgeColor={CARD_COLORS[i]}
                  />

                  {/* Variant name + features in glass card */}
                  <GlassCard
                    intensity="light"
                    style={{
                      width: "100%",
                      padding: "14px 18px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: 10,
                        textAlign: "center",
                      }}
                    >
                      {variant.name}
                    </div>
                    {/* Features — vertical list with checkmarks */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                      }}
                    >
                      {variant.features.map((f, fi) => {
                        const fDelay = cardDelay + 18 + fi * 3;
                        const fSpring = spring({
                          frame,
                          fps,
                          delay: fDelay,
                          config: { damping: 200 },
                        });
                        const fOpacity = interpolate(fSpring, [0, 1], [0, 1]);

                        return (
                          <div
                            key={fi}
                            style={{
                              opacity: fOpacity,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 14,
                              color: "rgba(255,255,255,0.7)",
                              padding: "2px 0",
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                background: `${CARD_COLORS[i]}22`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                color: CARD_COLORS[i],
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </div>
                            {f}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
