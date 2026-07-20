import { useEffect, useMemo, useState } from "react";
import { LEVELS, TOTAL_LEVELS } from "../levels";
import { isLevelUnlocked } from "./progress";
import { uiSfx } from "../audio";
import bg1 from "../backgrounds/level-1.webp";
import "./styles.css";

/**
 * @param {number} n 0–3
 */
function StarRow({ n, compact = false }) {
  const count = Math.min(3, Math.max(0, n | 0));
  return (
    <span
      className={compact ? "chub__lv-stars chub__lv-stars--compact" : "chub__lv-stars"}
      aria-label={`${count} 星`}
    >
      {[1, 2, 3].map((i) => (
        <i
          key={i}
          className={i <= count ? "chub__star chub__star--on" : "chub__star"}
          aria-hidden
        >
          ★
        </i>
      ))}
    </span>
  );
}

/**
 * @param {string} name
 */
function shortTitle(name) {
  const m = name.match(/[：:]\s*(.+)$/);
  return m ? m[1] : name;
}

/**
 * 选关大厅 — 顶栏 · 关卡网格 · 底出击条
 * @param {{
 *   maxUnlocked: number,
 *   cleared: Set<number>,
 *   stars?: number[],
 *   recommendedIndex: number,
 *   onEnterLevel: (index: number) => void,
 *   tools?: import("react").ReactNode,
 * }} props
 */
export default function LevelSelect({
  maxUnlocked,
  cleared,
  stars = [],
  recommendedIndex,
  onEnterLevel,
  tools,
}) {
  const clearedCount = cleared.size;
  const totalStars = stars.reduce((a, b) => a + (b || 0), 0);
  const maxStars = LEVELS.length * 3;
  const progressPct = Math.round((clearedCount / LEVELS.length) * 100);

  const [selectedIndex, setSelectedIndex] = useState(recommendedIndex);

  useEffect(() => {
    setSelectedIndex(recommendedIndex);
  }, [recommendedIndex]);

  const allLevels = useMemo(
    () =>
      LEVELS.map((lvl, i) => ({
        lvl,
        index: i,
        stage: i + 1,
      })),
    [],
  );

  function enterLevel(index) {
    if (!isLevelUnlocked(index)) return;
    onEnterLevel(index);
  }

  const focus = LEVELS[selectedIndex] ?? LEVELS[0];
  const focusUnlocked = isLevelUnlocked(selectedIndex);
  const focusDone = cleared.has(selectedIndex);
  const focusStars = stars[selectedIndex] || 0;
  const focusBoss = Boolean(focus?.isBoss);
  const focusHard = Boolean(focus?.isHard);
  const focusRec = selectedIndex === recommendedIndex;

  return (
    <div className="chub">
      <div
        className="chub__bg"
        style={{ backgroundImage: `url(${bg1})` }}
        aria-hidden
      />
      <div className="chub__shade" aria-hidden />
      <div className="chub__grid-fx" aria-hidden />

      <div className="chub__shell">
        <header className="chub__bar">
          <div className="chub__brand">
            <h1 className="chub__brand-title">细胞战争</h1>
          </div>

          <div className="chub__progress" title={`${clearedCount}/${TOTAL_LEVELS} 关 · ${totalStars}★`}>
            <div className="chub__progress-meta">
              <span>
                <strong>{totalStars}</strong>
                <em>/{maxStars}★</em>
              </span>
              <span className="chub__progress-sep" />
              <span className="chub__progress-pct">{progressPct}%</span>
            </div>
            <div className="chub__progress-track" aria-hidden>
              <div
                className="chub__progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {tools ? <div className="chub__tools">{tools}</div> : null}
        </header>

        <div className="chub__body">
          <section className="chub__main" aria-label="关卡列表">
            <div className="chub__levels" role="list">
              {allLevels.map(({ lvl, index, stage }) => {
                const unlocked = isLevelUnlocked(index);
                const done = cleared.has(index);
                const lvStars = stars[index] || 0;
                const isBoss = Boolean(lvl.isBoss);
                const isHard = Boolean(lvl.isHard);
                const isRec = unlocked && index === recommendedIndex;
                const isSel = index === selectedIndex;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    role="listitem"
                    className={[
                      "chub__lv",
                      unlocked ? "chub__lv--open" : "chub__lv--lock",
                      done ? "chub__lv--done" : "",
                      isBoss ? "chub__lv--boss" : "",
                      isHard ? "chub__lv--hard" : "",
                      isRec ? "chub__lv--next" : "",
                      isSel ? "chub__lv--sel" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={!unlocked}
                    aria-pressed={isSel}
                    aria-label={`第${stage}关 ${shortTitle(lvl.name)}${lvStars ? ` ${lvStars}星` : ""}${unlocked ? "" : " 锁定"}`}
                    {...uiSfx("confirm", () => {
                      if (!unlocked) return;
                      if (isSel) enterLevel(index);
                      else setSelectedIndex(index);
                    })}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (unlocked) enterLevel(index);
                    }}
                  >
                    {isBoss && (
                      <span className="chub__lv-skull-bg" aria-hidden>
                        ☠
                      </span>
                    )}
                    {isHard && !isBoss && (
                      <span className="chub__lv-hard-bg" aria-hidden>
                        ◆
                      </span>
                    )}
                    <span className="chub__lv-top">
                      <span className="chub__lv-stage">
                        {String(stage).padStart(2, "0")}
                      </span>
                      {done && (
                        <span className="chub__lv-check" aria-hidden>
                          ✓
                        </span>
                      )}
                      {!unlocked && (
                        <span className="chub__lv-lock" aria-hidden>
                          🔒
                        </span>
                      )}
                    </span>
                    <span className="chub__lv-name">
                      {shortTitle(lvl.name)}
                    </span>
                    <StarRow n={lvStars} compact />
                    {isRec && !done && <span className="chub__lv-glow" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <footer
          className={[
            "chub__dock",
            focusHard && focusBoss
              ? "chub__dock--hard-boss"
              : focusHard
                ? "chub__dock--hard"
                : focusBoss
                  ? "chub__dock--boss"
                  : "",
            !focusUnlocked ? "chub__dock--lock" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="chub__dock-info">
            <p className="chub__dock-title">
              {focus?.name ?? "—"}
            </p>
            <div className="chub__dock-stars">
              <StarRow n={focusStars} />
            </div>
          </div>

          <div className="chub__dock-actions">
            {selectedIndex !== recommendedIndex && (
              <button
                type="button"
                className="chub__btn-ghost"
                {...uiSfx("confirm", () => {
                  setSelectedIndex(recommendedIndex);
                })}
              >
                下一步
              </button>
            )}
            <button
              type="button"
              className={[
                "chub__btn-play",
                focusHard && focusBoss && focusUnlocked
                  ? "chub__btn-play--hard-boss"
                  : focusHard && focusUnlocked
                    ? "chub__btn-play--hard"
                    : focusBoss && focusUnlocked
                      ? "chub__btn-play--boss"
                      : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={!focusUnlocked}
              {...uiSfx("confirm", () => {
                if (focusUnlocked) enterLevel(selectedIndex);
              })}
            >
              {!focusUnlocked ? "未解锁" : focusDone ? "再战" : focusRec ? "出击" : "进入"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
