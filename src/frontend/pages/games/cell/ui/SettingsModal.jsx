import { useEffect, useState } from "react";
import { playUi } from "../audio";

/**
 * 游戏设置模态框
 * @param {{
 *   active: boolean,
 *   onClose: () => void,
 *   inGame: boolean,
 *   onDebugWin?: () => void,
 *   onResetProgress: () => void,
 *   onUnlockAll: () => void,
 * }} props
 */
export default function SettingsModal({
  active,
  onClose,
  inGame,
  onDebugWin,
  onResetProgress,
  onUnlockAll,
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!active) {
      setConfirmReset(false);
    }
  }, [active]);

  useEffect(() => {
    if (!confirmReset) return undefined;
    const timer = window.setTimeout(() => {
      setConfirmReset(false);
    }, 3000);
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

  function handleUnlockAllClick() {
    playUi("confirm");
    onUnlockAll();
    onClose();
  }

  function handleDebugWinClick() {
    if (onDebugWin) {
      playUi("confirm");
      onDebugWin();
      onClose();
    }
  }

  return (
    <div
      className="cell-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cell-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cell-settings-title"
      >
        <header className="cell-modal-header">
          <h3 id="cell-settings-title" className="cell-modal-title">
            游戏设置
          </h3>
          <button
            type="button"
            className="cell-modal-close-btn"
            onClick={() => {
              playUi("back");
              onClose();
            }}
            aria-label="关闭设置"
          >
            &times;
          </button>
        </header>

        <div className="cell-modal-body">
          {inGame && onDebugWin && (
            <section className="cell-modal-section">
              <h4 className="cell-modal-section-title">当前关卡调试</h4>
              <p className="cell-modal-desc">
                立即以胜利结束当前关卡（这会记录通关进度并解锁下一关）。
              </p>
              <button
                type="button"
                className="cell-btn cell-btn--primary"
                onClick={handleDebugWinClick}
              >
                直接通关
              </button>
            </section>
          )}

          <section className="cell-modal-section">
            <h4 className="cell-modal-section-title">关卡进度管理</h4>
            <p className="cell-modal-desc">
              你可以选择一键解锁全部关卡，或者重置所有进度重新挑战。
            </p>
            <div className="cell-modal-actions">
              <button
                type="button"
                className="cell-btn cell-btn--outline"
                onClick={handleUnlockAllClick}
              >
                解锁全部关卡
              </button>
              <button
                type="button"
                className={`cell-btn ${
                  confirmReset ? "cell-btn--danger-active" : "cell-btn--danger"
                }`}
                onClick={handleResetClick}
              >
                {confirmReset ? "确定重置进度？" : "重置所有进度"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
