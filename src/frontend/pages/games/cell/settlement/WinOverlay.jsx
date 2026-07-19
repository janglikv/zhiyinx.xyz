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
 * 构建三星 checklist 条目（通关 / 能量 / 限时）。
 * @param {object | null | undefined} endResult
 * @returns {Array<{ key: string, ok: boolean, label: string, detail: string, gap: string }>}
 */
function buildStarChecklist(endResult) {
  // 通关结算应始终带上 energyOk / timeOk；缺省按未达标，避免误亮
  const energyOk = endResult?.energyOk === true;
  const timeOk = endResult?.timeOk === true;

  const energyTarget =
    endResult?.energyTarget != null && Number.isFinite(endResult.energyTarget)
      ? Math.round(endResult.energyTarget)
      : null;
  const playerEnergy =
    endResult?.playerEnergy != null && Number.isFinite(endResult.playerEnergy)
      ? Math.round(endResult.playerEnergy)
      : null;
  const elapsedSec =
    endResult?.elapsedSec != null && Number.isFinite(endResult.elapsedSec)
      ? Math.round(endResult.elapsedSec)
      : null;
  const starTimeSec =
    endResult?.starTimeSec != null && Number.isFinite(endResult.starTimeSec)
      ? Math.round(endResult.starTimeSec)
      : null;

  /** @type {Array<{ key: string, ok: boolean, label: string, detail: string, gap: string }>} */
  const items = [
    {
      key: "clear",
      ok: true,
      label: "肃清对抗细胞",
      detail: "通关",
      gap: "",
    },
  ];

  {
    let detail = "结束时己方能量充足";
    let gap = "";
    if (energyTarget != null && playerEnergy != null) {
      detail = `能量 ${playerEnergy} / ${energyTarget}`;
      if (!energyOk) {
        const need = Math.max(0, energyTarget - playerEnergy);
        gap = need > 0 ? `还差 ${need}` : "未达标";
      }
    } else if (endResult?.energyOk != null) {
      detail = energyOk ? "能量充沛" : "能量不足";
      gap = energyOk ? "" : "未达标";
    }
    items.push({
      key: "energy",
      ok: energyOk,
      label: "保留足够能量",
      detail,
      gap,
    });
  }

  {
    let detail = "在限时内清场";
    let gap = "";
    if (starTimeSec != null && elapsedSec != null) {
      detail = `用时 ${elapsedSec}s / ${starTimeSec}s`;
      if (!timeOk) {
        const over = Math.max(0, elapsedSec - starTimeSec);
        gap = over > 0 ? `超时 ${over}s` : "超时";
      }
    } else if (endResult?.timeOk != null) {
      detail = timeOk ? "限时达成" : "超时未达星";
      gap = timeOk ? "" : "未达标";
    }
    items.push({
      key: "time",
      ok: timeOk,
      label: "限时清场",
      detail,
      gap,
    });
  }

  return items;
}

/**
 * 通关：烟花 + 顶部结算卡。
 * 约 4.5s 后结算卡淡出（鼠标悬停面板时推迟到离开），「下一关」由 PlayScene 做飞入工具栏动画。
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
 *     energyTarget?: number,
 *     playerEnergy?: number,
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
  /** 鼠标悬停结算卡时推迟折叠 */
  const panelHoverRef = useRef(false);
  /** 最短展示时间已到，可折叠（仍需不在 hover） */
  const compactReadyRef = useRef(false);
  const compactedRef = useRef(false);
  const onCompactChangeRef = useRef(onCompactChange);
  const sceneRefProp = useRef(sceneRef);
  onCompactChangeRef.current = onCompactChange;
  sceneRefProp.current = sceneRef;

  const runCompact = () => {
    if (compactedRef.current) return;
    if (!compactReadyRef.current) return;
    if (panelHoverRef.current) return;

    compactedRef.current = true;
    const btn = nextBtnRef.current;
    const root =
      sceneRefProp.current?.current ||
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
    onCompactChangeRef.current?.(true, { fromRect });
  };

  useEffect(() => {
    if (!active) {
      setCompact(false);
      setToastReady(false);
      setShowDim(false);
      setNextLifted(false);
      panelHoverRef.current = false;
      compactReadyRef.current = false;
      compactedRef.current = false;
      onCompactChangeRef.current?.(false);
      return undefined;
    }
    setToastReady(false);
    setCompact(false);
    setNextLifted(false);
    panelHoverRef.current = false;
    compactReadyRef.current = false;
    compactedRef.current = false;
    onCompactChangeRef.current?.(false);
    setShowDim(true);

    // 最短展示结束后尝试折叠；悬停中会等鼠标离开
    const compactTimer = window.setTimeout(() => {
      compactReadyRef.current = true;
      runCompact();
    }, 4500);

    const dimTimer = window.setTimeout(() => setShowDim(false), 7000);
    return () => {
      window.clearTimeout(compactTimer);
      window.clearTimeout(dimTimer);
    };
    // runCompact 使用 ref，不纳入 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fxKey/active 重置即可
  }, [active, fxKey]);

  const handlePanelEnter = () => {
    panelHoverRef.current = true;
  };

  const handlePanelLeave = () => {
    panelHoverRef.current = false;
    runCompact();
  };

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return startWinFireworks(canvas, { width: GAME_WIDTH, height: GAME_HEIGHT });
  }, [active, fxKey]);

  if (!active) return null;

  const stars = Math.min(3, Math.max(1, endResult?.stars ?? 1));
  const best = endResult?.bestStars ?? stars;
  const checklist = buildStarChecklist(endResult);

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
        <div
          className="cell-win-toast-panel__card"
          onMouseEnter={handlePanelEnter}
          onMouseLeave={handlePanelLeave}
        >
          <div className="cell-win-toast-panel__shine" />
          <div className="cell-win-toast-panel__main">
            <div className="cell-win-toast-panel__row">
              <div className="cell-win-toast-panel__badge" aria-hidden>
                ✓
              </div>
              <div className="cell-win-toast-panel__body">
                <div className="cell-win-toast-panel__title">挑战成功</div>
                <div className="cell-win-stars" aria-label={`${stars} 星`}>
                  {[1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={
                        i <= stars
                          ? "cell-win-star cell-win-star--on"
                          : "cell-win-star"
                      }
                      aria-hidden
                    >
                      ★
                    </span>
                  ))}
                  {best > stars && (
                    <span className="cell-win-star-meta cell-win-star-meta--inline">
                      历史 {best}★
                    </span>
                  )}
                </div>
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
            <ul className="cell-win-checklist" aria-label="三星条件">
              {checklist.map((item, idx) => (
                <li
                  key={item.key}
                  className={
                    item.ok
                      ? "cell-win-checklist__item cell-win-checklist__item--ok"
                      : "cell-win-checklist__item cell-win-checklist__item--miss"
                  }
                >
                  <span className="cell-win-checklist__star" aria-hidden>
                    ★
                  </span>
                  <span className="cell-win-checklist__text">
                    <span className="cell-win-checklist__label">
                      {idx + 1}★ {item.label}
                    </span>
                    <span className="cell-win-checklist__detail">
                      {item.detail}
                      {item.gap ? (
                        <span className="cell-win-checklist__gap">
                          {" "}
                          · {item.gap}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="cell-win-checklist__mark" aria-hidden>
                    {item.ok ? "✓" : "✗"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
