import { useEffect, useMemo, useState } from "react";
import {
  LEVELS,
  CHAPTERS,
  LEVELS_PER_CHAPTER,
  chapterIndexFromLevelIndex,
} from "../levels";
import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";
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

/**
 * 从 "第一章 · 第1关：初识" 抽出短标题。
 * @param {string} name
 */
function shortTitle(name) {
  const m = name.match(/[：:]\s*(.+)$/);
  return m ? m[1] : name;
}

/** 与游戏内阵营色一致（CSS） */
const HEX = {
  player: `#${COLOR_PLAYER.toString(16).padStart(6, "0")}`,
  enemy: `#${COLOR_ENEMY.toString(16).padStart(6, "0")}`,
  neutral: `#${COLOR_NEUTRAL.toString(16).padStart(6, "0")}`,
};

/**
 * 关卡选择：5 章 × 5 关
 * @param {{
 *   maxUnlocked: number,
 *   cleared: Set<number>,
 *   recommendedIndex: number,
 *   onEnterLevel: (index: number) => void,
 *   tools?: import("react").ReactNode,
 * }} props
 */
export default function LevelSelect({
  maxUnlocked,
  cleared,
  recommendedIndex,
  onEnterLevel,
  tools,
}) {
  const unlockedCount = maxUnlocked + 1;
  const clearedCount = cleared.size;

  const initialChapter = chapterIndexFromLevelIndex(recommendedIndex);
  const [activeChapter, setActiveChapter] = useState(initialChapter);

  useEffect(() => {
    setActiveChapter(chapterIndexFromLevelIndex(recommendedIndex));
  }, [recommendedIndex]);

  const chapter = CHAPTERS[activeChapter] ?? CHAPTERS[0];
  const hubBg = CHAPTER_BGS[chapter.background] ?? bg1;

  const chapterLevels = useMemo(() => {
    const start = activeChapter * LEVELS_PER_CHAPTER;
    return LEVELS.slice(start, start + LEVELS_PER_CHAPTER).map((lvl, i) => ({
      lvl,
      index: start + i,
    }));
  }, [activeChapter]);

  /** 某章是否至少解锁了第 1 关 */
  function isChapterReachable(chapterIdx) {
    const first = chapterIdx * LEVELS_PER_CHAPTER;
    return first <= maxUnlocked;
  }

  return (
    <div className="cell-hub">
      <div
        className="cell-hub__bg"
        style={{ backgroundImage: `url(${hubBg})` }}
        aria-hidden
      />
      <div className="cell-hub__vignette" aria-hidden />
      <div className="cell-hub__cells-deco" aria-hidden>
        <span className="cell-hub__orb cell-hub__orb--p" style={{ "--c": HEX.player }} />
        <span className="cell-hub__orb cell-hub__orb--n" style={{ "--c": HEX.neutral }} />
        <span className="cell-hub__orb cell-hub__orb--e" style={{ "--c": HEX.enemy }} />
      </div>

      <div className="cell-hub__ui">
        <header className="cell-hub__top">
          <div className="cell-hub__brand">
            <span className="cell-hub__brand-icon" aria-hidden>
              🦠
            </span>
            <div>
              <p className="cell-hub__eyebrow">CELL DIVISION · 5 CHAPTERS · 25 LEVELS</p>
              <h2 className="cell-hub__title">选择关卡</h2>
            </div>
          </div>
          <div className="cell-hub__top-right">
            <div className="cell-hub__stats">
              <div className="cell-hub__stat">
                <span className="cell-hub__stat-val">
                  {unlockedCount}/{LEVELS.length}
                </span>
                <span className="cell-hub__stat-lab">已解锁</span>
              </div>
              <div className="cell-hub__stat-divider" />
              <div className="cell-hub__stat">
                <span className="cell-hub__stat-val">{clearedCount}</span>
                <span className="cell-hub__stat-lab">已通关</span>
              </div>
            </div>
            {tools ? <div className="cell-hub__tools">{tools}</div> : null}
          </div>
        </header>

        <nav className="cell-hub__chapters" aria-label="章节">
          {CHAPTERS.map((ch, idx) => {
            const reachable = isChapterReachable(idx);
            const start = idx * LEVELS_PER_CHAPTER;
            const chapterCleared = Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) =>
              cleared.has(start + i),
            ).every(Boolean);
            const active = idx === activeChapter;
            return (
              <button
                key={ch.id}
                type="button"
                className={[
                  "cell-hub__chapter",
                  active ? "cell-hub__chapter--active" : "",
                  !reachable ? "cell-hub__chapter--locked" : "",
                  chapterCleared ? "cell-hub__chapter--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!reachable}
                {...uiSfx("confirm", () => {
                  if (!reachable) return;
                  setActiveChapter(idx);
                })}
                title={reachable ? ch.description : "通关前一章后解锁"}
              >
                <span className="cell-hub__chapter-idx">{ch.title}</span>
                <span className="cell-hub__chapter-name">{ch.name}</span>
                {!reachable && (
                  <span className="cell-hub__chapter-lock" aria-hidden>
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="cell-hub__chapter-banner">
          <span className="cell-hub__chapter-banner-title">
            {chapter.title} · {chapter.name}
          </span>
          <span className="cell-hub__chapter-banner-desc">{chapter.description}</span>
        </div>

        <div className="cell-hub__map" role="list">
          {chapterLevels.map(({ lvl, index }, slot) => {
            const unlocked = index <= maxUnlocked;
            const done = cleared.has(index);
            const recommended = unlocked && index === recommendedIndex;
            const nodeClass = [
              "cell-hub__node",
              unlocked ? "cell-hub__node--open" : "cell-hub__node--locked",
              done ? "cell-hub__node--cleared" : "",
              recommended ? "cell-hub__node--rec" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={lvl.id} className="cell-hub__slot" role="listitem">
                {slot > 0 && (
                  <div
                    className={
                      index <= maxUnlocked
                        ? "cell-hub__link cell-hub__link--on"
                        : "cell-hub__link"
                    }
                    aria-hidden
                  />
                )}
                <button
                  type="button"
                  className={nodeClass}
                  disabled={!unlocked}
                  {...uiSfx("confirm", () => {
                    if (!unlocked) return;
                    onEnterLevel(index);
                  })}
                  title={unlocked ? lvl.description : "通关前一关后解锁"}
                >
                  <span className="cell-hub__node-ring" aria-hidden />
                  <span className="cell-hub__node-core">
                    <span className="cell-hub__node-num">{index + 1}</span>
                    {!unlocked && (
                      <span className="cell-hub__node-lock" aria-hidden>
                        🔒
                      </span>
                    )}
                    {done && (
                      <span className="cell-hub__node-check" aria-hidden>
                        ✓
                      </span>
                    )}
                  </span>
                  {recommended && (
                    <span className="cell-hub__node-pulse" aria-hidden />
                  )}
                </button>
                <div className="cell-hub__node-meta">
                  <span className="cell-hub__node-name">{shortTitle(lvl.name)}</span>
                  <span
                    className={
                      done
                        ? "cell-hub__node-state cell-hub__node-state--done"
                        : recommended
                          ? "cell-hub__node-state cell-hub__node-state--rec"
                          : unlocked
                            ? "cell-hub__node-state"
                            : "cell-hub__node-state cell-hub__node-state--lock"
                    }
                  >
                    {done ? "已通关" : recommended ? "推荐" : unlocked ? "可进入" : "锁定"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cell-hub__detail">
          {(() => {
            const focus = LEVELS[recommendedIndex] ?? LEVELS[0];
            const unlocked = recommendedIndex <= maxUnlocked;
            const focusCh = CHAPTERS[chapterIndexFromLevelIndex(recommendedIndex)];
            return (
              <>
                <div className="cell-hub__detail-text">
                  <p className="cell-hub__detail-label">
                    当前目标
                    {focusCh ? ` · ${focusCh.title}` : ""}
                  </p>
                  <p className="cell-hub__detail-name">{focus.name}</p>
                  <p className="cell-hub__detail-desc">
                    {unlocked
                      ? focus.description
                      : "完成前一关以解锁此区域。"}
                  </p>
                </div>
                <button
                  type="button"
                  className="cell-hub__play"
                  disabled={!unlocked}
                  {...uiSfx("confirm", () => {
                    if (!unlocked) return;
                    // 切到推荐关所在章再进入
                    setActiveChapter(chapterIndexFromLevelIndex(recommendedIndex));
                    onEnterLevel(recommendedIndex);
                  })}
                >
                  {cleared.has(recommendedIndex) ? "再次出击" : "开始出击"}
                </button>
              </>
            );
          })()}
        </div>

        <p className="cell-hub__ops">
          <span style={{ color: HEX.player }}>● 己方</span>
          <span style={{ color: HEX.enemy }}>● 敌方</span>
          <span style={{ color: HEX.neutral }}>● 中立</span>
          <span className="cell-hub__ops-sep" />
          拖拽连线发射 · 滑动切断射流 · 肃清全部敌方细胞
        </p>
      </div>
    </div>
  );
}
