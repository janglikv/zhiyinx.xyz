/**
 * DEV 调试运行时设置（不落盘；刷新回 1×）
 */

/** @type {readonly number[]} */
export const DEBUG_TIME_SCALES = [0.5, 1, 2, 4, 8];

let timeScale = 1;

/** @returns {number} */
export function getDebugTimeScale() {
  return timeScale;
}

/**
 * @param {number} scale
 * @returns {number} 实际生效的倍率
 */
export function setDebugTimeScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n) || n <= 0) {
    timeScale = 1;
    return timeScale;
  }
  // 夹在常用档附近，避免误触极端值
  timeScale = Math.min(16, Math.max(0.25, n));
  return timeScale;
}

/**
 * @param {number} scale
 * @returns {string}
 */
export function formatTimeScaleLabel(scale) {
  if (scale === 0.5) return "0.5×";
  if (Number.isInteger(scale)) return `${scale}×`;
  return `${scale}×`;
}
