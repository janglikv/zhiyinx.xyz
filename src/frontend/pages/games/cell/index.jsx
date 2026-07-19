import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../../../components/GameLayout";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";
import { LEVELS, backgroundIdForLevelIndex } from "./levels";
import { mountCellGame } from "./mount";
import {
  getRecommendedLevelIndex,
  isLevelUnlocked,
  setLastLevelIndex,
} from "./hub";
import { TUTORIAL_START_PHASE } from "./tutorial";
import GameFooter from "./ui/GameFooter";
import GameStage from "./ui/GameStage";
import FadeVeil from "./ui/FadeVeil";
import SettingsModal from "./ui/SettingsModal";
import DebugModal from "./ui/DebugModal";
import StartGate from "./ui/StartGate";
import HubScene from "./ui/HubScene";
import PlayScene from "./ui/PlayScene";
import { unlockCellAudio } from "./audio";

const IS_DEV = import.meta.env.DEV;
import { useCellProgress } from "./hooks/useCellProgress";
import { useScreenTransition } from "./hooks/useScreenTransition";
import { useCellBgm } from "./hooks/useCellBgm";
import "./styles.css";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const gameApiRef = useRef(null);

  /** @type {["hub" | "play", Function]} */
  const [screen, setScreen] = useState("hub");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() =>
    getRecommendedLevelIndex(),
  );
  const [gameState, setGameState] = useState("playing");
  const [gameKey, setGameKey] = useState(0);
  /** @type {[import("./tutorial/phases").TutorialPhase | null, Function]} */
  const [tutorialPhase, setTutorialPhase] = useState(null);
  const [winFxKey, setWinFxKey] = useState(0);
  const [playReveal, setPlayReveal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  /** @type {[null | { remainingSec: number, timeLimitSec: number, urgent: boolean }, Function]} */
  const [battleHud, setBattleHud] = useState(null);
  /** @type {[null | object, Function]} */
  const [endResult, setEndResult] = useState(null);

  const {
    maxUnlocked,
    cleared,
    stars,
    recommendedIndex,
    refresh,
    clearLevel,
    resetAll,
    unlockAll,
  } = useCellProgress();

  const onApplyPlay = useCallback((levelIndex) => {
    if (typeof levelIndex === "number") setCurrentLevelIndex(levelIndex);
    setGameState("playing");
    setPlayReveal(false);
    setBattleHud(null);
    setEndResult(null);
    setScreen("play");
    setGameKey((prev) => prev + 1);
  }, []);

  const onApplyHub = useCallback(() => {
    setPlayReveal(false);
    setScreen("hub");
    setGameState("playing");
    setTutorialPhase(null);
    setBattleHud(null);
    setEndResult(null);
    refresh();
  }, [refresh]);

  const { fadePhase, transitioning, beginTransition, handleVeilCovered, handleVeilRevealed } =
    useScreenTransition({
      onApplyPlay,
      onApplyHub,
      onHoldEnd: () => setPlayReveal(true),
    });

  // 换关 / 重开时 playSessionKey 变化 → 对战 BGM 从头播放
  useCellBgm(
    gameStarted,
    screen,
    screen === "play" ? `${currentLevelIndex}:${gameKey}` : "hub",
  );

  const level = LEVELS[currentLevelIndex];
  const hasNextLevel = currentLevelIndex < LEVELS.length - 1;

  // 对局挂载：与 Pixi 生命周期绑得紧，留在页面层更稳
  useEffect(() => {
    if (screen !== "play") return undefined;

    setLastLevelIndex(currentLevelIndex);
    setGameState("playing");
    setBattleHud(null);
    setEndResult(null);
    setTutorialPhase(level.tutorial ? TUTORIAL_START_PHASE : null);

    const cleanup = mountCellGame(
      containerRef.current,
      gameApiRef,
      () => backgroundIdForLevelIndex(currentLevelIndex),
      level,
      (isWin, detail = {}) => {
        if (isWin) {
          const earned = Math.min(3, Math.max(1, detail.stars ?? 1));
          const { bestStars } = clearLevel(currentLevelIndex, earned);
          setEndResult({ ...detail, stars: earned, bestStars });
          setGameState("win");
          setWinFxKey((k) => k + 1);
        } else {
          setEndResult(detail);
          setGameState("lose");
        }
      },
      (phase) => setTutorialPhase(phase),
      () => setTutorialPhase(null),
      (hud) => setBattleHud(hud),
    );
    return cleanup;
  }, [screen, currentLevelIndex, gameKey, level, clearLevel]);

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
    setBattleHud(null);
    setEndResult(null);
    setGameKey((prev) => prev + 1);
    setGameState("playing");
  }

  function handleNextLevel() {
    if (transitioning) return;
    if (hasNextLevel) {
      const next = currentLevelIndex + 1;
      if (isLevelUnlocked(next)) {
        beginTransition("play", next);
        return;
      }
    }
    handleBackToHub();
  }

  function handleDebugWin() {
    const { bestStars } = clearLevel(currentLevelIndex, 3);
    setEndResult({
      reason: "clear",
      stars: 3,
      bestStars,
      energyOk: true,
      timeOk: true,
      elapsedSec: 0,
    });
    setGameState("win");
    setWinFxKey((k) => k + 1);
  }

  function handleResetProgress() {
    resetAll();
    if (screen === "play") {
      beginTransition("hub");
    } else {
      setCurrentLevelIndex(0);
    }
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
            <StartGate onStart={handleStartGame} />
          ) : screen === "hub" ? (
            <HubScene
              maxUnlocked={maxUnlocked}
              cleared={cleared}
              stars={stars}
              recommendedIndex={recommendedIndex}
              onEnterLevel={handleEnterLevel}
              dimming={fadePhase === "out"}
              stageRef={stageRef}
              onOpenSettings={() => {
                setShowDebug(false);
                setShowSettings(true);
              }}
              onOpenDebug={
                IS_DEV
                  ? () => {
                      setShowSettings(false);
                      setShowDebug(true);
                    }
                  : undefined
              }
            />
          ) : (
            <PlayScene
              containerRef={containerRef}
              stageRef={stageRef}
              revealed={playReveal}
              gameKey={gameKey}
              levelId={level.id}
              tutorialPhase={tutorialPhase}
              gameState={gameState}
              winFxKey={winFxKey}
              nextLabel={hasNextLevel ? "下一关" : "返回选关"}
              battleHud={battleHud}
              endResult={endResult}
              onBackToHub={handleBackToHub}
              onOpenSettings={() => {
                setShowDebug(false);
                setShowSettings(true);
              }}
              onOpenDebug={
                IS_DEV
                  ? () => {
                      setShowSettings(false);
                      setShowDebug(true);
                    }
                  : undefined
              }
              onSkipTutorial={handleSkipTutorial}
              onNext={handleNextLevel}
              onRestart={handleRestart}
            />
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
            />
          )}

          {gameStarted && IS_DEV && (
            <DebugModal
              active={showDebug}
              onClose={() => setShowDebug(false)}
              inGame={screen === "play"}
              onDebugWin={handleDebugWin}
              onResetProgress={handleResetProgress}
              onUnlockAll={unlockAll}
            />
          )}
        </GameStage>

        <GameFooter />
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
