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

type Props = {
  companyName: string;
};

const TIMELINE_STEPS = [
  { day: "Den 1", label: "Vyberte svůj redesign", icon: "🎯" },
  { day: "Den 2–5", label: "Upravte design v AI editoru", icon: "✏️" },
  { day: "Den 6", label: "Finalizujte obsah", icon: "📋" },
  { day: "Den 7", label: "Zaplaťte a spusťte", icon: "🚀" },
];

export const Scene5Decision: React.FC<Props> = ({ companyName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [30, 0]);

  // Countdown pulse
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.05, 1]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#1a0a2e", "#2a1040", "#1a0a2e"]} />
      <GridOverlay />

      <AbsoluteFill style={{ padding: "50px 80px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#f59e0b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            Rozhodnutí
          </div>
          <div
            style={{
              fontSize: 50,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: "#f59e0b" }}>7 dní</span> na rozhodnutí
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.6)",
              marginTop: 12,
            }}
          >
            Zaplaťte kartou a web se spustí. Nebo smažeme vše — žádný závazek.
          </div>
        </div>

        {/* Timeline */}
        <Sequence from={20} layout="none">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginBottom: 48,
            }}
          >
            {TIMELINE_STEPS.map((step, i) => {
              const stepEntrance = spring({
                frame,
                fps,
                delay: 20 + i * 15,
                config: { damping: 200 },
              });
              const opacity = interpolate(stepEntrance, [0, 1], [0, 1]);
              const scale = interpolate(stepEntrance, [0, 1], [0.8, 1]);

              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      opacity,
                      transform: `scale(${scale})`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 200,
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 36,
                        marginBottom: 14,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#f59e0b",
                        marginBottom: 4,
                      }}
                    >
                      {step.day}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        color: "rgba(255,255,255,0.7)",
                        textAlign: "center",
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        opacity: opacity * 0.4,
                        color: "#f59e0b",
                        fontSize: 28,
                        marginTop: -30,
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

        {/* Bottom: Two options */}
        <Sequence from={80} layout="none">
          <div
            style={{
              display: "flex",
              gap: 40,
              justifyContent: "center",
            }}
          >
            {/* Option A: Pay */}
            {(() => {
              const aEntrance = spring({
                frame: frame - 80,
                fps,
                config: { damping: 15 },
              });
              const aOpacity = interpolate(aEntrance, [0, 1], [0, 1]);
              const aScale = interpolate(aEntrance, [0, 1], [0.8, 1]);
              return (
                <div
                  style={{
                    opacity: aOpacity,
                    transform: `scale(${aScale * pulse})`,
                    width: 420,
                    padding: "36px 40px",
                    borderRadius: 24,
                    background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))",
                    border: "2px solid rgba(34,197,94,0.4)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#22c55e",
                      marginBottom: 8,
                    }}
                  >
                    Zaplaťte a spusťte
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      color: "rgba(255,255,255,0.6)",
                      lineHeight: 1.5,
                    }}
                  >
                    Jednorázová platba kartou. Web přejde na vaši doménu do 24
                    hodin.
                  </div>
                </div>
              );
            })()}

            {/* VS divider */}
            {(() => {
              const vsEntrance = spring({
                frame: frame - 80,
                fps,
                delay: 10,
                config: { damping: 200 },
              });
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    opacity: interpolate(vsEntrance, [0, 1], [0, 1]),
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    nebo
                  </div>
                </div>
              );
            })()}

            {/* Option B: Delete */}
            {(() => {
              const bEntrance = spring({
                frame: frame - 80,
                fps,
                delay: 15,
                config: { damping: 15 },
              });
              const bOpacity = interpolate(bEntrance, [0, 1], [0, 1]);
              const bScale = interpolate(bEntrance, [0, 1], [0.8, 1]);
              return (
                <div
                  style={{
                    opacity: bOpacity,
                    transform: `scale(${bScale})`,
                    width: 420,
                    padding: "36px 40px",
                    borderRadius: 24,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 8,
                    }}
                  >
                    Smažeme vše
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: 1.5,
                    }}
                  >
                    Žádný závazek, žádné poplatky. Po 7 dnech se vše
                    automaticky odstraní.
                  </div>
                </div>
              );
            })()}
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
