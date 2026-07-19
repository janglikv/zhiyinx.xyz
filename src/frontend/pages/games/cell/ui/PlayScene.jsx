import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { TutorialHud } from "../tutorial";
import { WinOverlay, LoseOverlay } from "../settlement";
import { uiSfx } from "../audio";
import BackButton from "./BackButton";
import StageTools from "./StageTools";
import BattleTimer from "./BattleTimer";

/**
 * 元素相对场景根的逻辑坐标（兼容父级 CSS scale）。
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
 * 对局场景：画布 + 工具 + 引导 + 胜负
 * @param {{
 *   containerRef: React.RefObject<HTMLElement | null>,
 *   stageRef: React.RefObject<HTMLElement | null>,
 *   revealed: boolean,
 *   gameKey: number,
 *   levelId: string | number,
 *   tutorialPhase: import("../tutorial/phases").TutorialPhase | null,
 *   gameState: string,
 *   winFxKey: number,
 *   nextLabel: string,
 *   battleHud?: { remainingSec: number, timeLimitSec: number, urgent: boolean } | null,
 *   endResult?: object | null,
 *   onBackToHub: () => void,
 *   onOpenSettings: () => void,
 *   onOpenDebug?: () => void,
 *   onSkipTutorial: () => void,
 *   onNext: () => void,
 *   onRestart: () => void,
 * }} props
 */
export default function PlayScene({
  containerRef,
  stageRef,
  revealed,
  gameKey,
  levelId,
  tutorialPhase,
  gameState,
  winFxKey,
  nextLabel,
  battleHud,
  endResult,
  onBackToHub,
  onOpenSettings,
  onOpenDebug,
  onSkipTutorial,
  onNext,
  onRestart,
}) {
  const sceneRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const dockRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  /** @type {React.MutableRefObject<{ left: number, top: number, width: number, height: number } | null>} */
  const fromRectRef = useRef(null);

  const [winCompact, setWinCompact] = useState(false);
  const [dockSettled, setDockSettled] = useState(false);
  /** 每次收起 +1，驱动一次 FLIP，避免 phase 更新取消 rAF */
  const [flyTicket, setFlyTicket] = useState(0);
  /**
   * @type {[null | {
   *   phase: "from" | "to",
   *   left: number,
   *   top: number,
   *   width: number,
   *   height: number,
   * }, Function]}
   */
  const [fly, setFly] = useState(null);

  const resetWinChrome = useCallback(() => {
    setWinCompact(false);
    setDockSettled(false);
    setFly(null);
    fromRectRef.current = null;
  }, []);

  const handleWinCompact = useCallback(
    (compact, meta) => {
      if (!compact) {
        resetWinChrome();
        return;
      }
      const from = meta?.fromRect;
      if (
        !from ||
        !Number.isFinite(from.left) ||
        !Number.isFinite(from.top) ||
        from.width <= 0 ||
        from.height <= 0
      ) {
        setWinCompact(true);
        setDockSettled(true);
        setFly(null);
        return;
      }
      fromRectRef.current = from;
      setDockSettled(false);
      setWinCompact(true);
      setFlyTicket((n) => n + 1);
    },
    [resetWinChrome],
  );

  // 一次 ticket：量终点 → 画在起点 → 下一帧飞到终点（cleanup 仅在 ticket/卸载时取消）
  useLayoutEffect(() => {
    if (!flyTicket || !winCompact) return undefined;
    const scene = sceneRef.current;
    const dock = dockRef.current;
    const from = fromRectRef.current;
    if (!scene || !dock || !from) {
      setDockSettled(true);
      setFly(null);
      return undefined;
    }

    const to = relativeRect(dock, scene);
    setFly({
      phase: "from",
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
    });

    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        setFly({
          phase: "to",
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [flyTicket, winCompact]);

  useLayoutEffect(() => {
    if (gameState !== "win") resetWinChrome();
  }, [gameState, gameKey, resetWinChrome]);

  const showDockSlot = gameState === "win" && winCompact;

  function handleFlyEnd(e) {
    // 只认位移结束，避免 width 等多次触发
    if (e.propertyName !== "left" && e.propertyName !== "top") return;
    setDockSettled(true);
    setFly(null);
  }

  return (
    <div
      ref={sceneRef}
      className={[
        "cell-scene",
        "cell-scene--play",
        revealed ? "cell-scene--revealed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div ref={containerRef} className="cell-stage__canvas-host" />
      <BackButton onClick={onBackToHub} />
      <BattleTimer
        remainingSec={battleHud?.remainingSec ?? null}
        timeLimitSec={battleHud?.timeLimitSec}
        urgent={Boolean(battleHud?.urgent)}
        hidden={gameState !== "playing"}
      />
      <div className="cell-play-tools">
        {showDockSlot && (
          <button
            ref={dockRef}
            type="button"
            className="cell-win-next cell-win-next--dock"
            style={{
              opacity: dockSettled ? 1 : 0,
              pointerEvents: dockSettled ? "auto" : "none",
            }}
            tabIndex={dockSettled ? 0 : -1}
            aria-hidden={!dockSettled}
            {...uiSfx("confirm", () => onNext?.())}
          >
            {nextLabel}
          </button>
        )}
        <StageTools
          stageRef={stageRef}
          onOpenSettings={onOpenSettings}
          onOpenDebug={onOpenDebug}
        />
      </div>

      {fly && (
        <button
          type="button"
          className={[
            "cell-win-next",
            "cell-win-next--fly",
            fly.phase === "to" ? "cell-win-next--fly-dock" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            left: fly.left,
            top: fly.top,
            width: fly.width,
            height: fly.height,
            transition:
              fly.phase === "to"
                ? "left 0.75s cubic-bezier(0.22, 1, 0.36, 1), top 0.75s cubic-bezier(0.22, 1, 0.36, 1), width 0.75s cubic-bezier(0.22, 1, 0.36, 1), height 0.75s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.75s ease, padding 0.75s ease, box-shadow 0.55s ease"
                : "none",
          }}
          onTransitionEnd={handleFlyEnd}
          {...uiSfx("confirm", () => onNext?.())}
        >
          {nextLabel}
        </button>
      )}

      <TutorialHud
        key={`${gameKey}-${levelId}`}
        phase={tutorialPhase}
        onSkip={onSkipTutorial}
      />
      <WinOverlay
        active={gameState === "win"}
        fxKey={winFxKey}
        nextLabel={nextLabel}
        onNext={onNext}
        onRestart={onRestart}
        onBackToHub={onBackToHub}
        sceneRef={sceneRef}
        onCompactChange={handleWinCompact}
        endResult={endResult}
      />
      {gameState === "lose" && (
        <LoseOverlay
          onRestart={onRestart}
          onBackToHub={onBackToHub}
          reason={endResult?.reason}
        />
      )}
    </div>
  );
}
