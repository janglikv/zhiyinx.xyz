import { useEffect, useRef, useState } from "react";
import { playUi, onUiHover } from "../audio";
import { TUTORIAL_COPY } from "./phases";

/**
 * 引导 UI：内部管理入场/退场动画，只吃逻辑 phase
 * @param {{
 *   phase: import("./phases").TutorialPhase | null,
 *   onSkip: () => void,
 * }} props
 */
export default function TutorialHud({ phase, onSkip }) {
  /** @type {[import("./phases").TutorialPhase | null, Function]} */
  const [displayPhase, setDisplayPhase] = useState(null);
  /** @type {['hidden' | 'in' | 'shown' | 'out', Function]} */
  const [anim, setAnim] = useState("hidden");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (phase) {
      if (!displayPhase && anim === "hidden") {
        const timer = window.setTimeout(() => {
          if (!phaseRef.current) return;
          setDisplayPhase(phaseRef.current);
          setAnim("in");
        }, 1000);
        return () => window.clearTimeout(timer);
      }
      if (displayPhase && phase !== displayPhase && anim !== "out") {
        setAnim("out");
      }
      return undefined;
    }
    if (displayPhase && anim !== "out" && anim !== "hidden") {
      setAnim("out");
    }
    return undefined;
  }, [phase, displayPhase, anim]);

  function handleAnimEnd(event) {
    if (event.target !== event.currentTarget) return;
    if (anim === "out") {
      const next = phaseRef.current;
      if (next) {
        setDisplayPhase(next);
        setAnim("in");
      } else {
        setDisplayPhase(null);
        setAnim("hidden");
      }
    } else if (anim === "in") {
      setAnim("shown");
    }
  }

  const copy = displayPhase ? TUTORIAL_COPY[displayPhase] : null;
  if (!copy || anim === "hidden") return null;

  const done = displayPhase === "done";
  const motion =
    anim === "in"
      ? "tutorialBounceIn 1.05s cubic-bezier(0.22, 1, 0.36, 1) both"
      : anim === "out"
        ? "tutorialBounceOut 0.85s cubic-bezier(0.4, 0, 0.2, 1) both"
        : "none";

  return (
    <div
      key={`${anim}-${displayPhase}`}
      onAnimationEnd={handleAnimEnd}
      style={{
        position: "absolute",
        bottom: "22px",
        left: "50%",
        width: "min(480px, calc(100% - 32px))",
        zIndex: 5,
        pointerEvents: "none",
        transform: "translateX(-50%)",
        transformOrigin: "50% 100%",
        animation: motion,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          border: done
            ? "1px solid rgba(84, 201, 43, 0.45)"
            : "1px solid rgba(84, 201, 43, 0.22)",
          background: done
            ? "linear-gradient(135deg, rgba(12, 36, 18, 0.92) 0%, rgba(8, 18, 14, 0.94) 100%)"
            : "linear-gradient(135deg, rgba(12, 18, 28, 0.92) 0%, rgba(8, 12, 22, 0.94) 55%, rgba(10, 20, 16, 0.92) 100%)",
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
          animation:
            anim === "shown"
              ? done
                ? "tutorialDoneGlow 6s ease-in-out infinite"
                : "tutorialGlow 7s ease-in-out infinite"
              : "none",
        }}
      >
        <div
          style={{
            height: "2px",
            width: "100%",
            background: "rgba(84, 201, 43, 0.08)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: done
                ? "100%"
                : `${((copy.index + 1) / copy.total) * 100}%`,
              background: "linear-gradient(90deg, rgba(84, 201, 43, 0.35), #54c92b)",
              boxShadow: "0 0 10px rgba(84, 201, 43, 0.55)",
              transition: "width 0.75s ease",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 14px 14px 16px",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: done
                ? "linear-gradient(145deg, rgba(84, 201, 43, 0.35), rgba(60, 160, 26, 0.2))"
                : "linear-gradient(145deg, rgba(84, 201, 43, 0.18), rgba(84, 201, 43, 0.06))",
              border: "1px solid rgba(84, 201, 43, 0.35)",
              boxShadow: done
                ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 16px rgba(84, 201, 43, 0.25)"
                : "inset 0 1px 0 rgba(255,255,255,0.06)",
              color: "#7ae04a",
              fontSize: done ? "18px" : "13px",
              fontWeight: "700",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {done ? "✓" : `${copy.index + 1}/${copy.total}`}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: done ? "#7ae04a" : "rgba(122, 224, 74, 0.75)",
                }}
              >
                {done ? "完成" : "引导"}
              </span>
              {!done && (
                <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                  {Array.from({ length: copy.total }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        width: i === copy.index ? "14px" : "5px",
                        height: "5px",
                        borderRadius: "999px",
                        background:
                          i <= copy.index ? "#54c92b" : "rgba(84, 201, 43, 0.2)",
                        boxShadow:
                          i === copy.index
                            ? "0 0 8px rgba(84, 201, 43, 0.65)"
                            : "none",
                        transition: "all 0.55s ease",
                      }}
                    />
                  ))}
                </span>
              )}
            </div>

            <div
              style={{
                color: "#f4f8f2",
                fontSize: "14.5px",
                fontWeight: "600",
                lineHeight: 1.4,
                letterSpacing: "0.01em",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              {copy.title}
            </div>
            {copy.hint && (
              <div
                style={{
                  marginTop: "3px",
                  color: "rgba(186, 205, 180, 0.78)",
                  fontSize: "12px",
                  lineHeight: 1.4,
                }}
              >
                {copy.hint}
              </div>
            )}
          </div>

          {!done && (
            <button
              type="button"
              onClick={() => {
                playUi("tap");
                onSkip?.();
              }}
              style={{
                flexShrink: 0,
                pointerEvents: "auto",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(200, 210, 200, 0.72)",
                fontSize: "12px",
                fontWeight: "500",
                padding: "7px 12px",
                cursor: "pointer",
                borderRadius: "10px",
                transition:
                  "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                onUiHover(e);
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(230, 240, 230, 0.92)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "rgba(200, 210, 200, 0.72)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              跳过
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
