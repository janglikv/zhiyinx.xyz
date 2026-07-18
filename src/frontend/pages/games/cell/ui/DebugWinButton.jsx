import { playUi, onUiHover } from "../audio";

/**
 * 关卡画布内叠加：通关调试
 * @param {{ onClick: () => void }} props
 */
export default function DebugWinButton({ onClick }) {
  return (
    <button
      type="button"
      className="cell-tool-btn cell-tool-btn--debug"
      onMouseEnter={onUiHover}
      onClick={() => {
        playUi("confirm");
        onClick?.();
      }}
      title="调试：触发通关"
      aria-label="通关调试"
    >
      通关调试
    </button>
  );
}
