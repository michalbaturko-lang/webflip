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
import type { DesignVariant } from "../Video";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

const CARD_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4"];

type Props = {
  variants: DesignVariant[];
};

export const Scene3ThreeDesigns: React.FC<Props> = ({ variants }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#0f0a22", "#09090b"]} />
      <FloatingOrbs count={5} color="139, 92, 246" />
      <NoiseOverlay />

      <AbsoluteFill style={{ padding: "50px 80px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 36,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "#a855f7",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            Vaše nové weby
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Vyberte si z{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              3 redesignů
            </span>
          </div>
        </div>

        {/* Three browser frames with screenshots */}
        <Sequence from={20} layout="none">
          <div
            style={{
              display: "flex",
              gap: 28,
              justifyContent: "center",
              alignItems: "flex-start",
              flex: 1,
            }}
          >
            {variants.slice(0, 3).map((variant, i) => {
              const cardDelay = 20 + i * 25;
              const cardSpring = spring({
                frame,
                fps,
                delay: cardDelay,
                config: { damping: 15, stiffness: 100 },
              });
              const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);
              const cardScale = interpolate(cardSpring, [0, 1], [0.85, 1]);
              const cardY = interpolate(cardSpring, [0, 1], [40, 0]);

              // Slight hover effect on the middle card
              const isCenter = i === 1;
              const floatY = isCenter
                ? interpolate(frame, [0, 120], [0, -6], {
                    extrapolateRight: "extend",
                  })
                : 0;

              return (
                <div
                  key={i}
                  style={{
                    opacity: cardOpacity,
                    transform: `scale(${cardScale}) translateY(${cardY + Math.sin(floatY * 0.05) * 3}px)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  {/* Browser frame with real screenshot */}
                  <BrowserFrame
                    url={`webflip.cz/preview/${i + 1}`}
                    screenshotUrl={variant.screenshotUrl}
                    width={520}
                    height={340}
                    delay={cardDelay + 5}
                    badge={`#${i + 1}`}
                    badgeColor={CARD_COLORS[i]}
                  />

                  {/* Variant name + features */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: 8,
                      }}
                    >
                      {variant.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {variant.features.map((f, fi) => (
                        <div
                          key={fi}
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.5)",
                            background: "rgba(255,255,255,0.05)",
                            padding: "5px 14px",
                            borderRadius: 20,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
