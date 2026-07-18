import { useEffect, useRef, useState } from "react";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { playUi, onUiHover } from "../audio";
import { startWinFireworks } from "./fireworks";

/**
 * 通关：烟花 + 顶部提示（3s 后收成右上「下一关」）
 * @param {{
 *   active: boolean,
 *   fxKey?: number,
 *   nextLabel: string,
 *   onNext: () => void,
 *   onBackToHub?: () => void,
 * }} props
 */
export default function WinOverlay({ active, fxKey = 0, nextLabel, onNext, onBackToHub }) {
  const canvasRef = useRef(null);
  const [compact, setCompact] = useState(false);
  const [toastReady, setToastReady] = useState(false);
  const [showDim, setShowDim] = useState(false);

  useEffect(() => {
    if (!active) {
      setCompact(false);
      setToastReady(false);
      setShowDim(false);
      return undefined;
    }
    setToastReady(false);
    setCompact(false);
    setShowDim(true);
    const compactTimer = window.setTimeout(() => setCompact(true), 3000);
    const dimTimer = window.setTimeout(() => setShowDim(false), 5500);
    return () => {
      window.clearTimeout(compactTimer);
      window.clearTimeout(dimTimer);
    };
  }, [active, fxKey]);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return startWinFireworks(canvas, { width: GAME_WIDTH, height: GAME_HEIGHT });
  }, [active, fxKey]);

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          borderRadius: "20px",
          pointerEvents: "none",
          zIndex: 6,
        }}
      />
      {/* 氛围变暗背景：凸显烟花效果，并在 5.5 秒后（烟花完全消失）顺滑淡出 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          borderRadius: "20px",
          backgroundColor: "rgba(4, 10, 6, 0.72)",
          pointerEvents: "none",
          zIndex: 5,
          opacity: showDim ? 1 : 0,
          transition: "opacity 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 9,
          pointerEvents: "none",
          top: compact ? "12px" : "18px",
          left: compact ? "calc(100% - 108px)" : "50%",
          transform: compact ? "translateX(-100%)" : "translateX(-50%)",
          width: compact ? "auto" : "min(360px, calc(100% - 32px))",
          maxWidth: compact ? "120px" : "min(360px, calc(100% - 32px))",
          transition: toastReady
            ? "top 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), width 0.9s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
          animation: toastReady
            ? "none"
            : "winToastIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setToastReady(true);
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: compact ? "11px" : "16px",
            border: compact
              ? "1px solid transparent"
              : "1px solid rgba(255,255,255,0.1)",
            background: compact
              ? "transparent"
              : "linear-gradient(165deg, rgba(18, 32, 24, 0.88) 0%, rgba(8, 14, 12, 0.9) 100%)",
            backdropFilter: compact ? "none" : "blur(18px) saturate(1.25)",
            WebkitBackdropFilter: compact ? "none" : "blur(18px) saturate(1.25)",
            boxShadow: compact
              ? "none"
              : "0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(84, 201, 43, 0.08), 0 0 48px rgba(84, 201, 43, 0.1)",
            transition:
              "border-radius 0.85s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.55s ease, background 0.55s ease, box-shadow 0.55s ease",
          }}
        >
          <div
            style={{
              height: compact ? 0 : "1px",
              opacity: compact ? 0 : 1,
              background:
                "linear-gradient(90deg, transparent, rgba(122, 224, 74, 0.75), rgba(255,213,74,0.5), transparent)",
              transition: "height 0.5s ease, opacity 0.4s ease",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: compact ? 0 : "14px",
              padding: compact ? "0" : "14px 14px 14px 16px",
              transition:
                "gap 0.7s cubic-bezier(0.22, 1, 0.36, 1), padding 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: compact ? 0 : "44px",
                height: compact ? 0 : "44px",
                opacity: compact ? 0 : 1,
                marginRight: compact ? 0 : undefined,
                overflow: "hidden",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(145deg, rgba(84, 201, 43, 0.28), rgba(60, 160, 26, 0.1))",
                border: compact ? "none" : "1px solid rgba(122, 224, 74, 0.4)",
                boxShadow: compact
                  ? "none"
                  : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 18px rgba(84, 201, 43, 0.2)",
                fontSize: "20px",
                fontWeight: "800",
                lineHeight: 1,
                color: "#9af05a",
                textShadow: "0 0 12px rgba(84, 201, 43, 0.55)",
                transition:
                  "width 0.7s cubic-bezier(0.22, 1, 0.36, 1), height 0.7s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease, border 0.4s ease",
              }}
            >
              ✓
            </div>
            <div
              style={{
                flex: compact ? "0 0 0" : "1 1 auto",
                minWidth: 0,
                maxWidth: compact ? 0 : "220px",
                opacity: compact ? 0 : 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition:
                  "max-width 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease, flex 0.75s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  letterSpacing: "0.04em",
                  fontFamily: "var(--font-title)",
                  background: "linear-gradient(105deg, #e8ffe0 0%, #7ae04a 45%, #c8f06a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.2,
                }}
              >
                挑战成功
              </div>
              <div
                style={{
                  marginTop: "4px",
                  color: "rgba(180, 200, 175, 0.72)",
                  fontSize: "12px",
                  lineHeight: 1.35,
                  fontWeight: "500",
                }}
              >
                对抗细胞已肃清
              </div>
            </div>
            <div
              style={{
                pointerEvents: "auto",
                flexShrink: 0,
                display: "flex",
                gap: compact ? "6px" : "8px",
                alignItems: "center",
              }}
            >
              {onBackToHub && !compact && (
                <button
                  type="button"
                  onMouseEnter={onUiHover}
                  onClick={() => {
                    playUi("back");
                    onBackToHub();
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "11px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    color: "rgba(230, 240, 225, 0.9)",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  选关
                </button>
              )}
              <button
                type="button"
                onMouseEnter={onUiHover}
                onClick={() => {
                  playUi("confirm");
                  onNext?.();
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "11px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "700",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  color: "#0a140c",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #9af05a 0%, #54c92b 48%, #3ca01a 100%)",
                  boxShadow:
                    "0 2px 0 rgba(30, 90, 20, 0.45), 0 6px 16px rgba(84, 201, 43, 0.35)",
                  transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
