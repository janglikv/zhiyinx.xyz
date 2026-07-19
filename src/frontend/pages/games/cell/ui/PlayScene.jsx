import { TutorialHud } from "../tutorial";
import { WinOverlay, LoseOverlay } from "../settlement";
import BackButton from "./BackButton";
import StageTools from "./StageTools";
import BattleTimer from "./BattleTimer";

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
  return (
    <div
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
        <StageTools
          stageRef={stageRef}
          onOpenSettings={onOpenSettings}
          onOpenDebug={onOpenDebug}
        />
      </div>
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
        onBackToHub={onBackToHub}
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
