import { useState } from "react";
import { COLOR_ENEMY, COLOR_PLAYER, GAME_WIDTH } from "../constants";
import {
  getAudioSettings,
  unlockCellAudioReady,
  playBulletShot,
  playFirework,
  playHit,
  playHurt,
  playUi,
  setBgmScene,
  HIT_VARIANT_LIST,
  getHitVariant,
  setHitVariant,
} from "../audio";

/**
 * @typedef {{ id: string, label: string, group: string, play: () => void }} SfxProbe
 */

/** @type {SfxProbe[]} */
const PROBES = [
  {
    id: "bullet-player",
    label: "射击·己方",
    group: "媒体",
    play: () =>
      playBulletShot({ x: GAME_WIDTH * 0.35, color: COLOR_PLAYER }),
  },
  {
    id: "bullet-enemy",
    label: "射击·敌方",
    group: "媒体",
    play: () =>
      playBulletShot({ x: GAME_WIDTH * 0.65, color: COLOR_ENEMY }),
  },
  {
    id: "firework",
    label: "烟花",
    group: "媒体",
    play: () => playFirework({ x: GAME_WIDTH * 0.5, width: GAME_WIDTH }),
  },
  {
    id: "hurt",
    label: "受伤",
    group: "战斗",
    play: () =>
      playHurt({ x: GAME_WIDTH * 0.45, width: GAME_WIDTH, strength: 0.9 }),
  },
  {
    id: "ui-hover",
    label: "UI hover",
    group: "UI",
    play: () => playUi("hover"),
  },
  {
    id: "ui-tap",
    label: "UI tap",
    group: "UI",
    play: () => playUi("tap"),
  },
  {
    id: "ui-confirm",
    label: "UI confirm",
    group: "UI",
    play: () => playUi("confirm"),
  },
  {
    id: "ui-back",
    label: "UI back",
    group: "UI",
    play: () => playUi("back"),
  },
  {
    id: "bgm-hub",
    label: "BGM 大厅",
    group: "BGM",
    play: () => setBgmScene("hub"),
  },
  {
    id: "bgm-play",
    label: "BGM 对战",
    group: "BGM",
    play: () => setBgmScene("play"),
  },
];

const GROUPS = ["媒体", "战斗", "UI", "BGM"];

/**
 * 开发用：点击试听各类音效（仅 DEV 挂载）
 */
export default function AudioDebugPanel() {
  const [lastId, setLastId] = useState(/** @type {string | null} */ (null));
  const [activeHit, setActiveHit] = useState(() => getHitVariant());
  const [hint, setHint] = useState("");

  async function handlePlay(probe) {
    setLastId(probe.id);
    const { muted, sfx, bgm } = getAudioSettings();
    const isBgm = probe.group === "BGM";

    if (muted) {
      setHint("当前已静音，请先关闭静音");
      return;
    }
    if (isBgm && bgm <= 0) {
      setHint("音乐音量为 0");
      return;
    }
    if (!isBgm && sfx <= 0) {
      setHint("音效音量为 0");
      return;
    }

    await unlockCellAudioReady();
    probe.play();
    setHint(`已播放：${probe.label}`);
  }

  async function handleHitPreview(variantId, label) {
    setLastId(`hit-${variantId}`);
    const { muted, sfx } = getAudioSettings();
    if (muted) {
      setHint("当前已静音，请先关闭静音");
      return;
    }
    if (sfx <= 0) {
      setHint("音效音量为 0");
      return;
    }
    await unlockCellAudioReady();
    playHit({
      x: GAME_WIDTH * 0.55,
      width: GAME_WIDTH,
      strength: 0.95,
      variant: variantId,
      force: true,
    });
    setHint(`试听：${label}（再点「选用」可应用到对局）`);
  }

  async function handleHitSelect(variantId, label) {
    if (!setHitVariant(variantId)) return;
    setActiveHit(variantId);
    setLastId(`hit-${variantId}`);
    const { muted, sfx } = getAudioSettings();
    if (!muted && sfx > 0) {
      await unlockCellAudioReady();
      playHit({
        x: GAME_WIDTH * 0.55,
        width: GAME_WIDTH,
        strength: 0.95,
        variant: variantId,
        force: true,
      });
    }
    setHint(`已选用命中：${label}（对局即时生效，已保存）`);
  }

  return (
    <div className="cell-audio-debug">
      <p className="cell-modal-desc">
        点击试听。命中有多套细胞打击感可选：点名称试听，点「选用」写入对局。
      </p>

      <div className="cell-audio-debug__group">
        <div className="cell-audio-debug__group-title">命中变体（细胞打击）</div>
        <p className="cell-modal-desc">
          当前选用：
          <strong className="cell-audio-debug__current">
            {HIT_VARIANT_LIST.find((v) => v.id === activeHit)?.label ?? activeHit}
          </strong>
        </p>
        <div className="cell-hit-variants" role="list">
          {HIT_VARIANT_LIST.map((v) => {
            const isSelected = activeHit === v.id;
            const isLast = lastId === `hit-${v.id}`;
            return (
              <div
                key={v.id}
                className={`cell-hit-variant ${isSelected ? "is-selected" : ""} ${
                  isLast ? "is-last" : ""
                }`}
                role="listitem"
              >
                <button
                  type="button"
                  className="cell-hit-variant__play"
                  onClick={() => handleHitPreview(v.id, v.label)}
                  title={v.desc}
                >
                  <span className="cell-hit-variant__name">{v.label}</span>
                  <span className="cell-hit-variant__desc">{v.desc}</span>
                </button>
                <button
                  type="button"
                  className={`cell-hit-variant__pick ${isSelected ? "is-on" : ""}`}
                  onClick={() => handleHitSelect(v.id, v.label)}
                  aria-pressed={isSelected}
                >
                  {isSelected ? "已用" : "选用"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {GROUPS.map((group) => {
        const items = PROBES.filter((p) => p.group === group);
        return (
          <div key={group} className="cell-audio-debug__group">
            <div className="cell-audio-debug__group-title">{group}</div>
            <div className="cell-audio-debug__grid" role="group" aria-label={group}>
              {items.map((probe) => (
                <button
                  key={probe.id}
                  type="button"
                  className={`cell-audio-debug__btn ${
                    lastId === probe.id ? "is-active" : ""
                  }`}
                  onClick={() => handlePlay(probe)}
                >
                  {probe.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {hint ? (
        <p className="cell-audio-debug__hint" role="status">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
