import { LevelSelect } from "../hub";
import StageTools from "./StageTools";

/**
 * 选关大厅场景
 * @param {{
 *   maxUnlocked: number,
 *   cleared: Set<number>,
 *   recommendedIndex: number,
 *   onEnterLevel: (index: number) => void,
 *   dimming?: boolean,
 *   stageRef: React.RefObject<HTMLElement | null>,
 *   onOpenSettings: () => void,
 * }} props
 */
export default function HubScene({
  maxUnlocked,
  cleared,
  recommendedIndex,
  onEnterLevel,
  dimming = false,
  stageRef,
  onOpenSettings,
}) {
  return (
    <div
      className={["cell-scene", dimming ? "cell-scene--dimming" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <LevelSelect
        maxUnlocked={maxUnlocked}
        cleared={cleared}
        recommendedIndex={recommendedIndex}
        onEnterLevel={onEnterLevel}
        tools={
          <StageTools stageRef={stageRef} onOpenSettings={onOpenSettings} />
        }
      />
    </div>
  );
}
