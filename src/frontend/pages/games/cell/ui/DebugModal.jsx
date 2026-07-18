import { useEffect, useState } from "react";
import { playUi, onUiHover, uiSfx } from "../audio";
import AudioDebugPanel from "./AudioDebugPanel";

/**
 * 开发调试模态框（仅 DEV 挂载）
 * 宽布局、紧凑排布，尽量一屏展示、少内滚动。
 * @param {{
 *   active: boolean,
 *   onClose: () => void,
 *   inGame: boolean,
 *   onDebugWin?: () => void,
 *   onResetProgress: () => void,
 *   onUnlockAll: () => void,
 * }} props
 */
export default function DebugModal({
  active,
  onClose,
  inGame,
  onDebugWin,
  onResetProgress,
  onUnlockAll,
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!active) setConfirmReset(false);
  }, [active]);

  useEffect(() => {
    if (!confirmReset) return undefined;
    const timer = window.setTimeout(() => setConfirmReset(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  if (!active) return null;

  function handleResetClick() {
    if (confirmReset) {
      playUi("confirm");
      onResetProgress();
      setConfirmReset(false);
      onClose();
    } else {
      playUi("tap");
      setConfirmReset(true);
    }
  }

  return (
    <div
      className="cell-modal-overlay cell-modal-overlay--debug"
      onClick={() => {
        playUi("back");
        onClose();
      }}
      role="presentation"
    >
      <div
        className="cell-modal-content cell-modal-content--debug"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-debug-title"
      >
        <header className="cell-modal-header cell-modal-header--debug">
          <h3 id="cell-debug-title" className="cell-modal-title">
            开发调试
            <span className="cell-modal-badge">DEV</span>
          </h3>
          <div className="cell-debug-toolbar" role="toolbar" aria-label="关卡工具">
            {inGame && onDebugWin && (
              <button
                type="button"
                className="cell-btn cell-btn--primary cell-debug-toolbar__btn"
                {...uiSfx("confirm", () => {
                  onDebugWin();
                  onClose();
                })}
              >
                直接通关
              </button>
            )}
            <button
              type="button"
              className="cell-btn cell-btn--outline cell-debug-toolbar__btn"
              {...uiSfx("confirm", () => {
                onUnlockAll();
                onClose();
              })}
            >
              解锁全部
            </button>
            <button
              type="button"
              className={`cell-btn cell-debug-toolbar__btn ${
                confirmReset ? "cell-btn--danger-active" : "cell-btn--danger"
              }`}
              onMouseEnter={onUiHover}
              onClick={handleResetClick}
            >
              {confirmReset ? "确定重置？" : "重置进度"}
            </button>
            <button
              type="button"
              className="cell-modal-close-btn"
              {...uiSfx("back", onClose)}
              aria-label="关闭调试"
            >
              &times;
            </button>
          </div>
        </header>

        <div className="cell-modal-body cell-modal-body--debug">
          <AudioDebugPanel compact />
        </div>
      </div>
    </div>
  );
}
