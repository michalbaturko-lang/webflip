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

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  companyName: string;
  landingPageUrl: string;
};

const TIMELINE = [
  { day: "Den 1", label: "Vyberte redesign", icon: "🎯" },
  { day: "Den 2–5", label: "Upravte v editoru", icon: "✏️" },
  { day: "Den 6", label: "Finalizujte", icon: "📋" },
  { day: "Den 7", label: "Spusťte web", icon: "🚀" },
];

export const Scene5Decision: React.FC<Props> = ({ companyName, landingPageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  // Pulse on CTA
  const pulse = interpolate(frame % 45, [0, 22, 45], [1, 1.03, 1]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#1a0a28", "#09090b"]} />
      <FloatingOrbs count={6} color="245, 158, 11" />
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
              color: "#f59e0b",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            Další krok
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            <span style={{ color: "#f59e0b" }}>7 dní</span> na vyzkoušení — zdarma
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.45)",
              marginTop: 10,
            }}
          >
            Zaplaťte a web je váš. Nebo smažeme vše — žádný závazek.
          </div>
        </div>

        {/* Timeline */}
        <Sequence from={20} layout="none">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {TIMELINE.map((step, i) => {
              const stepSpring = spring({
                frame,
                fps,
                delay: 20 + i * 12,
                config: { damping: 200 },
              });
              const sOpacity = interpolate(stepSpring, [0, 1], [0, 1]);
              const sScale = interpolate(stepSpring, [0, 1], [0.85, 1]);

              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      opacity: sOpacity,
                      transform: `scale(${sScale})`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 180,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 30,
                        marginBottom: 12,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
                      {step.day}
                    </div>
                    <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                      {step.label}
                    </div>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        opacity: sOpacity * 0.3,
                        color: "#f59e0b",
                        fontSize: 20,
                        marginTop: -20,
                      }}
                    >
                      →
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Sequence>

        {/* CTA */}
        <Sequence from={70} layout="none">
          {(() => {
            const ctaSpring = spring({
              frame: frame - 70,
              fps,
              config: { damping: 15 },
            });
            const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
            const ctaScale = interpolate(ctaSpring, [0, 1], [0.9, 1]);

            return (
              <div
                style={{
                  opacity: ctaOpacity,
                  transform: `scale(${ctaScale * pulse})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {/* Big CTA button */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                    padding: "24px 64px",
                    borderRadius: 20,
                    boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    Prohlédněte si návrhy →
                  </div>
                </div>

                {/* URL */}
                <div
                  style={{
                    fontSize: 16,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 500,
                  }}
                >
                  {landingPageUrl}
                </div>

                {/* Company name */}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 15,
                    color: "rgba(255,255,255,0.2)",
                  }}
                >
                  Připraveno pro {companyName}
                </div>
              </div>
            );
          })()}
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
