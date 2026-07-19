import { useCallback, useState } from "react";
import {
  getClearedIndices,
  getMaxUnlockedIndex,
  getRecommendedLevelIndex,
  getStarsArray,
  getTotalStars,
  markLevelCleared,
  resetAllProgress,
  unlockAllLevels,
} from "../hub";

/**
 * 选关进度：读取 / 刷新 / 通关标记 / 重置 / 全解锁
 */
export function useCellProgress() {
  const [maxUnlocked, setMaxUnlocked] = useState(() => getMaxUnlockedIndex());
  const [cleared, setCleared] = useState(() => getClearedIndices());
  const [stars, setStars] = useState(() => getStarsArray());
  const [recommendedIndex, setRecommendedIndex] = useState(() =>
    getRecommendedLevelIndex(),
  );

  const refresh = useCallback(() => {
    setMaxUnlocked(getMaxUnlockedIndex());
    setCleared(getClearedIndices());
    setStars(getStarsArray());
    setRecommendedIndex(getRecommendedLevelIndex());
  }, []);

  /**
   * @param {number} index
   * @param {number} [earnedStars=1]
   * @returns {{ bestStars: number }}
   */
  const clearLevel = useCallback(
    (index, earnedStars = 1) => {
      const result = markLevelCleared(index, earnedStars);
      refresh();
      return { bestStars: result.bestStars };
    },
    [refresh],
  );

  const resetAll = useCallback(() => {
    resetAllProgress();
    refresh();
  }, [refresh]);

  const unlockAll = useCallback(() => {
    unlockAllLevels();
    refresh();
  }, [refresh]);

  return {
    maxUnlocked,
    cleared,
    stars,
    totalStars: stars.reduce((a, b) => a + (b || 0), 0),
    recommendedIndex,
    refresh,
    clearLevel,
    resetAll,
    unlockAll,
    getTotalStars,
  };
}
