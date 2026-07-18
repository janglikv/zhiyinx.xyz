import { useEffect, useState } from "react";
import { playUi, onUiHover, uiSfx } from "../audio";
import AudioDebugPanel from "./AudioDebugPanel";

/**
 * 开发调试模态框（仅 DEV 挂载）
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
      className="cell-modal-overlay"
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
          <button
            type="button"
            className="cell-modal-close-btn"
            {...uiSfx("back", onClose)}
            aria-label="关闭调试"
          >
            &times;
          </button>
        </header>

        <div className="cell-modal-body">
          <p className="cell-modal-desc">
            仅本地开发模式可用。生产构建不会显示调试按钮与本面板。
          </p>

          {inGame && onDebugWin && (
            <section className="cell-modal-section">
              <h4 className="cell-modal-section-title">当前关卡</h4>
              <p className="cell-modal-desc">
                立即以胜利结束当前关卡（会记录通关并解锁下一关）。
              </p>
              <button
                type="button"
                className="cell-btn cell-btn--primary"
                {...uiSfx("confirm", () => {
                  onDebugWin();
                  onClose();
                })}
              >
                直接通关
              </button>
            </section>
          )}

          <section className="cell-modal-section">
            <h4 className="cell-modal-section-title">关卡进度</h4>
            <p className="cell-modal-desc">
              一键解锁全部关卡，或重置进度重新挑战。
            </p>
            <div className="cell-modal-actions">
              <button
                type="button"
                className="cell-btn cell-btn--outline"
                {...uiSfx("confirm", () => {
                  onUnlockAll();
                  onClose();
                })}
              >
                解锁全部关卡
              </button>
              <button
                type="button"
                className={`cell-btn ${
                  confirmReset ? "cell-btn--danger-active" : "cell-btn--danger"
                }`}
                onMouseEnter={onUiHover}
                onClick={handleResetClick}
              >
                {confirmReset ? "确定重置进度？" : "重置所有进度"}
              </button>
            </div>
          </section>

          <section className="cell-modal-section">
            <h4 className="cell-modal-section-title">音效调试</h4>
            <AudioDebugPanel />
          </section>
        </div>
      </div>
    </div>
  );
}
