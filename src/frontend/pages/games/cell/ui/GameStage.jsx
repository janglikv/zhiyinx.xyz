import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

/**
 * 游戏主画面外框：与网站 layout 明确分离的「游戏区域」。
 * 选关 / 对局共用同一固定画布尺寸（GAME_WIDTH × GAME_HEIGHT）。
 * @param {{
 *   children: import("react").ReactNode,
 *   label?: string,
 *   stageRef?: React.Ref<HTMLDivElement | null>,
 * }} props
 */
export default function GameStage({ children, label = "游戏区域", stageRef }) {
  return (
    <div
      className="cell-stage-wrap"
      style={{
        width: GAME_WIDTH,
        // 供 CSS 使用，避免选关/对局尺寸漂移
        ["--cell-stage-w"]: `${GAME_WIDTH}px`,
        ["--cell-stage-h"]: `${GAME_HEIGHT}px`,
      }}
    >
      <div className="cell-stage-label">
        <span className="cell-stage-label__dot" aria-hidden />
        {/* 固定文案宽度，避免切屏时标签变长短导致视觉抖一下 */}
        <span className="cell-stage-label__text">{label}</span>
        <span className="cell-stage-label__size">
          {GAME_WIDTH}×{GAME_HEIGHT}
        </span>
      </div>
      <div className="cell-stage" ref={stageRef}>
        {children}
      </div>
    </div>
  );
}
