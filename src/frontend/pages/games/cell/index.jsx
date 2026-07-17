import { useEffect, useRef, useState } from "react";
import GameLayout from "../../../components/GameLayout";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";
import { LEVELS } from "./levels";
import { mountCellGame } from "./mount";
import { TUTORIAL_START_PHASE, TutorialHud } from "./tutorial";
import { WinOverlay, LoseOverlay } from "./settlement";
import LevelHeader from "./ui/LevelHeader";
import GameFooter from "./ui/GameFooter";
import "./styles.css";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const gameApiRef = useRef(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => {
    const saved = localStorage.getItem("cell_game_level");
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < LEVELS.length) {
      return parsed;
    }
    return 0;
  });
  const [gameState, setGameState] = useState("playing");
  const [gameKey, setGameKey] = useState(0);
  /** @type {[import("./tutorial/phases").TutorialPhase | null, Function]} */
  const [tutorialPhase, setTutorialPhase] = useState(null);
  /** 通关烟花 / 提示重播（调试） */
  const [winFxKey, setWinFxKey] = useState(0);

  const level = LEVELS[currentLevelIndex];

  useEffect(() => {
    localStorage.setItem("cell_game_level", currentLevelIndex);
  }, [currentLevelIndex]);

  useEffect(() => {
    setGameState("playing");
    setTutorialPhase(level.tutorial ? TUTORIAL_START_PHASE : null);

    const cleanup = mountCellGame(
      containerRef.current,
      gameApiRef,
      // 背景与关卡绑定，保证五关拥有连续的视觉节奏。
      () => `level-${level.id}`,
      level,
      (isWin) => {
        setGameState(isWin ? "win" : "lose");
      },
      (phase) => setTutorialPhase(phase),
      () => setTutorialPhase(null),
    );
    return cleanup;
  }, [currentLevelIndex, gameKey, level]);

  function handleRestart() {
    setGameKey((prev) => prev + 1);
  }

  function handleNextLevel() {
    if (currentLevelIndex < LEVELS.length - 1) {
      setCurrentLevelIndex((prev) => prev + 1);
    } else {
      setCurrentLevelIndex(0);
    }
  }

  function handleDebugWin() {
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
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <LevelHeader
          level={level}
          currentLevelIndex={currentLevelIndex}
          onSelectLevel={setCurrentLevelIndex}
          onDebugWin={handleDebugWin}
        />

        <div style={{ position: "relative", width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <div
            ref={containerRef}
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              border: "2px solid var(--border-light)",
              background: "#000000",
              boxShadow: "inset 0 0 35px rgba(0, 0, 0, 0.95), 0 10px 40px rgba(0,0,0,0.5)",
              width: GAME_WIDTH,
              height: GAME_HEIGHT,
            }}
          />

          <TutorialHud
            key={`${gameKey}-${level.id}`}
            phase={tutorialPhase}
            onSkip={handleSkipTutorial}
          />

          <WinOverlay
            active={gameState === "win"}
            fxKey={winFxKey}
            nextLabel={currentLevelIndex === LEVELS.length - 1 ? "重玩" : "下一关"}
            onNext={handleNextLevel}
          />

          {gameState === "lose" && <LoseOverlay onRestart={handleRestart} />}
        </div>

        <GameFooter />
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
