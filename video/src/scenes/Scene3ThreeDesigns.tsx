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

const VARIANTS = [
  {
    name: "Moderní Minimální",
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    features: ["Čistý layout", "Velké CTA", "Rychlé načítání"],
  },
  {
    name: "Profesionální Bold",
    gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    features: ["Vizuální hierarchie", "Trust signály", "Testimonials"],
  },
  {
    name: "Konverzní Stroj",
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    features: ["A/B optimální", "Lead magnet", "Social proof"],
  },
];

export const Scene3ThreeDesigns: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0a0a2e", "#0f1040", "#0a0a2e"]} />
      <GridOverlay />

      <AbsoluteFill
        style={{
          padding: "60px 100px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#a855f7",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            Výběr
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: "#a855f7" }}>7 dní</span> na výběr z{" "}
            <span style={{ color: "#6366f1" }}>3 redesignů</span>
          </div>
        </div>

        {/* Three cards */}
        <Sequence from={20} layout="none">
          <div
            style={{
              display: "flex",
              gap: 32,
              justifyContent: "center",
              flex: 1,
              alignItems: "center",
            }}
          >
            {VARIANTS.map((v, i) => {
              const cardEntrance = spring({
                frame,
                fps,
                delay: 20 + i * 20,
                config: { damping: 15, stiffness: 100 },
              });
              const scale = interpolate(cardEntrance, [0, 1], [0.7, 1]);
              const opacity = interpolate(cardEntrance, [0, 1], [0, 1]);
              const rotateY = interpolate(cardEntrance, [0, 1], [15, 0]);

              return (
                <div
                  key={i}
                  style={{
                    transform: `scale(${scale}) perspective(800px) rotateY(${rotateY}deg)`,
                    opacity,
                    width: 340,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 24,
                    border: "1px solid rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  {/* Card header - design preview mock */}
                  <div
                    style={{
                      height: 180,
                      background: v.gradient,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {/* Mock browser chrome */}
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 16,
                        display: "flex",
                        gap: 6,
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div style={{ fontSize: 56, opacity: 0.9 }}>
                      {i === 0 ? "🎨" : i === 1 ? "💎" : "🚀"}
                    </div>
                    {/* Variant number badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 16,
                        background: "rgba(0,0,0,0.4)",
                        borderRadius: 20,
                        padding: "4px 14px",
                        fontSize: 14,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      #{i + 1}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "24px 28px" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#ffffff",
                        marginBottom: 16,
                      }}
                    >
                      {v.name}
                    </div>
                    {v.features.map((f, fi) => (
                      <div
                        key={fi}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                          fontSize: 16,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#6366f1",
                            flexShrink: 0,
                          }}
                        />
                        {f}
                      </div>
                    ))}
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
