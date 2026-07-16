/** 画布与关卡布局 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** 阵营色：绿=玩家，红=AI，灰=中立（不自增、不可操作） */
export const COLOR_PLAYER = 0x54c92b;
export const COLOR_ENEMY = 0xd94343;
export const COLOR_NEUTRAL = 0x737d88;

export const INITIAL_CELLS = [
  { x: 312, y: 270, value: 22, color: COLOR_PLAYER },
  { x: 480, y: 270, value: 0, color: COLOR_NEUTRAL },
  { x: 648, y: 270, value: 15, color: COLOR_ENEMY },
];

/** 能量上限 / 显示阈值 */
export const MAX_ENERGY = 99;
export const LARGE_CELL_THRESHOLD = 50;
export const ENERGY_EPS = 1e-6;

/**
 * 自增速率（能量/秒）：rate = max(GROWTH_MIN, GROWTH_BASE + value * GROWTH_PER_UNIT)
 * 例：0→0.35/s，15→0.68/s，50→2.1/s，80→3.3/s
 * 中立色（COLOR_NEUTRAL）不参与自增。
 */
export const GROWTH_BASE = 0.08;
export const GROWTH_PER_UNIT = 0.04;
export const GROWTH_MIN = 0.35;

/**
 * AI 决策（状态机 + 可控抖动）
 * think 间隔内做意图评估；开火仍走 combat 连发。
 */
export const AI_SEED = 1;
export const AI_THINK_MIN_MS = 280;
export const AI_THINK_MAX_MS = 520;
/** 低于此能量（相对开火成本）优先蓄能 */
export const AI_CHARGE_COST_MULT = 1.6;
/** AI 强制休养阈值：能量低于此值时停止连线开火，专心自增 */
export const AI_RECOVERY_THRESHOLD = 12;
/** 高于此能量可进入全力压制 */
export const AI_PRESS_COST_MULT = 3.2;
/** 同目标最短保持时间，避免抖动换目标 */
export const AI_HOLD_TARGET_MS = 900;

/** 半径线性动画速度（像素/秒） */
export const RADIUS_ANIM_SPEED = 36;

/**
 * 伤害 = FIRE_COST × 距离系数（贴脸=1，远距降至 MIN）
 * 绝对值 ≤ FIRE_COST < 1，无满额 1.0 伤害
 */
export const FIRE_COST = 0.78;
/** 低于此能量时攻速为 0，停止发射子弹（但保持连线） */
export const MIN_FIRE_ENERGY = 10;
export const DAMAGE_MAX_FACTOR = 1;
export const DAMAGE_FALLOFF_END = 320;
export const DAMAGE_MIN_FACTOR = 0.5;

/** 子弹 */
export const BULLET_SPEED = 160;
export const BULLET_RADIUS = 3.2;
export const BULLET_COLLIDE_DIST = BULLET_RADIUS * 2.2;

/**
 * 攻速随体型：射速 ≈ FIRE_RATE_BASE + value * FIRE_RATE_PER_UNIT（发/秒）
 * 例：1→~1.0s，15→~0.48s，50→~0.24s
 */
export const FIRE_RATE_BASE = 0.85;
export const FIRE_RATE_PER_UNIT = 0.055;
export const FIRE_INTERVAL_MIN_MS = 110;
export const FIRE_INTERVAL_MAX_MS = 1100;

/** 输入：拖拽阈值 / 切断采样 */
export const DRAG_THRESHOLD = 6;
export const CUT_SAMPLE_MIN = 2;
export const BLADE_POINT_LIFE_MS = 140;
export const BLADE_MAX_POINTS = 28;

/** 瞄准环相对细胞壁外扩；虚线样式 */
export const AIM_RING_PAD = 10;
export const BEAM_DASH = { dash: 3.2, gap: 2.6 };
export const BEAM_WIDTH = 1.35;

/**
 * @param {number} value
 * @returns {number} 冷却毫秒
 */
export function fireIntervalMs(value) {
  const v = value - MIN_FIRE_ENERGY;
  if (v <= ENERGY_EPS) {
    return Infinity;
  }
  const rate = v * FIRE_RATE_PER_UNIT;
  if (rate <= 1e-6) {
    return Infinity;
  }
  const ms = 1000 / rate;
  return Math.max(FIRE_INTERVAL_MIN_MS, ms);
}

/**
 * @param {number} traveledPx
 * @returns {number} 浮点伤害/治疗量
 */
export function damageFromDistance(traveledPx) {
  const d = Math.max(0, traveledPx);
  const maxF = Math.min(1, DAMAGE_MAX_FACTOR);
  const minF = Math.min(Math.max(0, DAMAGE_MIN_FACTOR), maxF);
  let factor;
  if (d >= DAMAGE_FALLOFF_END) {
    factor = minF;
  } else {
    const t = d / DAMAGE_FALLOFF_END;
    factor = maxF + (minF - maxF) * t;
  }
  return FIRE_COST * factor;
}
