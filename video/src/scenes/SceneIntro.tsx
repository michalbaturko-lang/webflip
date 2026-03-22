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
import { GradientBackground, FloatingOrbs, NoiseOverlay } from "../components/GradientBackground";

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
  const logoSpring = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Tagline
  const tagSpring = spring({ frame, fps, delay: 15, config: { damping: 200 } });
  const tagOpacity = interpolate(tagSpring, [0, 1], [0, 1]);
  const tagY = interpolate(tagSpring, [0, 1], [24, 0]);

  // Domain badge
  const badgeSpring = spring({ frame, fps, delay: 35, config: { damping: 200 } });
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.9, 1]);

  // Greeting
  const greetSpring = spring({ frame, fps, delay: 55, config: { damping: 200 } });
  const greetOpacity = interpolate(greetSpring, [0, 1], [0, 1]);

  // Pulsing ring around logo
  const ringPulse = interpolate(frame, [0, 90], [0, 360], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#09090b", "#0f0f23", "#09090b"]} />
      <FloatingOrbs count={6} color="99, 102, 241" />
      <NoiseOverlay />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo container */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            marginBottom: 28,
            position: "relative",
          }}
        >
          {/* Rotating ring */}
          <svg
            width={160}
            height={160}
            viewBox="0 0 160 160"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) rotate(${ringPulse}deg)`,
              opacity: 0.2,
            }}
          >
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r="74"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="120 340"
            />
          </svg>

          {/* Logo text */}
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              position: "relative",
              letterSpacing: -2,
            }}
          >
            Webflip
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
            fontSize: 24,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 400,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          AI-Powered Web Redesign
        </div>

        {/* Domain badge */}
        <Sequence from={35} layout="none">
          <div
            style={{
              opacity: badgeOpacity,
              transform: `scale(${badgeScale})`,
              marginTop: 40,
              padding: "14px 36px",
              borderRadius: 50,
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
              Analýza pro{" "}
            </span>
            <span style={{ fontSize: 20, color: "#a5b4fc", fontWeight: 700 }}>
              {companyDomain}
            </span>
          </div>
        </Sequence>

        {/* Personal greeting */}
        {contactName && (
          <Sequence from={55} layout="none">
            <div
              style={{
                opacity: greetOpacity,
                marginTop: 20,
                fontSize: 18,
                color: "rgba(255,255,255,0.35)",
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
