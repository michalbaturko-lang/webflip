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

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  companyName: string;
  landingPageUrl: string;
};

const TIMELINE = [
  { day: "Den 1", label: "Představení vašeho webu", icon: "🎯" },
  { day: "Den 1–7", label: "Seznamte se s variantami a možnostmi úprav", icon: "✏️" },
  { day: "Den 7", label: "Poslední možnost platby", icon: "💳" },
];

export const Scene5Decision: React.FC<Props> = ({
  companyName,
  landingPageUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [25, 0]);

  // CTA pulse — gentle breathing
  const pulse = interpolate(
    Math.sin(frame * 0.06),
    [-1, 1],
    [1, 1.025]
  );

  // CTA glow intensity
  const glowIntensity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.3, 0.5]
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#1a0533", "#0c1445", "#2a0a18"]} />
      <FloatingOrbs count={7} color="251, 191, 36" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill style={{ padding: "48px 72px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 36,
            textAlign: "center",
          }}
        >
          <GlassCard
            intensity="light"
            style={{
              display: "inline-flex",
              padding: "6px 18px",
              borderRadius: 30,
              marginBottom: 18,
              border: "1px solid rgba(251,191,36,0.25)",
              background: "rgba(251,191,36,0.08)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "#fde68a",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              Další krok
            </span>
          </GlassCard>

          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              7 dní
            </span>{" "}
            na vyzkoušení — zdarma
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.45)",
              marginTop: 12,
            }}
          >
            Zaplaťte a web je váš. Nebo smažeme vše — žádný závazek.
          </div>
        </div>

        {/* Timeline — glass cards */}
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
                delay: 20 + i * 10,
                config: { damping: 12, stiffness: 80 },
              });
              const sOpacity = interpolate(stepSpring, [0, 1], [0, 1]);
              const sScale = interpolate(stepSpring, [0, 1], [0.8, 1]);
              const sY = interpolate(stepSpring, [0, 1], [20, 0]);

              return (
                <React.Fragment key={i}>
                  <GlassCard
                    intensity="light"
                    style={{
                      opacity: sOpacity,
                      transform: `scale(${sScale}) translateY(${sY}px)`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: 200,
                      padding: "28px 20px",
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background:
                          "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
                        border: "1px solid rgba(251,191,36,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 32,
                        marginBottom: 16,
                      }}
                    >
                      {step.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#fbbf24",
                        marginBottom: 4,
                      }}
                    >
                      {step.day}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "rgba(255,255,255,0.6)",
                        textAlign: "center",
                      }}
                    >
                      {step.label}
                    </div>
                  </GlassCard>

                  {i < TIMELINE.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        opacity: sOpacity * 0.4,
                        color: "#fbbf24",
                        fontSize: 20,
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

        {/* CTA with QR code */}
        <Sequence from={70} layout="none">
          {(() => {
            const ctaSpring = spring({
              frame: frame - 70,
              fps,
              config: { damping: 12, stiffness: 80 },
            });
            const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
            const ctaScale = interpolate(ctaSpring, [0, 1], [0.85, 1]);
            const ctaY = interpolate(ctaSpring, [0, 1], [30, 0]);

            return (
              <div
                style={{
                  opacity: ctaOpacity,
                  transform: `scale(${ctaScale * pulse}) translateY(${ctaY}px)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 48,
                }}
              >
                {/* QR code placeholder — in production, generate real QR */}
                <div style={{ position: "relative" }}>
                  {/* Glow behind QR */}
                  <div
                    style={{
                      position: "absolute",
                      inset: -24,
                      borderRadius: 28,
                      background: `radial-gradient(ellipse, rgba(99,102,241,${glowIntensity}) 0%, transparent 70%)`,
                      filter: "blur(24px)",
                      pointerEvents: "none",
                    }}
                  />
                  <GlassCard
                    intensity="strong"
                    style={{
                      position: "relative",
                      padding: 20,
                      borderRadius: 20,
                    }}
                  >
                    {/* QR code grid pattern (placeholder) */}
                    <div
                      style={{
                        width: 160,
                        height: 160,
                        background: "#ffffff",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Stylized QR pattern */}
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        {/* Corner squares */}
                        <rect x="8" y="8" width="36" height="36" rx="4" fill="#0a0a1a" />
                        <rect x="14" y="14" width="24" height="24" rx="2" fill="#ffffff" />
                        <rect x="20" y="20" width="12" height="12" rx="1" fill="#0a0a1a" />

                        <rect x="96" y="8" width="36" height="36" rx="4" fill="#0a0a1a" />
                        <rect x="102" y="14" width="24" height="24" rx="2" fill="#ffffff" />
                        <rect x="108" y="20" width="12" height="12" rx="1" fill="#0a0a1a" />

                        <rect x="8" y="96" width="36" height="36" rx="4" fill="#0a0a1a" />
                        <rect x="14" y="102" width="24" height="24" rx="2" fill="#ffffff" />
                        <rect x="20" y="108" width="12" height="12" rx="1" fill="#0a0a1a" />

                        {/* Center data pattern */}
                        {[52, 60, 68, 76, 84].map((x) =>
                          [52, 60, 68, 76, 84].map((y) => {
                            const show = ((x * 7 + y * 13) % 3) !== 0;
                            return show ? (
                              <rect
                                key={`${x}-${y}`}
                                x={x}
                                y={y}
                                width="6"
                                height="6"
                                rx="1"
                                fill="#0a0a1a"
                              />
                            ) : null;
                          })
                        )}

                        {/* More data modules */}
                        {[8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120].map(
                          (x) =>
                            [48, 56, 64, 72, 80, 88].map((y) => {
                              const show = ((x * 3 + y * 7) % 5) < 2;
                              return show ? (
                                <rect
                                  key={`d-${x}-${y}`}
                                  x={x}
                                  y={y}
                                  width="5"
                                  height="5"
                                  rx="1"
                                  fill="#0a0a1a"
                                  opacity={0.7}
                                />
                              ) : null;
                            })
                        )}

                        {/* Webflipper icon center */}
                        <rect x="55" y="55" width="30" height="30" rx="6" fill="#6366f1" />
                        <text
                          x="70"
                          y="74"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="16"
                          fontWeight="900"
                          fontFamily="sans-serif"
                        >
                          W
                        </text>
                      </svg>
                    </div>
                  </GlassCard>
                </div>

                {/* Right side: text */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#ffffff",
                      lineHeight: 1.3,
                    }}
                  >
                    Naskenujte QR kód
                    <br />
                    <span style={{ color: "#a5b4fc" }}>
                      a podívejte se na váš nový web
                    </span>
                  </div>

                  {/* URL */}
                  <div
                    style={{
                      fontSize: 16,
                      color: "rgba(255,255,255,0.35)",
                      fontWeight: 500,
                    }}
                  >
                    {landingPageUrl}
                  </div>

                  {/* Company name */}
                  <div
                    style={{
                      fontSize: 15,
                      color: "rgba(255,255,255,0.2)",
                    }}
                  >
                    Připraveno pro {companyName}
                  </div>
                </div>
              </div>
            );
          })()}
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
