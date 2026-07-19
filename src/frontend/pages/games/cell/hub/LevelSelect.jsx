import { useEffect, useMemo, useState } from "react";
import {
  LEVELS,
  CHAPTERS,
  LEVELS_PER_CHAPTER,
  TOTAL_CHAPTERS,
  CHAPTER_UNLOCK_STARS,
  chapterIndexFromLevelIndex,
} from "../levels";
import { isChapterUnlocked, isLevelUnlocked } from "./progress";
import { uiSfx } from "../audio";
import bg1 from "../backgrounds/level-1.webp";
import bg2 from "../backgrounds/level-2.webp";
import bg3 from "../backgrounds/level-3.webp";
import bg4 from "../backgrounds/level-4.webp";
import bg5 from "../backgrounds/level-5.webp";
import "./styles.css";

const CHAPTER_BGS = {
  "level-1": bg1,
  "level-2": bg2,
  "level-3": bg3,
  "level-4": bg4,
  "level-5": bg5,
};

const CHAPTER_TAGLINES = [
  `本章累计 ${CHAPTER_UNLOCK_STARS}★ 解锁下一章 · 紫关 13–17 · 18 终章 Boss。`,
  `本章累计 ${CHAPTER_UNLOCK_STARS}★ 解锁下一章 · 紫关 13–17 · 18 终章 Boss。`,
  `本章累计 ${CHAPTER_UNLOCK_STARS}★ 解锁下一章 · 紫关 13–17 · 18 终章 Boss。`,
  `本章累计 ${CHAPTER_UNLOCK_STARS}★ 解锁下一章 · 紫关 13–17 · 18 终章 Boss。`,
  `本章累计 ${CHAPTER_UNLOCK_STARS}★ 解锁最终内容 · 紫关 13–17 · 18 终章 Boss。`,
];

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
 * 选关大厅 — 全新布局：左章节轨 · 右关卡网格 · 底出击条
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

  const [activeChapter, setActiveChapter] = useState(
    chapterIndexFromLevelIndex(recommendedIndex),
  );
  const [selectedIndex, setSelectedIndex] = useState(recommendedIndex);
  const [bgTick, setBgTick] = useState(0);

  useEffect(() => {
    setActiveChapter(chapterIndexFromLevelIndex(recommendedIndex));
    setSelectedIndex(recommendedIndex);
  }, [recommendedIndex]);

  const chapter = CHAPTERS[activeChapter] ?? CHAPTERS[0];
  const hubBg = CHAPTER_BGS[chapter.background] ?? bg1;
  const tagline = CHAPTER_TAGLINES[activeChapter] ?? chapter.description;

  const chapterLevels = useMemo(() => {
    const start = activeChapter * LEVELS_PER_CHAPTER;
    return LEVELS.slice(start, start + LEVELS_PER_CHAPTER).map((lvl, i) => ({
      lvl,
      index: start + i,
      stage: i + 1,
    }));
  }, [activeChapter]);

  const chapterStats = useMemo(() => {
    const start = activeChapter * LEVELS_PER_CHAPTER;
    let done = 0;
    let starSum = 0;
    for (let i = 0; i < LEVELS_PER_CHAPTER; i++) {
      if (cleared.has(start + i)) done += 1;
      starSum += stars[start + i] || 0;
    }
    const starNeed = CHAPTER_UNLOCK_STARS;
    const starPct = Math.min(100, Math.round((starSum / starNeed) * 100));
    return {
      done,
      total: LEVELS_PER_CHAPTER,
      pct: Math.round((done / LEVELS_PER_CHAPTER) * 100),
      stars: starSum,
      starNeed,
      starPct,
      chapterOpen:
        activeChapter >= TOTAL_CHAPTERS - 1 || starSum >= starNeed,
    };
  }, [activeChapter, cleared, stars]);

  function isChapterReachable(chapterIdx) {
    return isChapterUnlocked(chapterIdx);
  }

  function selectChapter(idx) {
    if (!isChapterReachable(idx)) return;
    setActiveChapter(idx);
    setBgTick((t) => t + 1);
    const start = idx * LEVELS_PER_CHAPTER;
    const end = start + LEVELS_PER_CHAPTER - 1;
    if (recommendedIndex >= start && recommendedIndex <= end) {
      setSelectedIndex(recommendedIndex);
    } else {
      // 选本章第一个已解锁关，否则章首
      let pick = start;
      for (let i = start; i <= end; i += 1) {
        if (isLevelUnlocked(i)) {
          pick = i;
          break;
        }
      }
      setSelectedIndex(pick);
    }
  }

  function enterLevel(index) {
    if (!isLevelUnlocked(index)) return;
    setActiveChapter(chapterIndexFromLevelIndex(index));
    onEnterLevel(index);
  }

  const focus = LEVELS[selectedIndex] ?? LEVELS[0];
  const focusUnlocked = isLevelUnlocked(selectedIndex);
  const focusDone = cleared.has(selectedIndex);
  const focusStars = stars[selectedIndex] || 0;
  const focusBoss = Boolean(focus?.isBoss);
  const focusHard = Boolean(focus?.isHard);
  const focusRec = selectedIndex === recommendedIndex;
  const focusStage = (selectedIndex % LEVELS_PER_CHAPTER) + 1;
  const focusCh = CHAPTERS[chapterIndexFromLevelIndex(selectedIndex)];

  return (
    <div className="chub">
      <div
        key={bgTick}
        className="chub__bg"
        style={{ backgroundImage: `url(${hubBg})` }}
        aria-hidden
      />
      <div className="chub__shade" aria-hidden />
      <div className="chub__grid-fx" aria-hidden />

      <div className="chub__shell">
        {/* —— 顶栏 —— */}
        <header className="chub__bar">
          <div className="chub__brand">
            <span className="chub__brand-kicker">
              CELL · {TOTAL_CHAPTERS} CHAPTERS · {LEVELS.length} LEVELS
            </span>
            <h1 className="chub__brand-title">细胞分裂战</h1>
          </div>

          <div className="chub__progress" title={`完成度 ${progressPct}%`}>
            <div className="chub__progress-meta">
              <span>
                通关 <strong>{clearedCount}</strong>
              </span>
              <span className="chub__progress-sep" />
              <span>
                星 <strong>{totalStars}</strong>
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

        {/* —— 主体：左章节 + 右内容 —— */}
        <div className="chub__body">
          <nav className="chub__rail" aria-label="章节">
            {CHAPTERS.map((ch, idx) => {
              const reachable = isChapterReachable(idx);
              const start = idx * LEVELS_PER_CHAPTER;
              let done = 0;
              for (let i = 0; i < LEVELS_PER_CHAPTER; i++) {
                if (cleared.has(start + i)) done += 1;
              }
              const allDone = done === LEVELS_PER_CHAPTER;
              const active = idx === activeChapter;
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={[
                    "chub__rail-item",
                    active ? "chub__rail-item--on" : "",
                    !reachable ? "chub__rail-item--lock" : "",
                    allDone ? "chub__rail-item--done" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!reachable}
                  {...uiSfx("confirm", () => selectChapter(idx))}
                  title={
                    reachable
                      ? `${ch.description}（${done}/${LEVELS_PER_CHAPTER}）`
                      : "通关上一章节后解锁"
                  }
                >
                  <span className="chub__rail-no">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="chub__rail-text">
                    <span className="chub__rail-title">{ch.title}</span>
                    <span className="chub__rail-name">{ch.name}</span>
                  </span>
                  {!reachable ? (
                    <span className="chub__rail-mark" aria-hidden>
                      🔒
                    </span>
                  ) : allDone ? (
                    <span className="chub__rail-mark chub__rail-mark--ok" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="chub__rail-mini">
                      {done}/{LEVELS_PER_CHAPTER}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <section className="chub__main" aria-label={`${chapter.title}关卡`}>
            <div className="chub__chapter-head">
              <div>
                <p className="chub__chapter-kicker">
                  CHAPTER {String(activeChapter + 1).padStart(2, "0")}
                </p>
                <h2 className="chub__chapter-title">
                  {chapter.title}
                  <span className="chub__chapter-name">{chapter.name}</span>
                </h2>
                <p className="chub__chapter-tag">{tagline}</p>
              </div>
              <div className="chub__chapter-stat">
                <span className="chub__chapter-stat-val">
                  {chapterStats.stars}
                  <small>/{chapterStats.starNeed}★</small>
                </span>
                <span className="chub__chapter-stat-lab">
                  {chapterStats.chapterOpen
                    ? activeChapter >= TOTAL_CHAPTERS - 1
                      ? "本章星数"
                      : "已可解锁下章"
                    : "解锁下章进度"}
                </span>
                <div className="chub__chapter-stat-bar" aria-hidden>
                  <i style={{ width: `${chapterStats.starPct}%` }} />
                </div>
                <span className="chub__chapter-stat-sub">
                  通关 {chapterStats.done}/{chapterStats.total}
                </span>
              </div>
            </div>

            <div className="chub__levels" role="list">
              {chapterLevels.map(({ lvl, index, stage }) => {
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
              {focusCh ? ` · ${focusCh.title}` : ""}
              <span>
                章节内 {focusStage}/{LEVELS_PER_CHAPTER}
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
                  setActiveChapter(chapterIndexFromLevelIndex(recommendedIndex));
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
