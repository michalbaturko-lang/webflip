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
import { ScoreGauge } from "../components/ScoreGauge";
import type { ScoreDetail } from "../Video";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  companyDomain: string;
  overallScore: number;
  scores: ScoreDetail[];
};

export const Scene2Webflipper: React.FC<Props> = ({
  companyDomain,
  overallScore,
  scores,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [25, 0]);

  // Big score animation
  const bigScoreSpring = spring({
    frame,
    fps,
    delay: 20,
    config: { damping: 200 },
    durationInFrames: 50,
  });
  const animatedBigScore = Math.round(
    interpolate(bigScoreSpring, [0, 1], [0, overallScore])
  );

  const scoreColor =
    overallScore >= 80
      ? "#34d399"
      : overallScore >= 60
      ? "#fbbf24"
      : overallScore >= 40
      ? "#fb923c"
      : "#f87171";

  const circumference = 2 * Math.PI * 80;
  const scoreOffset =
    circumference - (circumference * animatedBigScore) / 100;

  // Breathing glow around score
  const glowIntensity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.3, 0.6]
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0c1445", "#1a0533", "#0a2540"]} />
      <FloatingOrbs count={5} color="99, 102, 241" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill style={{ padding: "48px 72px", display: "flex", flexDirection: "column" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 36,
          }}
        >
          <GlassCard
            intensity="light"
            style={{
              display: "inline-flex",
              padding: "6px 18px",
              borderRadius: 30,
              marginBottom: 18,
              border: "1px solid rgba(129,140,248,0.25)",
              background: "rgba(129,140,248,0.08)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "#a5b4fc",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              Analýza
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
            Webflipper.com analyzoval{" "}
            <span style={{ color: "#a5b4fc" }}>{companyDomain}</span>
          </div>
        </div>

        {/* Main content: big score + detail scores */}
        <div style={{ display: "flex", gap: 48, alignItems: "center", flex: 1 }}>
          {/* Left: Big circle score inside glass card */}
          <Sequence from={15} layout="none">
            <GlassCard
              intensity="medium"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "32px 40px",
              }}
            >
              <div style={{ position: "relative", width: 200, height: 200 }}>
                {/* Glow behind score */}
                <div
                  style={{
                    position: "absolute",
                    inset: -20,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${scoreColor}${Math.round(glowIntensity * 30).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />
                <svg width={200} height={200} viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={scoreOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    style={{
                      filter: `drop-shadow(0 0 8px ${scoreColor}66)`,
                    }}
                  />
                  <text
                    x="100"
                    y="92"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={scoreColor}
                    fontSize="52"
                    fontWeight="900"
                    fontFamily="sans-serif"
                  >
                    {animatedBigScore}
                  </text>
                  <text
                    x="100"
                    y="130"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.35)"
                    fontSize="16"
                    fontWeight="500"
                    fontFamily="sans-serif"
                  >
                    z 100
                  </text>
                </svg>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: scoreColor,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                {overallScore >= 80
                  ? "Výborné"
                  : overallScore >= 60
                  ? "Průměrné"
                  : overallScore >= 40
                  ? "Slabé"
                  : "Kritické"}
              </div>
            </GlassCard>
          </Sequence>

          {/* Right: Detail scores grid */}
          <Sequence from={25} layout="none">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                flex: 1,
                justifyContent: "center",
              }}
            >
              {scores.map((s, i) => (
                <ScoreGauge
                  key={i}
                  score={Math.min(100, Math.max(0, s.score))}
                  label={s.label}
                  size={130}
                  delay={i * 8}
                />
              ))}
            </div>
          </Sequence>
        </div>

        {/* Key findings row */}
        <Sequence from={70} layout="none">
          {(() => {
            const findSpring = spring({ frame: frame - 70, fps, config: { damping: 14 } });
            const findOpacity = interpolate(findSpring, [0, 1], [0, 1]);
            const findY = interpolate(findSpring, [0, 1], [15, 0]);
            const findings = [
              { icon: "⚡", text: "Načítání 3× pomalejší než průměr", color: "#f87171" },
              { icon: "📱", text: "Mobilní verze prakticky nefunkční", color: "#fb923c" },
              { icon: "🔍", text: "Google indexuje jen 12 % stránek", color: "#fbbf24" },
              { icon: "🤖", text: "AI asistenti web zcela ignorují", color: "#f87171" },
            ];
            return (
              <div
                style={{
                  opacity: findOpacity,
                  transform: `translateY(${findY}px)`,
                  display: "flex",
                  gap: 14,
                  marginTop: 16,
                  marginBottom: 16,
                }}
              >
                {findings.map((f, i) => (
                  <GlassCard
                    key={i}
                    intensity="light"
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</div>
                    <div style={{ fontSize: 13, color: f.color, fontWeight: 600, lineHeight: 1.3 }}>
                      {f.text}
                    </div>
                  </GlassCard>
                ))}
              </div>
            );
          })()}
        </Sequence>

        {/* Bottom bar: "Created 3 redesigns" — glass card */}
        <Sequence from={120} layout="none">
          {(() => {
            const barSpring = spring({
              frame: frame - 120,
              fps,
              config: { damping: 14 },
            });
            const barOpacity = interpolate(barSpring, [0, 1], [0, 1]);
            const barY = interpolate(barSpring, [0, 1], [20, 0]);
            return (
              <GlassCard
                intensity="medium"
                style={{
                  opacity: barOpacity,
                  transform: `translateY(${barY}px)`,
                  marginTop: 36,
                  padding: "22px 32px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background:
                    "linear-gradient(135deg, rgba(129,140,248,0.1), rgba(168,85,247,0.06))",
                }}
              >
                <div style={{ fontSize: 28 }}>✨</div>
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Na základě analýzy jsme vytvořili 3 redesigny
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: "rgba(255,255,255,0.5)",
                      marginTop: 4,
                    }}
                  >
                    Každý optimalizovaný pro výkon, SEO a AI viditelnost
                  </div>
                </div>
              </GlassCard>
            );
          })()}
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
