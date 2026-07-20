import { useEffect, useMemo, useState } from "react";
import { LEVELS, TOTAL_LEVELS } from "../levels";
import { isLevelUnlocked } from "./progress";
import { uiSfx } from "../audio";
import bg1 from "../backgrounds/level-1.webp";
import "./styles.css";

const HUB_TAGLINE =
  "主线 1–12 · 紫关 13–17 · 终章 Boss 18 · 通关上一关解锁下一关。";

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
 * @param {{ unlocked: boolean, done: boolean, isBoss: boolean, isHard: boolean, isRec: boolean, neverPlayed: boolean }} s
 */
function ctaLabel(s) {
  if (!s.unlocked) return "尚未解锁";
  if (s.done) {
    if (s.isBoss && s.isHard) return "再战紫 Boss";
    if (s.isBoss) return "再战 Boss";
    if (s.isHard) return "再战高难";
    return "再战一局";
  }
  if (s.isBoss && s.isHard) return "挑战紫 Boss";
  if (s.isBoss) return "挑战 Boss";
  if (s.isHard) return "挑战高难";
  if (s.neverPlayed) return "开始第一关";
  if (s.isRec) return "继续前进";
  return "进入关卡";
}

/**
 * 选关大厅 — 顶栏 · 关卡网格 · 底出击条（无章节列表）
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
  const unlockedCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < LEVELS.length; i += 1) {
      if (isLevelUnlocked(i)) n += 1;
    }
    return n;
  }, [maxUnlocked, cleared, stars]);
  const clearedCount = cleared.size;
  const progressPct = Math.round((clearedCount / LEVELS.length) * 100);
  const neverPlayed = clearedCount === 0;
  const totalStars = stars.reduce((a, b) => a + (b || 0), 0);
  const maxStars = LEVELS.length * 3;
  const starPct = Math.min(100, Math.round((totalStars / maxStars) * 100));

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
  const focusStage = selectedIndex + 1;

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
        {/* —— 顶栏 —— */}
        <header className="chub__bar">
          <div className="chub__brand">
            <span className="chub__brand-kicker">
              CELL · {TOTAL_LEVELS} LEVELS
            </span>
            <h1 className="chub__brand-title">细胞战争</h1>
          </div>

          <div className="chub__progress" title={`完成度 ${progressPct}%`}>
            <div className="chub__progress-meta">
              <span>
                通关 <strong>{clearedCount}</strong>
              </span>
              <span className="chub__progress-sep" />
              <span>
                星 <strong>{totalStars}</strong>
                <em>/{maxStars}</em>
              </span>
              <span className="chub__progress-sep" />
              <span>
                解锁 <strong>{unlockedCount}</strong>
                <em>/{LEVELS.length}</em>
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

        {/* —— 主体：关卡网格 —— */}
        <div className="chub__body">
          <section className="chub__main" aria-label="关卡列表">
            <div className="chub__chapter-head">
              <div>
                <p className="chub__chapter-kicker">CAMPAIGN</p>
                <h2 className="chub__chapter-title">
                  共 {TOTAL_LEVELS} 关
                </h2>
                <p className="chub__chapter-tag">{HUB_TAGLINE}</p>
              </div>
              <div className="chub__chapter-stat">
                <span className="chub__chapter-stat-val">
                  {totalStars}
                  <small>/{maxStars}★</small>
                </span>
                <span className="chub__chapter-stat-lab">总星数</span>
                <div className="chub__chapter-stat-bar" aria-hidden>
                  <i style={{ width: `${starPct}%` }} />
                </div>
                <span className="chub__chapter-stat-sub">
                  通关 {clearedCount}/{LEVELS.length}
                </span>
              </div>
            </div>

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
                    aria-label={`${shortTitle(lvl.name)}${isBoss && isHard ? " 紫色 Boss" : isBoss ? " Boss" : ""}${isHard && !isBoss ? " 高难" : ""}${lvStars ? ` ${lvStars}星` : ""}`}
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
                      <span
                        className="chub__lv-skull-bg"
                        title={isHard ? "紫色 Boss 关" : "Boss 关"}
                        aria-hidden
                      >
                        ☠
                      </span>
                    )}
                    {isHard && !isBoss && (
                      <span className="chub__lv-hard-bg" title="高难关" aria-hidden>
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
                      {isBoss && (
                        <span className="chub__lv-warn" aria-hidden>
                          ⚠
                        </span>
                      )}
                      {isHard && !isBoss && (
                        <span className="chub__lv-hard-mark" aria-hidden>
                          ✦
                        </span>
                      )}
                      {shortTitle(lvl.name)}
                    </span>
                    <StarRow n={lvStars} compact />
                    <span className="chub__lv-flag">
                      {done
                        ? lvStars >= 3
                          ? "满星"
                          : `${lvStars}★ 已通关`
                        : !unlocked
                          ? "锁定"
                          : isRec
                            ? "下一步"
                            : isBoss && isHard
                              ? "紫 Boss"
                              : isBoss
                                ? "Boss 战"
                                : isHard
                                  ? "高难"
                                  : isSel
                                    ? "已选中"
                                    : "可挑战"}
                    </span>
                    {isRec && !done && <span className="chub__lv-glow" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* —— 底栏出击 —— */}
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
            <p className="chub__dock-label">
              {focusRec ? "推荐出击" : "关卡情报"}
              <span>
                第 {focusStage}/{TOTAL_LEVELS} 关
              </span>
            </p>
            <p className="chub__dock-title">
              {focus?.name ?? "—"}
              {focusBoss && focusHard && (
                <em className="chub__tag chub__tag--hard-boss">紫 Boss</em>
              )}
              {focusBoss && !focusHard && (
                <em className="chub__tag chub__tag--boss">Boss</em>
              )}
              {focusHard && !focusBoss && (
                <em className="chub__tag chub__tag--hard">高难</em>
              )}
              {focusDone && <em className="chub__tag chub__tag--done">已通关</em>}
              {focus?.tutorial && <em className="chub__tag chub__tag--tut">教程</em>}
            </p>
            <div className="chub__dock-stars">
              <StarRow n={focusStars} />
              <span className="chub__dock-stars-lab">
                {focusDone
                  ? focusStars >= 3
                    ? "本关满星"
                    : `历史最佳 ${focusStars}★ · 可再战刷星`
                  : "通关 1★ · 能量充沛 · 限时达成"}
              </span>
            </div>
            <p className="chub__dock-desc">
              {focusUnlocked
                ? focus?.description
                : "打通前一关后，这里才会向你开放。"}
            </p>
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
                回到下一步
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
              {ctaLabel({
                unlocked: focusUnlocked,
                done: focusDone,
                isBoss: focusBoss,
                isHard: focusHard,
                isRec: focusRec,
                neverPlayed,
              })}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
