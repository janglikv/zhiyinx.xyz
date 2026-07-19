import { useEffect, useRef, useState } from "react";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { uiSfx } from "../audio";
import { startWinFireworks } from "./fireworks";

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} root
 */
function relativeRect(el, root) {
  const er = el.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const scaleX = rr.width / (root.offsetWidth || 1) || 1;
  const scaleY = rr.height / (root.offsetHeight || 1) || 1;
  return {
    left: (er.left - rr.left) / scaleX,
    top: (er.top - rr.top) / scaleY,
    width: er.width / scaleX,
    height: er.height / scaleY,
  };
}

/**
 * 通关：烟花 + 顶部结算卡。
 * 约 3s 后结算卡淡出，「下一关」由 PlayScene 做飞入工具栏（设置左侧）动画。
 * @param {{
 *   active: boolean,
 *   fxKey?: number,
 *   nextLabel: string,
 *   onNext: () => void,
 *   onBackToHub?: () => void,
 *   sceneRef?: React.RefObject<HTMLElement | null>,
 *   onCompactChange?: (compact: boolean, meta?: { fromRect?: object }) => void,
 *   endResult?: {
 *     stars?: number,
 *     bestStars?: number,
 *     energyOk?: boolean,
 *     timeOk?: boolean,
 *     elapsedSec?: number,
 *     starTimeSec?: number,
 *   } | null,
 * }} props
 */
export default function WinOverlay({
  active,
  fxKey = 0,
  nextLabel,
  onNext,
  onBackToHub,
  sceneRef,
  onCompactChange,
  endResult = null,
}) {
  const canvasRef = useRef(null);
  const nextBtnRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const [compact, setCompact] = useState(false);
  const [toastReady, setToastReady] = useState(false);
  const [showDim, setShowDim] = useState(false);
  /** 飞走后隐藏结算卡内的下一关，避免叠影 */
  const [nextLifted, setNextLifted] = useState(false);

  useEffect(() => {
    if (!active) {
      setCompact(false);
      setToastReady(false);
      setShowDim(false);
      setNextLifted(false);
      onCompactChange?.(false);
      return undefined;
    }
    setToastReady(false);
    setCompact(false);
    setNextLifted(false);
    onCompactChange?.(false);
    setShowDim(true);

    const compactTimer = window.setTimeout(() => {
      const btn = nextBtnRef.current;
      const root =
        sceneRef?.current ||
        /** @type {HTMLElement | null} */ (btn?.closest(".cell-scene"));
      let fromRect;
      if (btn && root) {
        try {
          fromRect = relativeRect(btn, root);
        } catch {
          fromRect = undefined;
        }
      }
      setNextLifted(true);
      setCompact(true);
      onCompactChange?.(true, { fromRect });
    }, 3000);

    const dimTimer = window.setTimeout(() => setShowDim(false), 5500);
    return () => {
      window.clearTimeout(compactTimer);
      window.clearTimeout(dimTimer);
    };
  }, [active, fxKey, onCompactChange, sceneRef]);

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return startWinFireworks(canvas, { width: GAME_WIDTH, height: GAME_HEIGHT });
  }, [active, fxKey]);

  if (!active) return null;

  const stars = Math.min(3, Math.max(1, endResult?.stars ?? 1));
  const best = endResult?.bestStars ?? stars;
  const bits = [];
  if (endResult?.energyOk != null) {
    bits.push(endResult.energyOk ? "能量充沛" : "能量不足");
  }
  if (endResult?.timeOk != null) {
    bits.push(endResult.timeOk ? "限时达成" : "超时未达星");
  }
  if (endResult?.elapsedSec != null) {
    bits.push(`${Math.round(endResult.elapsedSec)}s`);
  }

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
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          borderRadius: "20px",
          backgroundColor: "rgba(4, 10, 6, 0.55)",
          pointerEvents: "none",
          zIndex: 5,
          opacity: showDim ? 1 : 0,
          transition: "opacity 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        className={[
          "cell-win-toast-panel",
          compact ? "cell-win-toast-panel--compact" : "",
          toastReady ? "cell-win-toast-panel--ready" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !compact) setToastReady(true);
        }}
        aria-hidden={compact}
      >
        <div className="cell-win-toast-panel__card">
          <div className="cell-win-toast-panel__shine" />
          <div className="cell-win-toast-panel__row">
            <div className="cell-win-toast-panel__badge" aria-hidden>
              ✓
            </div>
            <div className="cell-win-toast-panel__body">
              <div className="cell-win-toast-panel__title">挑战成功</div>
              <div className="cell-win-toast-panel__sub">对抗细胞已肃清</div>
              <div className="cell-win-stars" aria-label={`${stars} 星`}>
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={
                      i <= stars ? "cell-win-star cell-win-star--on" : "cell-win-star"
                    }
                    aria-hidden
                  >
                    ★
                  </span>
                ))}
                {best > stars && (
                  <span className="cell-win-star-meta">历史 {best}★</span>
                )}
              </div>
              {bits.length > 0 && (
                <div className="cell-win-star-meta">{bits.join(" · ")}</div>
              )}
            </div>
            <div className="cell-win-toast-panel__actions">
              {onBackToHub && (
                <button
                  type="button"
                  className="cell-win-btn-ghost"
                  {...uiSfx("back", onBackToHub)}
                >
                  选关
                </button>
              )}
              <button
                ref={nextBtnRef}
                type="button"
                className="cell-win-next"
                style={
                  nextLifted
                    ? { opacity: 0, pointerEvents: "none" }
                    : undefined
                }
                tabIndex={nextLifted ? -1 : 0}
                aria-hidden={nextLifted}
                {...uiSfx("confirm", () => onNext?.())}
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
