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
  weights: ["400", "600", "700", "900"],
  subsets: ["latin", "latin-ext"],
});

/**
 * AI Editor scene — concrete demonstration:
 *
 * Phase 1 (0-60):   Show mock restaurant website in editor
 * Phase 2 (60-90):  Cursor moves to heading, clicks it, selection highlight
 * Phase 3 (90-150): AI chat bubble appears, user types "Změň nadpis na 'Nejlepší restaurace v Praze'"
 * Phase 4 (150-200): Heading morphs to new text with glow effect
 * Phase 5 (200-250): Cursor moves to hero section color, clicks
 * Phase 6 (250-310): AI chat: "Změň barvu pozadí na teplou zlatou", section changes color
 * Phase 7 (310-420): Success state — both changes visible, "Hotovo!" badge
 */
export const Scene4AIEditor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 14 } });
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleY = interpolate(titleSpring, [0, 1], [25, 0]);

  // --- Cursor position ---
  // Phase 1 (0-55): idle at bottom-right
  // Phase 2 (55-70): move to heading
  // Phase 3 (70-195): stay on heading
  // Phase 4 (195-220): move to hero bg
  // Phase 5 (220+): stay on hero
  const cursorX = interpolate(
    frame,
    [0, 55, 70, 195, 220],
    [680, 680, 280, 280, 520],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  const cursorY = interpolate(
    frame,
    [0, 55, 70, 195, 220],
    [380, 380, 110, 110, 200],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // --- Click flash ---
  const click1 = frame >= 72 && frame <= 80;
  const click2 = frame >= 222 && frame <= 230;
  const clickActive = click1 || click2;
  const clickScale = clickActive
    ? interpolate(frame % 10, [0, 4, 8], [1, 1.8, 1])
    : 1;

  // --- Heading state ---
  const headingSelected = frame >= 75 && frame < 330;
  const headingOld = "Vítejte v naší restauraci";
  const headingNew = "Nejlepší restaurace v Praze";
  const headingTransition = interpolate(frame, [155, 175], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const displayHeading =
    headingTransition > 0.5 ? headingNew : headingOld;

  // --- Hero bg color ---
  const heroBgTransition = interpolate(frame, [260, 285], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroColor = heroBgTransition > 0.5
    ? "linear-gradient(135deg, #92400e, #b45309, #d97706)"
    : "linear-gradient(135deg, #1e3a5f, #1e40af, #3b82f6)";

  // --- AI Chat bubble visibility ---
  const chat1Visible = frame >= 85 && frame < 170;
  const chat2Visible = frame >= 235 && frame < 300;

  // --- Typewriter for chat ---
  const chat1Text = "Změň nadpis na 'Nejlepší restaurace v Praze'";
  const chat1Progress = Math.min(
    Math.floor((frame - 90) / 1.2),
    chat1Text.length
  );
  const chat1Display = frame >= 90 ? chat1Text.slice(0, Math.max(0, chat1Progress)) : "";

  const chat2Text = "Změň barvu pozadí na teplou zlatou";
  const chat2Progress = Math.min(
    Math.floor((frame - 240) / 1.2),
    chat2Text.length
  );
  const chat2Display = frame >= 240 ? chat2Text.slice(0, Math.max(0, chat2Progress)) : "";

  // --- Success badge ---
  const successVisible = frame >= 310;
  const successSpring = spring({
    frame: Math.max(0, frame - 310),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const successScale = interpolate(successSpring, [0, 1], [0.5, 1]);
  const successOpacity = interpolate(successSpring, [0, 1], [0, 1]);

  // --- Heading glow on change ---
  const headingGlow = interpolate(frame, [155, 170, 195], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Color change glow ---
  const colorGlow = interpolate(frame, [260, 280, 305], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <GradientBackground colors={["#0a2540", "#0c1445", "#1a0533"]} />
      <FloatingOrbs count={5} color="52, 211, 153" />
      <GridOverlay />
      <NoiseOverlay />

      <AbsoluteFill style={{ padding: "44px 64px", display: "flex", flexDirection: "column" }}>
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            marginBottom: 28,
          }}
        >
          <GlassCard
            intensity="light"
            style={{
              display: "inline-flex",
              padding: "5px 16px",
              borderRadius: 30,
              marginBottom: 14,
              border: "1px solid rgba(52,211,153,0.25)",
              background: "rgba(52,211,153,0.08)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#6ee7b7",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 3,
              }}
            >
              AI Editor
            </span>
          </GlassCard>

          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Upravte web{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #34d399, #2dd4bf)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              sami
            </span>
            {" — "}bez programátora
          </div>
        </div>

        {/* Main content: Editor mockup */}
        <Sequence from={10} layout="none">
          <div style={{ display: "flex", gap: 28, flex: 1 }}>
            {/* Left: Website editor preview */}
            <GlassCard
              intensity="medium"
              style={{
                flex: 1.4,
                overflow: "hidden",
                position: "relative",
                borderRadius: 18,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Editor toolbar */}
              <div
                style={{
                  height: 40,
                  background: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 10px",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  🔒 webflipper.app/editor
                </div>
                {/* Edit mode indicator */}
                <div
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: "rgba(52,211,153,0.15)",
                    border: "1px solid rgba(52,211,153,0.3)",
                    fontSize: 10,
                    color: "#6ee7b7",
                    fontWeight: 700,
                  }}
                >
                  ✏️ EDIT MODE
                </div>
              </div>

              {/* Mock website content */}
              <div style={{ flex: 1, position: "relative" }}>
                {/* Hero section */}
                <div
                  style={{
                    background: heroColor,
                    padding: "32px 36px",
                    position: "relative",
                    boxShadow: colorGlow > 0
                      ? `inset 0 0 40px rgba(217,119,6,${colorGlow * 0.3})`
                      : "none",
                  }}
                >
                  {/* Heading — editable */}
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: "#ffffff",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: headingSelected
                        ? "2px solid rgba(52,211,153,0.6)"
                        : "2px solid transparent",
                      background: headingSelected
                        ? "rgba(52,211,153,0.08)"
                        : "transparent",
                      position: "relative",
                      boxShadow: headingGlow > 0
                        ? `0 0 20px rgba(52,211,153,${headingGlow * 0.4})`
                        : "none",
                    }}
                  >
                    {displayHeading}
                    {headingGlow > 0.3 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -2,
                          background: "#22c55e",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        ✓ Změněno
                      </div>
                    )}
                  </div>

                  {/* Subtitle */}
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.7)",
                      marginTop: 10,
                      paddingLeft: 12,
                    }}
                  >
                    Tradiční česká kuchyně v srdci města
                  </div>

                  {/* CTA button */}
                  <div
                    style={{
                      marginTop: 16,
                      marginLeft: 12,
                      display: "inline-flex",
                      padding: "8px 22px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.2)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Rezervovat stůl →
                  </div>
                </div>

                {/* Content below hero */}
                <div style={{ padding: "24px 36px" }}>
                  {/* Section heading */}
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.8)",
                      marginBottom: 14,
                    }}
                  >
                    Naše speciality
                  </div>

                  {/* Food cards grid */}
                  <div style={{ display: "flex", gap: 14 }}>
                    {["Svíčková", "Guláš", "Trdelník"].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div
                          style={{
                            height: 60,
                            background: `linear-gradient(135deg, rgba(${100 + i * 40},${80 + i * 20},${60 + i * 30},0.3), rgba(${80 + i * 30},${60 + i * 20},${40 + i * 20},0.2))`,
                          }}
                        />
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                            {item}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                            od {189 + i * 40} Kč
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Chat bubble — floats over the editor */}
                {chat1Visible && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 16,
                      width: 320,
                    }}
                  >
                    <GlassCard
                      intensity="strong"
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: "1px solid rgba(52,211,153,0.3)",
                        background: "rgba(10,37,64,0.9)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "linear-gradient(135deg, #818cf8, #6366f1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: "#fff",
                            fontWeight: 900,
                          }}
                        >
                          W
                        </div>
                        <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700 }}>
                          AI Asistent
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.5 }}>
                        {chat1Display}
                        {chat1Progress < chat1Text.length && (
                          <span style={{ color: "#6ee7b7", opacity: frame % 16 < 10 ? 1 : 0 }}>|</span>
                        )}
                      </div>
                      {chat1Progress >= chat1Text.length && frame < 155 && (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              padding: "4px 14px",
                              borderRadius: 6,
                              background: "#22c55e",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            Potvrdit ✓
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  </div>
                )}

                {chat2Visible && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 16,
                      width: 310,
                    }}
                  >
                    <GlassCard
                      intensity="strong"
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: "1px solid rgba(52,211,153,0.3)",
                        background: "rgba(10,37,64,0.9)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "linear-gradient(135deg, #818cf8, #6366f1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: "#fff",
                            fontWeight: 900,
                          }}
                        >
                          W
                        </div>
                        <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700 }}>
                          AI Asistent
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: "#ffffff", lineHeight: 1.5 }}>
                        {chat2Display}
                        {chat2Progress < chat2Text.length && (
                          <span style={{ color: "#6ee7b7", opacity: frame % 16 < 10 ? 1 : 0 }}>|</span>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Success overlay */}
                {successVisible && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 16,
                      left: "50%",
                      transform: `translateX(-50%) scale(${successScale})`,
                      opacity: successOpacity,
                    }}
                  >
                    <GlassCard
                      intensity="strong"
                      style={{
                        padding: "10px 24px",
                        borderRadius: 30,
                        border: "1px solid rgba(52,211,153,0.4)",
                        background: "rgba(52,211,153,0.15)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 16 }}>✨</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#6ee7b7" }}>
                        2 úpravy provedeny za 8 sekund
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Cursor */}
                {frame > 30 && frame < 350 && (
                  <>
                    {clickActive && (
                      <div
                        style={{
                          position: "absolute",
                          left: cursorX - 14,
                          top: cursorY - 14,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "2px solid rgba(52,211,153,0.5)",
                          transform: `scale(${clickScale})`,
                          opacity: 2 - clickScale,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        left: cursorX,
                        top: cursorY,
                        width: 0,
                        height: 0,
                        borderLeft: "12px solid #ffffff",
                        borderTop: "8px solid transparent",
                        borderBottom: "8px solid transparent",
                        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
                        transform: "rotate(-30deg)",
                        pointerEvents: "none",
                        transition: "left 0.3s ease, top 0.3s ease",
                      }}
                    />
                  </>
                )}
              </div>
            </GlassCard>

            {/* Right: How it works steps */}
            <div
              style={{
                flex: 0.5,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 14,
              }}
            >
              {[
                {
                  num: "1",
                  label: "Klikněte na prvek",
                  desc: "Vyberte cokoliv na stránce",
                  active: frame >= 60 && frame < 170,
                },
                {
                  num: "2",
                  label: "Napište změnu",
                  desc: "Česky, přirozeně, jako člověku",
                  active: frame >= 85 && frame < 260,
                },
                {
                  num: "3",
                  label: "AI to změní",
                  desc: "Text, barvy, obrázky — za sekundy",
                  active: frame >= 155,
                },
              ].map((step, i) => {
                const stepSpring = spring({
                  frame: frame - 20,
                  fps,
                  delay: i * 12,
                  config: { damping: 14 },
                });
                const sOpacity = interpolate(stepSpring, [0, 1], [0, 1]);
                const sX = interpolate(stepSpring, [0, 1], [20, 0]);

                return (
                  <GlassCard
                    key={i}
                    intensity={step.active ? "medium" : "light"}
                    style={{
                      opacity: sOpacity,
                      transform: `translateX(${sX}px)`,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      border: step.active
                        ? "1px solid rgba(52,211,153,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: step.active
                          ? "linear-gradient(135deg, #818cf8, #a78bfa)"
                          : "rgba(255,255,255,0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 900,
                        color: step.active ? "#ffffff" : "rgba(255,255,255,0.3)",
                        flexShrink: 0,
                        boxShadow: step.active ? "0 4px 12px rgba(129,140,248,0.3)" : "none",
                      }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: step.active ? "#6ee7b7" : "#ffffff",
                          marginBottom: 2,
                        }}
                      >
                        {step.label}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                        {step.desc}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
