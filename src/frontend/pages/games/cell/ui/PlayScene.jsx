import { TutorialHud } from "../tutorial";
import { WinOverlay, LoseOverlay } from "../settlement";
import BackButton from "./BackButton";
import StageTools from "./StageTools";

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
 *   onBackToHub: () => void,
 *   onOpenSettings: () => void,
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
  onBackToHub,
  onOpenSettings,
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
      <div className="cell-play-tools">
        <StageTools stageRef={stageRef} onOpenSettings={onOpenSettings} />
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
      />
      {gameState === "lose" && (
        <LoseOverlay onRestart={onRestart} onBackToHub={onBackToHub} />
      )}
    </div>
  );
}
