import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

/**
 * Airtable-style vibrant gradient background.
 * Rich purples / blues / teals instead of near-black.
 */
type GradientBackgroundProps = {
  colors?: [string, string, string?];
  animate?: boolean;
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors = ["#1a0533", "#0c1445", "#0a2540"],
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const angle = animate
    ? interpolate(frame, [0, 900], [125, 215], {
        extrapolateRight: "extend",
      })
    : 135;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colors.join(", ")})`,
      }}
    />
  );
};

/**
 * Subtle dot grid — lighter, more Airtable-like.
 */
export const GridOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    />
  );
};

/**
 * Larger, more colorful floating orbs — glassmorphism depth.
 * Pure math, deterministic per frame.
 */
type FloatingOrbsProps = {
  count?: number;
  color?: string;
};

export const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  count = 5,
  color = "99, 102, 241",
}) => {
  const frame = useCurrentFrame();

  const orbs = Array.from({ length: count }, (_, i) => {
    const seed = (i + 1) * 137.508;
    const baseX = (seed * 7.3) % 100;
    const baseY = (seed * 4.1) % 100;
    const size = 300 + i * 120;
    const speed = 0.12 + i * 0.04;
    const phase = i * 1.5;

    const x = baseX + Math.sin((frame * speed + phase) * 0.018) * 10;
    const y = baseY + Math.cos((frame * speed + phase * 0.7) * 0.013) * 8;
    const opacity = 0.08 + (i % 3) * 0.03;

    return { x, y, size, opacity };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(${color}, ${orb.opacity}) 0%, transparent 70%)`,
            transform: "translate(-50%, -50%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/**
 * Very subtle noise grain
 */
export const NoiseOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
        pointerEvents: "none",
      }}
    />
  );
};

/**
 * Glassmorphism card wrapper — reusable across all scenes.
 */
type GlassCardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
  intensity?: "light" | "medium" | "strong";
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style = {},
  intensity = "medium",
}) => {
  const bg =
    intensity === "light"
      ? "rgba(255, 255, 255, 0.04)"
      : intensity === "strong"
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(255, 255, 255, 0.07)";

  const border =
    intensity === "light"
      ? "rgba(255, 255, 255, 0.06)"
      : intensity === "strong"
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(255, 255, 255, 0.1)";

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 20,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
