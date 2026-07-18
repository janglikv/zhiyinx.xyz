import { useEffect, useRef, useState } from "react";

/** 全黑后略停，等 Pixi 挂上再淡入 */
const HOLD_BLACK_MS = 600;

/**
 * hub ↔ play 黑场转场
 * @param {{
 *   onApplyPlay: (levelIndex: number | null) => void,
 *   onApplyHub: () => void,
 *   onHoldEnd?: () => void,
 * }} opts
 */
export function useScreenTransition({ onApplyPlay, onApplyHub, onHoldEnd }) {
  /** @type {["idle" | "out" | "hold" | "in", Function]} */
  const [fadePhase, setFadePhase] = useState("idle");
  /** @type {React.MutableRefObject<"hub" | "play" | null>} */
  const pendingScreenRef = useRef(null);
  /** @type {React.MutableRefObject<number | null>} */
  const pendingLevelRef = useRef(null);
  const holdTimerRef = useRef(0);

  // 回调放 ref，避免 veil 回调闭包陈旧，且不必把函数放进 deps
  const onApplyPlayRef = useRef(onApplyPlay);
  const onApplyHubRef = useRef(onApplyHub);
  const onHoldEndRef = useRef(onHoldEnd);
  onApplyPlayRef.current = onApplyPlay;
  onApplyHubRef.current = onApplyHub;
  onHoldEndRef.current = onHoldEnd;

  const transitioning = fadePhase !== "idle";

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    };
  }, []);

  function beginTransition(nextScreen, levelIndex = null) {
    if (fadePhase !== "idle") return;
    pendingScreenRef.current = nextScreen;
    pendingLevelRef.current = levelIndex;
    setFadePhase("out");
  }

  function applyPendingScreen() {
    const next = pendingScreenRef.current;
    const lvl = pendingLevelRef.current;
    pendingScreenRef.current = null;
    pendingLevelRef.current = null;

    if (next === "play") {
      onApplyPlayRef.current(typeof lvl === "number" ? lvl : null);
    } else if (next === "hub") {
      onApplyHubRef.current();
    }
    return next;
  }

  function handleVeilCovered() {
    // 黑场到位：只切画面；BGM 由 screen 的 effect 同步
    applyPendingScreen();
    setFadePhase("hold");
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      onHoldEndRef.current?.();
      setFadePhase("in");
    }, HOLD_BLACK_MS);
  }

  function handleVeilRevealed() {
    setFadePhase("idle");
  }

  return {
    fadePhase,
    transitioning,
    beginTransition,
    handleVeilCovered,
    handleVeilRevealed,
  };
}
