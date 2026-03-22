import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

type GradientBackgroundProps = {
  colors?: [string, string, string?];
  animate?: boolean;
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors = ["#0a0a2e", "#1a1a4e", "#0a0a2e"],
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const angle = animate
    ? interpolate(frame, [0, 300], [135, 180], {
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
          linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
};
