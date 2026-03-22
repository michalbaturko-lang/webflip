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
import { ScoreGauge } from "../components/ScoreGauge";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  companyDomain: string;
  overallScore: number;
};

const FEATURES = [
  {
    icon: "✏️",
    title: "Inline Text Editor",
    desc: "Klikněte na jakýkoli text a okamžitě ho upravte. AI vám navrhne lepší formulace.",
  },
  {
    icon: "🖼️",
    title: "Drag & Drop bloky",
    desc: "Přesouvejte sekce, měňte fotky a přidávejte nové bloky pouhým přetažením.",
  },
];

export const Scene2Webflip: React.FC<Props> = ({
  companyDomain,
  overallScore,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEntrance = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleEntrance, [0, 1], [0, 1]);
  const titleY = interpolate(titleEntrance, [0, 1], [30, 0]);

  // Scores section
  const SCORES = [
    { label: "Výkon", score: Math.round(overallScore * 0.9) },
    { label: "SEO", score: Math.round(overallScore * 1.1) },
    { label: "Bezpečnost", score: Math.round(overallScore * 0.8) },
    { label: "UX", score: Math.round(overallScore * 1.0) },
    { label: "Obsah", score: Math.round(overallScore * 0.95) },
    { label: "AI Viditelnost", score: Math.round(overallScore * 0.7) },
  ];

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0a1a2e", "#0a2040", "#0a1a3e"]} />
      <GridOverlay />

      <AbsoluteFill style={{ padding: "50px 80px" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#6366f1",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 12,
            }}
          >
            Řešení
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.2,
            }}
          >
            Webflip{" "}
            <span style={{ color: "#6366f1" }}>analyzoval</span> váš web{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              {companyDomain}
            </span>
          </div>
        </div>

        {/* Score gauges row */}
        <Sequence from={15} layout="none">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              marginBottom: 40,
            }}
          >
            {SCORES.map((s, i) => (
              <ScoreGauge
                key={i}
                score={Math.min(100, Math.max(0, s.score))}
                label={s.label}
                size={120}
                delay={i * 8}
              />
            ))}
          </div>
        </Sequence>

        {/* Redesign + Features */}
        <Sequence from={80} layout="none">
          <div
            style={{
              display: "flex",
              gap: 40,
              alignItems: "stretch",
            }}
          >
            {/* Left: redesign message */}
            <div
              style={{
                flex: 1,
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
                borderRadius: 20,
                padding: "32px 36px",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: 16,
                }}
              >
                ✨ A vytvořil 3 nové redesigny
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.6,
                }}
              >
                Na základě analýzy vašeho obsahu, obrázků a podnikání
                jsme navrhli 3 moderní varianty. Každá je optimalizovaná
                pro výkon, SEO a AI viditelnost.
              </div>
            </div>

            {/* Right: 2 features */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {FEATURES.map((f, i) => {
                const fEntrance = spring({
                  frame: frame - 80,
                  fps,
                  delay: i * 15,
                  config: { damping: 200 },
                });
                const fOpacity = interpolate(fEntrance, [0, 1], [0, 1]);
                const fX = interpolate(fEntrance, [0, 1], [60, 0]);
                return (
                  <div
                    key={i}
                    style={{
                      opacity: fOpacity,
                      transform: `translateX(${fX}px)`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 20,
                      padding: "24px 28px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 36, flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#ffffff",
                          marginBottom: 6,
                        }}
                      >
                        {f.title}
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          color: "rgba(255,255,255,0.6)",
                          lineHeight: 1.5,
                        }}
                      >
                        {f.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
