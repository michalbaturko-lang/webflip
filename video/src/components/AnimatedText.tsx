import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

type AnimatedTextProps = {
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  delay?: number;
  style?: React.CSSProperties;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 48,
  color = "#ffffff",
  fontWeight = 700,
  delay = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const translateY = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        lineHeight: 1.3,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

type TypewriterTextProps = {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  fontSize = 36,
  color = "#ffffff",
  delay = 0,
  speed = 2,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const charsToShow = Math.min(Math.floor(adjustedFrame / speed), text.length);
  const displayText = text.slice(0, charsToShow);
  const showCursor = adjustedFrame % 16 < 10 && charsToShow < text.length;

  return (
    <div
      style={{
        fontSize,
        color,
        fontFamily: "monospace",
        ...style,
      }}
    >
      {displayText}
      {showCursor && (
        <span style={{ opacity: 1, color: "#6366f1" }}>|</span>
      )}
    </div>
  );
};
