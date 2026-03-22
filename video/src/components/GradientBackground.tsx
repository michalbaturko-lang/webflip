import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type GradientBackgroundProps = {
  colors?: [string, string, string?];
  animate?: boolean;
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors = ["#09090b", "#0f0f23", "#09090b"],
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const angle = animate
    ? interpolate(frame, [0, 600], [135, 200], {
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

export const GridOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }}
    />
  );
};

/**
 * Floating orbs for depth and visual polish.
 * Pure math — no randomness, deterministic per frame.
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

  // Deterministic orb positions seeded by index
  const orbs = Array.from({ length: count }, (_, i) => {
    const seed = (i + 1) * 137.508; // golden angle in degrees
    const baseX = ((seed * 7.3) % 100);
    const baseY = ((seed * 4.1) % 100);
    const size = 200 + (i * 80);
    const speed = 0.15 + (i * 0.05);
    const phase = i * 1.2;

    const x = baseX + Math.sin((frame * speed + phase) * 0.02) * 8;
    const y = baseY + Math.cos((frame * speed + phase * 0.7) * 0.015) * 6;
    const opacity = 0.04 + (i % 3) * 0.015;

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
            pointerEvents: "none",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/**
 * Subtle noise grain overlay
 */
export const NoiseOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
        pointerEvents: "none",
      }}
    />
  );
};
