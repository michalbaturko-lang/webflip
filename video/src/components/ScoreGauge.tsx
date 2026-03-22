import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { GlassCard } from "./GradientBackground";

type ScoreGaugeProps = {
  score: number;
  label: string;
  size?: number;
  delay?: number;
};

function scoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  label,
  size = 140,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
    durationInFrames: 45,
  });

  const animatedScore = Math.round(interpolate(progress, [0, 1], [0, score]));
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset =
    circumference - (circumference * animatedScore) / 100;
  const color = scoreColor(score);

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 14, stiffness: 80 },
  });
  const scale = interpolate(entrance, [0, 1], [0.5, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <GlassCard
      intensity="light"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        transform: `scale(${scale})`,
        opacity,
        padding: "16px 12px",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{
            filter: `drop-shadow(0 0 6px ${color}55)`,
          }}
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="36"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          {animatedScore}
        </text>
      </svg>
      <div
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.65)",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </GlassCard>
  );
};
