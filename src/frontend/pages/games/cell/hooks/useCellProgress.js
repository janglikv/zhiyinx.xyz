import { useCallback, useState } from "react";
import {
  getClearedIndices,
  getMaxUnlockedIndex,
  getRecommendedLevelIndex,
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
  const [recommendedIndex, setRecommendedIndex] = useState(() =>
    getRecommendedLevelIndex(),
  );

  const refresh = useCallback(() => {
    setMaxUnlocked(getMaxUnlockedIndex());
    setCleared(getClearedIndices());
    setRecommendedIndex(getRecommendedLevelIndex());
  }, []);

  const clearLevel = useCallback(
    (index) => {
      markLevelCleared(index);
      refresh();
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
    recommendedIndex,
    refresh,
    clearLevel,
    resetAll,
    unlockAll,
  };
}
