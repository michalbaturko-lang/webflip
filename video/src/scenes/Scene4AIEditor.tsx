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

const EDITOR_STEPS = [
  {
    icon: "📝",
    label: "Klikněte na text",
    desc: "Vyberte jakýkoli textový blok",
    mockAction: "select",
  },
  {
    icon: "🤖",
    label: "AI navrhne",
    desc: "Umělá inteligence navrhne lepší verzi",
    mockAction: "suggest",
  },
  {
    icon: "✅",
    label: "Potvrdíte",
    desc: "Jedním kliknutím schválíte změnu",
    mockAction: "confirm",
  },
];

export const Scene4AIEditor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [30, 0]);

  // Cursor animation for the mock editor
  const cursorProgress = interpolate(frame, [60, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(cursorProgress, [0, 0.3, 0.7, 1], [200, 480, 480, 600]);
  const cursorY = interpolate(cursorProgress, [0, 0.3, 0.7, 1], [300, 180, 180, 220]);

  // Text editing animation
  const editPhase = interpolate(frame, [90, 120, 150, 200], [0, 1, 1, 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0a1a1a", "#0a2a2a", "#0a1a2e"]} />
      <GridOverlay />

      <AbsoluteFill style={{ padding: "50px 80px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#22c55e",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            AI Editor
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            Upravte si web{" "}
            <span style={{ color: "#22c55e" }}>sami</span> — s pomocí AI
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* Left: Mock editor */}
          <Sequence from={20} layout="none">
            <div
              style={{
                flex: 1.3,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Mock toolbar */}
              <div
                style={{
                  height: 48,
                  background: "rgba(255,255,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  webflip.io/editor
                </div>
              </div>

              {/* Mock content */}
              <div style={{ padding: "32px 40px" }}>
                {/* Mock heading being edited */}
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#ffffff",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background:
                      editPhase > 0
                        ? "rgba(99,102,241,0.15)"
                        : "transparent",
                    border:
                      editPhase > 0
                        ? "2px solid rgba(99,102,241,0.5)"
                        : "2px solid transparent",
                    marginBottom: 20,
                    transition: "none",
                  }}
                >
                  {editPhase < 1.5
                    ? "Vítejte na našem webu"
                    : "Najděte řešení pro váš byznys"}
                </div>

                {/* AI suggestion popup */}
                {editPhase >= 1 && editPhase < 2 && (
                  <div
                    style={{
                      background: "rgba(99,102,241,0.2)",
                      border: "1px solid rgba(99,102,241,0.4)",
                      borderRadius: 12,
                      padding: "16px 20px",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "#a5b4fc",
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      🤖 AI návrh:
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        color: "#ffffff",
                        fontWeight: 600,
                      }}
                    >
                      "Najděte řešení pro váš byznys"
                    </div>
                  </div>
                )}

                {/* Mock paragraph lines */}
                {[200, 280, 160].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      width: w,
                      height: 14,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.08)",
                      marginBottom: 10,
                    }}
                  />
                ))}

                {/* Mock image block */}
                <div
                  style={{
                    width: "100%",
                    height: 120,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 20,
                    fontSize: 24,
                    color: "rgba(255,255,255,0.2)",
                  }}
                >
                  🖼️ Přetáhněte nový obrázek
                </div>
              </div>

              {/* Animated cursor */}
              {frame > 50 && frame < 200 && (
                <div
                  style={{
                    position: "absolute",
                    left: cursorX,
                    top: cursorY,
                    width: 0,
                    height: 0,
                    borderLeft: "12px solid #ffffff",
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                    transform: "rotate(-30deg)",
                  }}
                />
              )}
            </div>
          </Sequence>

          {/* Right: Steps */}
          <Sequence from={40} layout="none">
            <div
              style={{
                flex: 0.7,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 24,
              }}
            >
              {EDITOR_STEPS.map((step, i) => {
                const stepEntrance = spring({
                  frame: frame - 40,
                  fps,
                  delay: i * 20,
                  config: { damping: 200 },
                });
                const opacity = interpolate(stepEntrance, [0, 1], [0, 1]);
                const x = interpolate(stepEntrance, [0, 1], [40, 0]);

                // Highlight active step
                const isActive =
                  (i === 0 && editPhase >= 0 && editPhase < 1) ||
                  (i === 1 && editPhase >= 1 && editPhase < 2) ||
                  (i === 2 && editPhase >= 2);

                return (
                  <div
                    key={i}
                    style={{
                      opacity,
                      transform: `translateX(${x}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      padding: "24px 28px",
                      background: isActive
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(255,255,255,0.03)",
                      borderRadius: 16,
                      border: isActive
                        ? "1px solid rgba(34,197,94,0.4)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: isActive
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 28,
                        flexShrink: 0,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: isActive ? "#22c55e" : "#ffffff",
                          marginBottom: 4,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Sequence>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
