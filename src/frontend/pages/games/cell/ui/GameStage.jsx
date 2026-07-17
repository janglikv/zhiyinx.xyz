import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

/**
 * 是否处于「真全屏」或「伪全屏（沉浸）」模式。
 * @param {HTMLElement | null} el
 */
function isStageExpanded(el) {
  if (!el) return false;
  if (el.classList.contains("cell-stage--immersive")) return true;
  const fs =
    document.fullscreenElement ||
    /** @type {Document & { webkitFullscreenElement?: Element | null }} */ (document)
      .webkitFullscreenElement;
  return fs === el;
}

/**
 * 游戏主画面外框：与网站 layout 明确分离的「游戏区域」。
 * 选关 / 对局共用同一逻辑画布尺寸（GAME_WIDTH × GAME_HEIGHT），
 * 在窄屏上整体等比缩小以完整显示；全屏/沉浸时按视口 contain 放大。
 * @param {{
 *   children: import("react").ReactNode,
 *   label?: string,
 *   stageRef?: React.Ref<HTMLDivElement | null>,
 * }} props
 */
export default function GameStage({ children, label = "游戏区域", stageRef }) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const localStageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [scale, setScale] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const setStageNode = useCallback(
    (node) => {
      localStageRef.current = node;
      if (typeof stageRef === "function") {
        stageRef(node);
      } else if (stageRef) {
        stageRef.current = node;
      }
    },
    [stageRef],
  );

  const recompute = useCallback(() => {
    const stage = localStageRef.current;
    const wrap = wrapRef.current;
    const isExp = isStageExpanded(stage);
    setExpanded(isExp);

    if (isExp) {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const s = Math.min(vw / GAME_WIDTH, vh / GAME_HEIGHT);
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
      if (stage) {
        stage.style.setProperty("--cell-display-scale", String(s));
      }
      return;
    }

    const availW = wrap?.clientWidth || GAME_WIDTH;
    const s = Math.min(1, availW / GAME_WIDTH);
    setScale(Number.isFinite(s) && s > 0 ? s : 1);
    if (stage) {
      stage.style.setProperty("--cell-display-scale", String(s));
    }
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = localStageRef.current;
    recompute();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => recompute()) : null;
    if (wrap && ro) ro.observe(wrap);
    if (stage && ro) ro.observe(stage);

    const onWin = () => recompute();
    window.addEventListener("resize", onWin);
    window.addEventListener("orientationchange", onWin);
    window.visualViewport?.addEventListener("resize", onWin);
    document.addEventListener("fullscreenchange", onWin);
    document.addEventListener("webkitfullscreenchange", onWin);

    // 伪全屏 class 变化（FullscreenButton 写入）
    const mo =
      stage && typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => recompute())
        : null;
    if (stage && mo) {
      mo.observe(stage, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("orientationchange", onWin);
      window.visualViewport?.removeEventListener("resize", onWin);
      document.removeEventListener("fullscreenchange", onWin);
      document.removeEventListener("webkitfullscreenchange", onWin);
    };
  }, [recompute]);

  const frameW = expanded ? undefined : GAME_WIDTH * scale;
  const frameH = expanded ? undefined : GAME_HEIGHT * scale;

  return (
    <div
      className="cell-stage-wrap"
      ref={wrapRef}
      style={{
        ["--cell-stage-w"]: `${GAME_WIDTH}px`,
        ["--cell-stage-h"]: `${GAME_HEIGHT}px`,
        ["--cell-display-scale"]: String(scale),
        width: "100%",
        maxWidth: GAME_WIDTH,
      }}
    >
      <div className="cell-stage-label">
        <span className="cell-stage-label__dot" aria-hidden />
        <span className="cell-stage-label__text">{label}</span>
        <span className="cell-stage-label__size">
          {GAME_WIDTH}×{GAME_HEIGHT}
          {scale < 0.999 ? ` · ${Math.round(scale * 100)}%` : ""}
        </span>
      </div>
      <div
        className="cell-stage-frame"
        style={
          expanded
            ? undefined
            : {
                width: frameW,
                height: frameH,
              }
        }
      >
        <div
          className="cell-stage"
          ref={setStageNode}
          style={
            expanded
              ? {
                  ["--cell-display-scale"]: String(scale),
                }
              : {
                  width: GAME_WIDTH,
                  height: GAME_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
