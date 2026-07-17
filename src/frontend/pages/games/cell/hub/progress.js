import { LEVELS } from "../levels";

const KEY_MAX_UNLOCKED = "cell_game_max_unlocked";
const KEY_CLEARED = "cell_game_cleared";
const KEY_LAST_LEVEL = "cell_game_level";

/**
 * 已解锁的最高关卡下标（含）。第 1 关始终可用。
 * @returns {number}
 */
export function getMaxUnlockedIndex() {
  const raw = localStorage.getItem(KEY_MAX_UNLOCKED);
  const n = parseInt(raw ?? "0", 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, LEVELS.length - 1);
}

/**
 * @param {number} index
 * @returns {boolean}
 */
export function isLevelUnlocked(index) {
  return index >= 0 && index <= getMaxUnlockedIndex() && index < LEVELS.length;
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
 * 通关后标记进度：记录已通关，并解锁下一关。
 * @param {number} clearedIndex
 * @returns {{ maxUnlocked: number, cleared: Set<number> }}
 */
export function markLevelCleared(clearedIndex) {
  const cleared = getClearedIndices();
  if (clearedIndex >= 0 && clearedIndex < LEVELS.length) {
    cleared.add(clearedIndex);
    localStorage.setItem(KEY_CLEARED, [...cleared].sort((a, b) => a - b).join(","));
  }

  let maxUnlocked = getMaxUnlockedIndex();
  if (clearedIndex >= 0 && clearedIndex < LEVELS.length - 1) {
    maxUnlocked = Math.max(maxUnlocked, clearedIndex + 1);
  } else if (clearedIndex === LEVELS.length - 1) {
    maxUnlocked = Math.max(maxUnlocked, LEVELS.length - 1);
  }
  localStorage.setItem(KEY_MAX_UNLOCKED, String(maxUnlocked));

  return { maxUnlocked, cleared };
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
 * 推荐进入的关卡：优先未通关的最低已解锁，否则上次游玩。
 * @returns {number}
 */
export function getRecommendedLevelIndex() {
  const maxUnlocked = getMaxUnlockedIndex();
  const cleared = getClearedIndices();
  for (let i = 0; i <= maxUnlocked; i += 1) {
    if (!cleared.has(i)) return i;
  }
  const last = getLastLevelIndex();
  return isLevelUnlocked(last) ? last : 0;
}
