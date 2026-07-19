import {
  LEVELS,
  LEVELS_PER_CHAPTER,
  TOTAL_CHAPTERS,
  CHAPTER_UNLOCK_STARS,
  stageInChapter,
  isHardStage,
  chapterIndexFromLevelIndex,
} from "../levels";

const KEY_MAX_UNLOCKED = "cell_game_max_unlocked";
const KEY_CLEARED = "cell_game_cleared";
const KEY_LAST_LEVEL = "cell_game_level";
/** 每关历史最高星 0–3，逗号分隔，长度与 LEVELS 对齐 */
const KEY_STARS = "cell_game_stars";

/**
 * 已解锁的最高关卡下标（含）——仅用于同章线性推进兼容。
 * 章节门槛以星数为准，见 {@link isLevelUnlocked}。
 * @returns {number}
 */
export function getMaxUnlockedIndex() {
  const raw = localStorage.getItem(KEY_MAX_UNLOCKED);
  const n = parseInt(raw ?? "0", 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, LEVELS.length - 1);
}

/**
 * 读取每关最高星（已通关但无星数据时按 1★ 迁移）。
 * @returns {number[]}
 */
export function getStarsArray() {
  /** @type {number[]} */
  const stars = new Array(LEVELS.length).fill(0);
  const raw = localStorage.getItem(KEY_STARS);
  if (raw) {
    const parts = raw.split(",");
    for (let i = 0; i < LEVELS.length; i += 1) {
      const n = parseInt(parts[i] ?? "0", 10);
      if (!Number.isNaN(n) && n > 0) {
        stars[i] = Math.min(3, Math.max(0, n));
      }
    }
  }

  // 旧存档：仅有 cleared → 至少 1★
  const cleared = getClearedIndices();
  for (const idx of cleared) {
    if (stars[idx] < 1) stars[idx] = 1;
  }

  return stars;
}

/**
 * @param {number} index
 * @returns {number} 0–3
 */
export function getLevelStars(index) {
  if (index < 0 || index >= LEVELS.length) return 0;
  return getStarsArray()[index] || 0;
}

/**
 * @param {number[]} stars
 */
function persistStars(stars) {
  localStorage.setItem(
    KEY_STARS,
    stars.map((s) => String(Math.min(3, Math.max(0, s | 0)))).join(","),
  );
}

/**
 * 本章累计星（全部关，含高难）。
 * @param {number} chapterIndex 0-based
 * @returns {number}
 */
export function getChapterStars(chapterIndex) {
  const stars = getStarsArray();
  const start = chapterIndex * LEVELS_PER_CHAPTER;
  let sum = 0;
  for (let i = 0; i < LEVELS_PER_CHAPTER; i += 1) {
    const idx = start + i;
    if (idx >= LEVELS.length) break;
    sum += stars[idx] || 0;
  }
  return sum;
}

/**
 * 全局总星
 * @returns {number}
 */
export function getTotalStars() {
  return getStarsArray().reduce((a, b) => a + (b || 0), 0);
}

/**
 * 本章理论满星
 * @returns {number}
 */
export function getChapterMaxStars() {
  return LEVELS_PER_CHAPTER * 3;
}

/**
 * 章节是否已对玩家开放（第 1 章始终开放；其后看前一章累计星）。
 * @param {number} chapterIndex 0-based
 */
export function isChapterUnlocked(chapterIndex) {
  if (chapterIndex <= 0) return true;
  if (chapterIndex >= TOTAL_CHAPTERS) return false;
  if (getChapterStars(chapterIndex - 1) >= CHAPTER_UNLOCK_STARS) return true;
  // 兼容旧存档：线性已打进该章
  return getMaxUnlockedIndex() >= chapterIndex * LEVELS_PER_CHAPTER;
}

/**
 * @returns {Set<number>}
 */
export function getClearedIndices() {
  const raw = localStorage.getItem(KEY_CLEARED);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n < LEVELS.length),
  );
}

/**
 * @param {number} index
 * @returns {boolean}
 */
export function isLevelCleared(index) {
  return getClearedIndices().has(index);
}

/**
 * 关卡是否可进入：
 * - 章节须已解锁（前章 ≥ CHAPTER_UNLOCK_STARS）
 * - 章内第 1 关：章节开放即可
 * - 其余：前一关已通关，或历史 maxUnlocked 覆盖（同章推进）
 * @param {number} index
 * @returns {boolean}
 */
export function isLevelUnlocked(index) {
  if (index < 0 || index >= LEVELS.length) return false;
  if (index === 0) return true;

  const ch = chapterIndexFromLevelIndex(index);
  if (!isChapterUnlocked(ch)) return false;

  const stage = stageInChapter(index);
  if (stage === 1) return true;

  if (isLevelCleared(index - 1)) return true;
  return index <= getMaxUnlockedIndex();
}

/**
 * 通关后标记进度：记录已通关、最高星，并解锁同章下一关。
 * 本章累计星 ≥ CHAPTER_UNLOCK_STARS 时开放下一章节（不跨章批量解锁中间关）。
 * @param {number} clearedIndex
 * @param {number} [earnedStars=1] 本局获得星数 1–3（只升不降）
 * @returns {{ maxUnlocked: number, cleared: Set<number>, stars: number[], bestStars: number }}
 */
export function markLevelCleared(clearedIndex, earnedStars = 1) {
  const cleared = getClearedIndices();
  const stars = getStarsArray();
  const award = Math.min(3, Math.max(1, Math.floor(Number(earnedStars) || 1)));

  if (clearedIndex >= 0 && clearedIndex < LEVELS.length) {
    cleared.add(clearedIndex);
    localStorage.setItem(KEY_CLEARED, [...cleared].sort((a, b) => a - b).join(","));
    stars[clearedIndex] = Math.max(stars[clearedIndex] || 0, award);
    persistStars(stars);
  }

  let maxUnlocked = getMaxUnlockedIndex();
  const next = clearedIndex + 1;
  if (clearedIndex >= 0 && next < LEVELS.length) {
    const ch = chapterIndexFromLevelIndex(clearedIndex);
    const nextCh = chapterIndexFromLevelIndex(next);
    if (nextCh === ch) {
      // 同章：通关后开放下一关
      maxUnlocked = Math.max(maxUnlocked, next);
    } else if (getChapterStars(ch) >= CHAPTER_UNLOCK_STARS) {
      // 跨章：仅当星数达标才把水位推到下一章第 1 关
      maxUnlocked = Math.max(maxUnlocked, next);
    }
  } else if (clearedIndex === LEVELS.length - 1) {
    maxUnlocked = Math.max(maxUnlocked, LEVELS.length - 1);
  }

  // 下一章入口：由 isChapterUnlocked（前章星数）+ 章内 stage===1 判断，不在此抬高 maxUnlocked，
  // 避免跨章水位把中间未通关一并打开。

  localStorage.setItem(KEY_MAX_UNLOCKED, String(maxUnlocked));

  return {
    maxUnlocked,
    cleared,
    stars,
    bestStars: clearedIndex >= 0 ? stars[clearedIndex] || 0 : 0,
  };
}

/**
 * @returns {number}
 */
export function getLastLevelIndex() {
  const parsed = parseInt(localStorage.getItem(KEY_LAST_LEVEL) ?? "0", 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed >= LEVELS.length) return 0;
  return parsed;
}

/**
 * @param {number} index
 */
export function setLastLevelIndex(index) {
  if (index < 0 || index >= LEVELS.length) return;
  localStorage.setItem(KEY_LAST_LEVEL, String(index));
}

/**
 * 推荐进入的关卡：优先主线未通关，其次未满星主线，再次高难。
 * @returns {number}
 */
export function getRecommendedLevelIndex() {
  const cleared = getClearedIndices();

  // 1) 主线未通关（已解锁）
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (!isLevelUnlocked(i) || cleared.has(i)) continue;
    if (!isHardStage(stageInChapter(i))) return i;
  }
  // 2) 主线未满星
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (!isLevelUnlocked(i)) continue;
    if (isHardStage(stageInChapter(i))) continue;
    if ((getLevelStars(i) || 0) < 3) return i;
  }
  // 3) 高难未通关
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (!isLevelUnlocked(i) || cleared.has(i)) continue;
    return i;
  }

  const last = getLastLevelIndex();
  return isLevelUnlocked(last) ? last : 0;
}

/** 清空本地进度（解锁 / 通关 / 星 / 上次关卡） */
export function resetAllProgress() {
  localStorage.removeItem(KEY_MAX_UNLOCKED);
  localStorage.removeItem(KEY_CLEARED);
  localStorage.removeItem(KEY_LAST_LEVEL);
  localStorage.removeItem(KEY_STARS);
}

/** 解锁并标记全部关卡已通关（满星） */
export function unlockAllLevels() {
  localStorage.setItem(KEY_MAX_UNLOCKED, String(LEVELS.length - 1));
  localStorage.setItem(
    KEY_CLEARED,
    LEVELS.map((_, idx) => idx).join(","),
  );
  localStorage.setItem(KEY_STARS, LEVELS.map(() => "3").join(","));
}
