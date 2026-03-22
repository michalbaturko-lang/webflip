import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

type ScoreGaugeProps = {
  score: number;
  label: string;
  size?: number;
  delay?: number;
};

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
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
  const strokeDashoffset = circumference - (circumference * animatedScore) / 100;
  const color = scoreColor(score);

  const entrance = spring({ frame, fps, delay: delay, config: { damping: 200 } });
  const scale = interpolate(entrance, [0, 1], [0.5, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
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
        />
        {/* Score text */}
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
          fontSize: 16,
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
};
