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

  const titleSpring = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [30, 0]);

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
      ? "#22c55e"
      : overallScore >= 60
      ? "#eab308"
      : overallScore >= 40
      ? "#f97316"
      : "#ef4444";

  const circumference = 2 * Math.PI * 80;
  const scoreOffset =
    circumference - (circumference * animatedBigScore) / 100;

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#0a1528", "#09090b"]} />
      <FloatingOrbs count={5} color="99, 102, 241" />
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
              color: "#6366f1",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 4,
              marginBottom: 14,
            }}
          >
            Analýza
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Webflipper analyzoval{" "}
            <span style={{ color: "#6366f1" }}>{companyDomain}</span>
          </div>
        </div>

        {/* Main content: big score + detail scores */}
        <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
          {/* Left: Big circle score */}
          <Sequence from={15} layout="none">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ position: "relative", width: 200, height: 200 }}>
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
                  fontSize: 20,
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
            </div>
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

        {/* Bottom bar: "Created 3 redesigns" */}
        <Sequence from={100} layout="none">
          {(() => {
            const barSpring = spring({
              frame: frame - 100,
              fps,
              config: { damping: 200 },
            });
            const barOpacity = interpolate(barSpring, [0, 1], [0, 1]);
            const barY = interpolate(barSpring, [0, 1], [20, 0]);
            return (
              <div
                style={{
                  opacity: barOpacity,
                  transform: `translateY(${barY}px)`,
                  marginTop: 36,
                  padding: "22px 32px",
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
                  borderRadius: 16,
                  border: "1px solid rgba(99,102,241,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
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
              </div>
            );
          })()}
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
