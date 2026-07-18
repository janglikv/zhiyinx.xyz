import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../../../components/GameLayout";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";
import { LEVELS } from "./levels";
import { mountCellGame } from "./mount";
import {
  LevelSelect,
  getClearedIndices,
  getMaxUnlockedIndex,
  getRecommendedLevelIndex,
  isLevelUnlocked,
  markLevelCleared,
  setLastLevelIndex,
} from "./hub";
import { TUTORIAL_START_PHASE, TutorialHud } from "./tutorial";
import { WinOverlay, LoseOverlay } from "./settlement";
import GameFooter from "./ui/GameFooter";
import GameStage from "./ui/GameStage";
import BackButton from "./ui/BackButton";
import SettingsButton from "./ui/SettingsButton";
import SettingsModal from "./ui/SettingsModal";
import FullscreenButton from "./ui/FullscreenButton";
import FadeVeil from "./ui/FadeVeil";
import { setBgmScene, stopBgm, unlockCellAudio, uiSfx } from "./audio";
import "./styles.css";

/** 全黑后略停，等 Pixi 挂上再淡入 */
const HOLD_BLACK_MS = 600;

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const gameApiRef = useRef(null);
  /** @type {React.MutableRefObject<"hub" | "play" | null>} */
  const pendingScreenRef = useRef(null);
  /** @type {React.MutableRefObject<number | null>} */
  const pendingLevelRef = useRef(null);
  const holdTimerRef = useRef(0);

  /** @type {["hub" | "play", Function]} */
  const [screen, setScreen] = useState("hub");
  /** @type {["idle" | "out" | "hold" | "in", Function]} */
  const [fadePhase, setFadePhase] = useState("idle");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => getRecommendedLevelIndex());
  const [gameState, setGameState] = useState("playing");
  const [gameKey, setGameKey] = useState(0);
  /** @type {[import("./tutorial/phases").TutorialPhase | null, Function]} */
  const [tutorialPhase, setTutorialPhase] = useState(null);
  const [winFxKey, setWinFxKey] = useState(0);
  /** 对局层淡入（与黑场揭开同步） */
  const [playReveal, setPlayReveal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const [maxUnlocked, setMaxUnlocked] = useState(() => getMaxUnlockedIndex());
  const [cleared, setCleared] = useState(() => getClearedIndices());
  const [recommendedIndex, setRecommendedIndex] = useState(() => getRecommendedLevelIndex());

  const level = LEVELS[currentLevelIndex];
  const hasNextLevel = currentLevelIndex < LEVELS.length - 1;
  const transitioning = fadePhase !== "idle";

  const refreshProgress = useCallback(() => {
    setMaxUnlocked(getMaxUnlockedIndex());
    setCleared(getClearedIndices());
    setRecommendedIndex(getRecommendedLevelIndex());
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      stopBgm();
    };
  }, []);

  // BGM 只跟 screen 走（与对战曲同一逻辑）：
  // screen==="play" 时保持对战曲，重开/下一关不重切；切到 hub 才换选关曲。
  useEffect(() => {
    if (!gameStarted) return;
    setBgmScene(screen);
  }, [gameStarted, screen]);

  useEffect(() => {
    if (screen !== "play") return undefined;

    setLastLevelIndex(currentLevelIndex);
    setGameState("playing");
    setTutorialPhase(level.tutorial ? TUTORIAL_START_PHASE : null);

    const cleanup = mountCellGame(
      containerRef.current,
      gameApiRef,
      () => `level-${level.id}`,
      level,
      (isWin) => {
        if (isWin) {
          markLevelCleared(currentLevelIndex);
          refreshProgress();
          setGameState("win");
        } else {
          setGameState("lose");
        }
      },
      (phase) => setTutorialPhase(phase),
      () => setTutorialPhase(null),
    );
    return cleanup;
  }, [screen, currentLevelIndex, gameKey, level, refreshProgress]);

  function beginTransition(nextScreen, levelIndex = null) {
    if (transitioning) return;
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
      if (typeof lvl === "number") setCurrentLevelIndex(lvl);
      setGameState("playing");
      setPlayReveal(false);
      setScreen("play");
      setGameKey((prev) => prev + 1);
    } else if (next === "hub") {
      setPlayReveal(false);
      setScreen("hub");
      setGameState("playing");
      setTutorialPhase(null);
      refreshProgress();
    }
    return next;
  }

  function handleVeilCovered() {
    // 黑场到位：只切画面；BGM 由 screen 的 useEffect 同步
    applyPendingScreen();
    setFadePhase("hold");
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      setPlayReveal(true);
      setFadePhase("in");
    }, HOLD_BLACK_MS);
  }

  function handleVeilRevealed() {
    setFadePhase("idle");
  }

  function handleEnterLevel(index) {
    if (!isLevelUnlocked(index) || transitioning) return;
    unlockCellAudio();
    beginTransition("play", index);
  }

  function handleStartGame() {
    unlockCellAudio();
    setGameStarted(true);
  }

  function handleBackToHub() {
    if (transitioning) return;
    beginTransition("hub");
  }

  function handleRestart() {
    if (transitioning) return;
    setGameKey((prev) => prev + 1);
    setGameState("playing");
  }

  function handleNextLevel() {
    if (transitioning) return;
    if (hasNextLevel) {
      const next = currentLevelIndex + 1;
      if (isLevelUnlocked(next)) {
        // 关卡间也走黑场，避免硬切
        beginTransition("play", next);
        return;
      }
    }
    handleBackToHub();
  }

  function handleDebugWin() {
    markLevelCleared(currentLevelIndex);
    refreshProgress();
    setGameState("win");
    setWinFxKey((k) => k + 1);
  }

  function handleResetProgress() {
    localStorage.removeItem("cell_game_max_unlocked");
    localStorage.removeItem("cell_game_cleared");
    localStorage.removeItem("cell_game_level");
    refreshProgress();
    if (screen === "play") {
      beginTransition("hub");
    } else {
      setCurrentLevelIndex(0);
    }
  }

  function handleUnlockAll() {
    localStorage.setItem("cell_game_max_unlocked", String(LEVELS.length - 1));
    const allCleared = LEVELS.map((_, idx) => idx).join(",");
    localStorage.setItem("cell_game_cleared", allCleared);
    refreshProgress();
  }

  function handleSkipTutorial() {
    gameApiRef.current?.skipTutorial?.();
    setTutorialPhase(null);
  }

  const stageLabel = !gameStarted
    ? "游戏区域 · 点击开始"
    : screen === "hub"
      ? "游戏区域 · 战役选关"
      : "游戏区域 · 对局";

  return (
    <GameLayout
      title="细胞分裂战"
      icon="🦠"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      contentWidth={GAME_WIDTH}
    >
      <div
        className="cell-shell"
        style={{
          ["--cell-stage-w"]: `${GAME_WIDTH}px`,
          ["--cell-stage-h"]: `${GAME_HEIGHT}px`,
          width: "100%",
          maxWidth: GAME_WIDTH,
        }}
      >
        <GameStage label={stageLabel} stageRef={stageRef}>
          {!gameStarted ? (
            <div
              className="cell-scene"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                background: "#07110d",
              }}
            >
              <button
                type="button"
                {...uiSfx("confirm", handleStartGame)}
                aria-label="开始游戏"
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: "50%",
                  border: "3px solid rgba(184, 255, 106, 0.85)",
                  background: "rgba(84, 201, 43, 0.22)",
                  color: "#d9ffb8",
                  fontSize: 54,
                  lineHeight: 1,
                  cursor: "pointer",
                  padding: "0 0 0 8px",
                  boxShadow: "0 0 40px rgba(84, 201, 43, 0.35)",
                }}
              >
                ▶
              </button>
              <div
                style={{
                  color: "rgba(217, 255, 184, 0.88)",
                  fontSize: 20,
                  letterSpacing: 3,
                }}
              >
                点击进入游戏
              </div>
            </div>
          ) : screen === "hub" ? (
            <div
              className={[
                "cell-scene",
                fadePhase === "out" ? "cell-scene--dimming" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <LevelSelect
                maxUnlocked={maxUnlocked}
                cleared={cleared}
                recommendedIndex={recommendedIndex}
                onEnterLevel={handleEnterLevel}
                tools={
                  <>
                    <SettingsButton onClick={() => setShowSettings(true)} />
                    <FullscreenButton targetRef={stageRef} />
                  </>
                }
              />
            </div>
          ) : (
            <div
              className={[
                "cell-scene",
                "cell-scene--play",
                playReveal ? "cell-scene--revealed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div ref={containerRef} className="cell-stage__canvas-host" />
              <BackButton onClick={handleBackToHub} />
              <div className="cell-play-tools">
                <SettingsButton onClick={() => setShowSettings(true)} />
                <FullscreenButton targetRef={stageRef} />
              </div>
              <TutorialHud
                key={`${gameKey}-${level.id}`}
                phase={tutorialPhase}
                onSkip={handleSkipTutorial}
              />
              <WinOverlay
                active={gameState === "win"}
                fxKey={winFxKey}
                nextLabel={hasNextLevel ? "下一关" : "返回选关"}
                onNext={handleNextLevel}
                onBackToHub={handleBackToHub}
              />
              {gameState === "lose" && (
                <LoseOverlay onRestart={handleRestart} onBackToHub={handleBackToHub} />
              )}
            </div>
          )}

          {gameStarted && (
            <FadeVeil
              phase={fadePhase}
              onCovered={handleVeilCovered}
              onRevealed={handleVeilRevealed}
            />
          )}

          {gameStarted && (
            <SettingsModal
              active={showSettings}
              onClose={() => setShowSettings(false)}
              inGame={screen === "play"}
              onDebugWin={handleDebugWin}
              onResetProgress={handleResetProgress}
              onUnlockAll={handleUnlockAll}
            />
          )}
        </GameStage>

        <GameFooter />
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
