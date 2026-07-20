/** 画布与关卡布局 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** 阵营色：绿=玩家，红=AI，灰=中立（不自增、不可操作） */
export const COLOR_PLAYER = 0x54c92b;
export const COLOR_ENEMY = 0xd94343;
export const COLOR_NEUTRAL = 0x737d88;

/** 能量上限 / 显示阈值 */
export const MAX_ENERGY = 99;
export const LARGE_CELL_THRESHOLD = 50;
export const ENERGY_EPS = 1e-6;

/**
 * 自增分档（能量/秒）：按当前体量落在哪一档，用该档固定速率（档内无复利）。
 *   v < 20      → 一档
 *   20 ≤ v < 60 → 二档
 *   60 ≤ v < 99 → 三档
 *   v ≥ 99      → 顶满，速率用于 overflow 累计
 * 中立色（COLOR_NEUTRAL）不参与自增。
 */
export const GROWTH_TIER_1_ENERGY = 20;
export const GROWTH_TIER_2_ENERGY = 60;
export const GROWTH_TIER_3_ENERGY = 99;
/** 一档（瘦）：略快，便于进可操作区间 */
export const GROWTH_RATE_TIER_1 = 0.9;
/** 二档（常态对局带） */
export const GROWTH_RATE_TIER_2 = 0.7;
/** 三档（肥）：略慢，抑制无脑堆满 */
export const GROWTH_RATE_TIER_3 = 0.45;
/** 顶满时 overflow 累计速率 */
export const GROWTH_RATE_CAPPED = GROWTH_RATE_TIER_3;
/** @deprecated 用 growthRateForValue；别名取二档 */
export const GROWTH_RATE = GROWTH_RATE_TIER_2;
/** @deprecated */
export const GROWTH_BASE = GROWTH_RATE_TIER_2;
/** @deprecated 无连续体量加速 */
export const GROWTH_PER_UNIT = 0;
/** @deprecated */
export const GROWTH_MIN = GROWTH_RATE_TIER_1;

/**
 * @param {number} value
 * @returns {1 | 2 | 3 | 4} 成长档：1/2/3 对应 20 前 / 20–60 / 60–99；4 = 顶满
 */
export function growthTier(value) {
  const v = Number(value) || 0;
  if (v + ENERGY_EPS < GROWTH_TIER_1_ENERGY) return 1;
  if (v + ENERGY_EPS < GROWTH_TIER_2_ENERGY) return 2;
  if (v + ENERGY_EPS < GROWTH_TIER_3_ENERGY) return 3;
  return 4;
}

/**
 * @param {number} value
 * @returns {number} 能量/秒
 */
export function growthRateForValue(value) {
  const tier = growthTier(value);
  if (tier === 1) return GROWTH_RATE_TIER_1;
  if (tier === 2) return GROWTH_RATE_TIER_2;
  if (tier === 3) return GROWTH_RATE_TIER_3;
  return GROWTH_RATE_CAPPED;
}

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
/**
 * 同色输送：己方「大核」比源至少高出该值时，小巢可进入 supply 意图喂养。
 * 与玩家后排→前排输送同一套同色治疗规则。
 */
export const AI_SUPPLY_ALLY_LEAD = 4;
/** 大核距满额至少还有这么多空间才值得继续喂 */
export const AI_SUPPLY_ROOM_MIN = 4;

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
 * 触顶溢出粒子（独立于 Bullet，不参与弹-弹对撞）
 * 视觉：光晕 + 彗星拖尾，比常规弹更抢眼
 */
export const OVERFLOW_SPEED = 210;
export const OVERFLOW_PARTICLE_R = 3.6;
/** 无瞄准：短距泄压 */
export const OVERFLOW_FREE_MAX_DIST = 160;
/** 有瞄准：可飞较远直至命中/耗尽 */
export const OVERFLOW_AIMED_MAX_DIST = 720;
/** 每帧生成上限 */
export const OVERFLOW_SPAWN_FREE = 3;
export const OVERFLOW_SPAWN_AIMED = 6;

/**
 * 攻速随体型（仅 value > MIN_FIRE_ENERGY 时开火）：
 *   rate = (value - MIN_FIRE_ENERGY) * FIRE_RATE_PER_UNIT（发/秒）
 *   interval = max(FIRE_INTERVAL_MIN_MS, 1000 / rate)
 * 建链/换目标不得绕过该间隔（见 combat.cooldown）。
 * 注：成长是分档的；射速仍连续，与成长档独立。
 */
export const FIRE_RATE_PER_UNIT = 0.055;
/** 最快射速下限 */
export const FIRE_INTERVAL_MIN_MS = 110;

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
