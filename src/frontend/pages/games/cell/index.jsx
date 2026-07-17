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
import DebugWinButton from "./ui/DebugWinButton";
import "./styles.css";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const gameApiRef = useRef(null);

  /** @type {["hub" | "play", Function]} */
  const [screen, setScreen] = useState("hub");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => getRecommendedLevelIndex());
  const [gameState, setGameState] = useState("playing");
  const [gameKey, setGameKey] = useState(0);
  /** @type {[import("./tutorial/phases").TutorialPhase | null, Function]} */
  const [tutorialPhase, setTutorialPhase] = useState(null);
  const [winFxKey, setWinFxKey] = useState(0);

  const [maxUnlocked, setMaxUnlocked] = useState(() => getMaxUnlockedIndex());
  const [cleared, setCleared] = useState(() => getClearedIndices());
  const [recommendedIndex, setRecommendedIndex] = useState(() => getRecommendedLevelIndex());

  const level = LEVELS[currentLevelIndex];
  const hasNextLevel = currentLevelIndex < LEVELS.length - 1;

  const refreshProgress = useCallback(() => {
    setMaxUnlocked(getMaxUnlockedIndex());
    setCleared(getClearedIndices());
    setRecommendedIndex(getRecommendedLevelIndex());
  }, []);

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

  function handleEnterLevel(index) {
    if (!isLevelUnlocked(index)) return;
    setCurrentLevelIndex(index);
    setGameState("playing");
    setScreen("play");
    setGameKey((prev) => prev + 1);
  }

  function handleBackToHub() {
    setScreen("hub");
    setGameState("playing");
    setTutorialPhase(null);
    refreshProgress();
  }

  function handleRestart() {
    setGameKey((prev) => prev + 1);
    setGameState("playing");
  }

  function handleNextLevel() {
    if (hasNextLevel) {
      const next = currentLevelIndex + 1;
      if (isLevelUnlocked(next)) {
        setCurrentLevelIndex(next);
        setGameState("playing");
        setGameKey((prev) => prev + 1);
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

  function handleSkipTutorial() {
    gameApiRef.current?.skipTutorial?.();
    setTutorialPhase(null);
  }

  return (
    <GameLayout
      title="细胞分裂战"
      icon="🦠"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      contentWidth={GAME_WIDTH}
    >
      {/* 整块为游戏壳：与 GameLayout（网站）分层；尺寸与画布对齐 */}
      <div
        className="cell-shell"
        style={{
          ["--cell-stage-w"]: `${GAME_WIDTH}px`,
          ["--cell-stage-h"]: `${GAME_HEIGHT}px`,
        }}
      >
        <GameStage label={screen === "hub" ? "游戏区域 · 战役选关" : "游戏区域 · 对局"}>
          {screen === "hub" ? (
            <LevelSelect
              maxUnlocked={maxUnlocked}
              cleared={cleared}
              recommendedIndex={recommendedIndex}
              onEnterLevel={handleEnterLevel}
            />
          ) : (
            <>
              <div ref={containerRef} className="cell-stage__canvas-host" />
              <BackButton onClick={handleBackToHub} />
              <DebugWinButton onClick={handleDebugWin} />
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
            </>
          )}
        </GameStage>

        {/* 选关/对局始终占位，避免 GameLayout 垂直居中时画面上跳 */}
        <GameFooter />
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
