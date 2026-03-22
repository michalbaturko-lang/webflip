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

const STEPS = [
  {
    num: "01",
    label: "Klikněte na prvek",
    desc: "Vyberte jakýkoli text, obrázek nebo blok na stránce",
    color: "#6366f1",
  },
  {
    num: "02",
    label: "Popište změnu",
    desc: "Napište česky co chcete — \"změň barvu na modrou\"",
    color: "#8b5cf6",
  },
  {
    num: "03",
    label: "AI upraví okamžitě",
    desc: "Barvy, texty, obrázky, layout — vše se změní během sekund",
    color: "#a855f7",
  },
];

export const Scene4AIEditor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

  // Mock editor phases
  const editPhase = interpolate(frame, [60, 100, 140, 200], [0, 1, 1, 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cursor
  const cursorProgress = interpolate(frame, [50, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(cursorProgress, [0, 0.3, 0.7, 1], [120, 360, 360, 440]);
  const cursorY = interpolate(cursorProgress, [0, 0.3, 0.7, 1], [260, 140, 140, 180]);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#0a1a18", "#09090b"]} />
      <FloatingOrbs count={4} color="34, 197, 94" />
      <NoiseOverlay />

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
              fontSize: 15,
              color: "#22c55e",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            AI Editor
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Upravte web{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #22c55e, #10b981)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              sami
            </span>
            {" — "}bez programátora
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* Left: Mock editor */}
          <Sequence from={15} layout="none">
            <div
              style={{
                flex: 1.3,
                background: "rgba(255,255,255,0.02)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
              }}
            >
              {/* Toolbar */}
              <div
                style={{
                  height: 44,
                  background: "linear-gradient(180deg, #1e1e2e, #1a1a28)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 7 }}>
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 7,
                    background: "rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  🔒 webflipper.app/editor
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: "28px 36px" }}>
                {/* Editable heading */}
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background:
                      editPhase > 0
                        ? "rgba(99,102,241,0.12)"
                        : "transparent",
                    border:
                      editPhase > 0
                        ? "2px solid rgba(99,102,241,0.4)"
                        : "2px solid transparent",
                    marginBottom: 18,
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
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: 12,
                      padding: "14px 18px",
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#a5b4fc", fontWeight: 600, marginBottom: 6 }}>
                      ✨ AI návrh:
                    </div>
                    <div style={{ fontSize: 17, color: "#ffffff", fontWeight: 600 }}>
                      „Najděte řešení pro váš byznys"
                    </div>
                  </div>
                )}

                {/* Placeholder lines */}
                {[240, 320, 180].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      width: w,
                      height: 12,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      marginBottom: 10,
                    }}
                  />
                ))}

                {/* Mock image placeholder */}
                <div
                  style={{
                    width: "100%",
                    height: 100,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))",
                    border: "1px dashed rgba(255,255,255,0.08)",
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.15)",
                  }}
                >
                  Přetáhněte obrázek
                </div>
              </div>

              {/* Cursor */}
              {frame > 40 && frame < 180 && (
                <div
                  style={{
                    position: "absolute",
                    left: cursorX,
                    top: cursorY,
                    width: 0,
                    height: 0,
                    borderLeft: "14px solid #ffffff",
                    borderTop: "9px solid transparent",
                    borderBottom: "9px solid transparent",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                    transform: "rotate(-30deg)",
                  }}
                />
              )}
            </div>
          </Sequence>

          {/* Right: Steps */}
          <Sequence from={30} layout="none">
            <div
              style={{
                flex: 0.65,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 20,
              }}
            >
              {STEPS.map((step, i) => {
                const stepSpring = spring({
                  frame: frame - 30,
                  fps,
                  delay: i * 18,
                  config: { damping: 200 },
                });
                const sOpacity = interpolate(stepSpring, [0, 1], [0, 1]);
                const sX = interpolate(stepSpring, [0, 1], [30, 0]);

                const isActive =
                  (i === 0 && editPhase >= 0 && editPhase < 1) ||
                  (i === 1 && editPhase >= 1 && editPhase < 2) ||
                  (i === 2 && editPhase >= 2);

                return (
                  <div
                    key={i}
                    style={{
                      opacity: sOpacity,
                      transform: `translateX(${sX}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "22px 24px",
                      background: isActive
                        ? `rgba(34,197,94,0.08)`
                        : "rgba(255,255,255,0.02)",
                      borderRadius: 14,
                      border: isActive
                        ? "1px solid rgba(34,197,94,0.3)"
                        : "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: isActive
                          ? `linear-gradient(135deg, ${step.color}, ${step.color}88)`
                          : "rgba(255,255,255,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        fontWeight: 900,
                        color: isActive ? "#ffffff" : "rgba(255,255,255,0.3)",
                        flexShrink: 0,
                      }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 19,
                          fontWeight: 700,
                          color: isActive ? "#22c55e" : "#ffffff",
                          marginBottom: 3,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "rgba(255,255,255,0.4)",
                          lineHeight: 1.4,
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
