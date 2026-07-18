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

/**
 * 游戏设置模态框（玩家向：声音等）
 * @param {{
 *   active: boolean,
 *   onClose: () => void,
 * }} props
 */
export default function SettingsModal({ active, onClose }) {
  const [muted, setMuted] = useState(() => getAudioSettings().muted);
  const [bgm, setBgm] = useState(() => getAudioSettings().bgm);
  const [sfx, setSfx] = useState(() => getAudioSettings().sfx);

  useEffect(() => {
    if (!active) return;
    const s = getAudioSettings();
    setMuted(s.muted);
    setBgm(s.bgm);
    setSfx(s.sfx);
  }, [active]);

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
        </div>
      </div>
    </div>
  );
}
