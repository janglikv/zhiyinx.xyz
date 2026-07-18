import { useEffect, useState } from "react";
import {
  playUi,
  onUiHover,
  uiSfx,
  getAudioSettings,
  setAudioMuted,
  setBgmVolume,
  setSfxVolume,
  unlockCellAudio,
} from "../audio";

const IS_DEV = import.meta.env.DEV;

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
  const [muted, setMuted] = useState(() => getAudioSettings().muted);
  const [bgm, setBgm] = useState(() => getAudioSettings().bgm);
  const [sfx, setSfx] = useState(() => getAudioSettings().sfx);

  useEffect(() => {
    if (!active) {
      setConfirmReset(false);
      return;
    }
    // 打开时与持久化设置同步
    const s = getAudioSettings();
    setMuted(s.muted);
    setBgm(s.bgm);
    setSfx(s.sfx);
  }, [active]);

  useEffect(() => {
    if (!confirmReset) return undefined;
    const timer = window.setTimeout(() => {
      setConfirmReset(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  if (!active) return null;

  function handleMuteToggle() {
    unlockCellAudio();
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    if (!next) playUi("tap");
  }

  function handleBgmChange(e) {
    const v = Number(e.target.value) / 100;
    setBgm(v);
    setBgmVolume(v);
  }

  function handleSfxChange(e) {
    const v = Number(e.target.value) / 100;
    setSfx(v);
    setSfxVolume(v);
  }

  function handleSfxCommit() {
    unlockCellAudio();
    if (!muted && sfx > 0) playUi("tap");
  }

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

  const slidersDisabled = muted;

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
            {...uiSfx("back", onClose)}
            aria-label="关闭设置"
          >
            &times;
          </button>
        </header>

        <div className="cell-modal-body">
          <section className="cell-modal-section">
            <h4 className="cell-modal-section-title">声音</h4>
            <p className="cell-modal-desc">调节背景音乐与音效，设置会自动保存。</p>

            <div className="cell-settings-row">
              <span className="cell-settings-label" id="cell-mute-label">
                静音
              </span>
              <button
                type="button"
                className={`cell-toggle ${muted ? "cell-toggle--on" : ""}`}
                role="switch"
                aria-checked={muted}
                aria-labelledby="cell-mute-label"
                onMouseEnter={onUiHover}
                onClick={handleMuteToggle}
              >
                <span className="cell-toggle__knob" />
              </button>
            </div>

            <div className={`cell-settings-slider ${slidersDisabled ? "is-disabled" : ""}`}>
              <div className="cell-settings-slider__head">
                <label className="cell-settings-label" htmlFor="cell-bgm-volume">
                  音乐
                </label>
                <span className="cell-settings-value" aria-hidden="true">
                  {Math.round(bgm * 100)}%
                </span>
              </div>
              <input
                id="cell-bgm-volume"
                className="cell-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(bgm * 100)}
                disabled={slidersDisabled}
                onChange={handleBgmChange}
                aria-valuetext={`${Math.round(bgm * 100)}%`}
              />
            </div>

            <div className={`cell-settings-slider ${slidersDisabled ? "is-disabled" : ""}`}>
              <div className="cell-settings-slider__head">
                <label className="cell-settings-label" htmlFor="cell-sfx-volume">
                  音效
                </label>
                <span className="cell-settings-value" aria-hidden="true">
                  {Math.round(sfx * 100)}%
                </span>
              </div>
              <input
                id="cell-sfx-volume"
                className="cell-range"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(sfx * 100)}
                disabled={slidersDisabled}
                onChange={handleSfxChange}
                onPointerUp={handleSfxCommit}
                onKeyUp={handleSfxCommit}
                aria-valuetext={`${Math.round(sfx * 100)}%`}
              />
            </div>
          </section>

          {IS_DEV && (
            <section className="cell-modal-section cell-modal-section--debug">
              <h4 className="cell-modal-section-title">
                开发调试
                <span className="cell-modal-badge">DEV</span>
              </h4>
              <p className="cell-modal-desc">
                仅本地开发模式可见。生产构建不会打包显示本组。
              </p>

              {inGame && onDebugWin && (
                <div className="cell-modal-debug-block">
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
                </div>
              )}

              <div className="cell-modal-debug-block">
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
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
