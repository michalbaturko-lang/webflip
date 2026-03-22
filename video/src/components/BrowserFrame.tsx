import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";

type BrowserFrameProps = {
  url: string;
  screenshotUrl: string;
  width?: number;
  height?: number;
  delay?: number;
  style?: React.CSSProperties;
  problemOverlay?: boolean;
  badge?: string;
  badgeColor?: string;
};

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  screenshotUrl,
  width = 800,
  height = 500,
  delay = 0,
  style = {},
  problemOverlay = false,
  badge,
  badgeColor = "#6366f1",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    delay,
    config: { damping: 14, stiffness: 80 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.88, 1]);
  const translateY = interpolate(entrance, [0, 1], [30, 0]);

  const imgReveal = spring({
    frame,
    fps,
    delay: delay + 10,
    config: { damping: 200 },
  });
  const imgOpacity = interpolate(imgReveal, [0, 1], [0, 1]);

  const TOOLBAR_HEIGHT = 40;
  const BORDER_RADIUS = 18;

  return (
    <div
      style={{
        width,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        borderRadius: BORDER_RADIUS,
        overflow: "hidden",
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow:
          "0 24px 80px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        position: "relative",
        ...style,
      }}
    >
      {/* Glassmorphism toolbar */}
      <div
        style={{
          height: TOOLBAR_HEIGHT,
          background: "rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 7, marginRight: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <div
          style={{
            flex: 1,
            height: 26,
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>🔒</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
            {url}
          </div>
        </div>
      </div>

      {/* Screenshot content */}
      <div
        style={{
          width: "100%",
          height: height - TOOLBAR_HEIGHT,
          position: "relative",
          overflow: "hidden",
          background: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ opacity: imgOpacity, width: "100%", height: "100%" }}>
          <Img
            src={screenshotUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
            }}
          />
        </div>

        {problemOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, transparent 50%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Badge */}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: TOOLBAR_HEIGHT + 12,
            right: 12,
            background: badgeColor,
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            padding: "5px 14px",
            borderRadius: 20,
            boxShadow: `0 4px 16px ${badgeColor}44`,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
};
