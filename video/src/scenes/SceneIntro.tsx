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

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

type Props = {
  companyDomain: string;
  contactName?: string;
};

export const SceneIntro: React.FC<Props> = ({ companyDomain, contactName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance — bouncy
  const logoSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Tagline
  const tagSpring = spring({ frame, fps, delay: 18, config: { damping: 14 } });
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);
  const tagY = interpolate(tagSpring, [0, 1], [20, 0]);

  // Domain badge
  const badgeSpring = spring({ frame, fps, delay: 40, config: { damping: 14 } });
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.85, 1]);

  // Greeting
  const greetSpring = spring({ frame, fps, delay: 58, config: { damping: 200 } });
  const greetOpacity = interpolate(greetSpring, [0, 1], [0, 1]);

  // Pulsing glow ring
  const ringPulse = interpolate(frame, [0, 120], [0, 360], {
    extrapolateRight: "extend",
  });

  // Breathing glow behind logo
  const glowScale = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.95, 1.1]
  );

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#1a0533", "#0c1445", "#0a1a38"]} />
      <FloatingOrbs count={7} color="120, 80, 255" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Glow behind logo */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.08) 40%, transparent 70%)",
            transform: `scale(${glowScale})`,
            pointerEvents: "none",
          }}
        />

        {/* Logo container */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            marginBottom: 32,
            position: "relative",
          }}
        >
          {/* Rotating ring */}
          <svg
            width={180}
            height={180}
            viewBox="0 0 180 180"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${ringPulse}deg)`,
              opacity: 0.3,
            }}
          >
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle
              cx="90"
              cy="90"
              r="84"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="130 380"
            />
          </svg>

          {/* Logo text */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              background: "linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              position: "relative",
              letterSpacing: -2,
            }}
          >
            Webflipper.com
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
            fontSize: 22,
            color: "rgba(255,255,255,0.45)",
            fontWeight: 400,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          AI-Powered Web Redesign
        </div>

        {/* Domain badge — glassmorphism pill */}
        <Sequence from={35} layout="none">
          <GlassCard
            intensity="medium"
            style={{
              opacity: badgeOpacity,
              transform: `scale(${badgeScale})`,
              marginTop: 44,
              padding: "16px 40px",
              borderRadius: 50,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.5)",
              }}
            />
            <span
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,0.45)",
                fontWeight: 400,
              }}
            >
              Analýza pro
            </span>
            <span
              style={{
                fontSize: 19,
                color: "#c4b5fd",
                fontWeight: 700,
              }}
            >
              {companyDomain}
            </span>
          </GlassCard>
        </Sequence>

        {/* Personal greeting */}
        {contactName && (
          <Sequence from={55} layout="none">
            <div
              style={{
                opacity: greetOpacity,
                marginTop: 22,
                fontSize: 17,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Připraveno pro {contactName}
            </div>
          </Sequence>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
