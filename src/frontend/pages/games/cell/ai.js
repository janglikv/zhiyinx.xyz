import {
  ENERGY_EPS,
  FIRE_COST,
  COLOR_ENEMY,
  AI_SEED,
  AI_THINK_MIN_MS,
  AI_THINK_MAX_MS,
  AI_CHARGE_COST_MULT,
  AI_PRESS_COST_MULT,
  AI_HOLD_TARGET_MS,
} from "./constants";

/** @typedef {'charge' | 'probe' | 'press'} AiIntent */

/**
 * 可复现伪随机（mulberry32）。同 seed 同决策序列，便于调关与排错。
 * @param {number} seed
 */
function createRng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 */
function randRange(min, max, rng) {
  return min + (max - min) * rng();
}

/**
 * 敌人 AI：状态机意图 + 可控抖动，不硬编码时间轴。
 * - 仅操作 COLOR_ENEMY 细胞（染色后自动接管/放弃）
 * - 中立不作为己方；可攻击玩家或中立
 * - 开火走 combat 连发，与玩家同一套规则
 *
 * @param {object} options
 * @param {import("./cell").Cell[]} options.cells
 * @param {ReturnType<import("./combat").createCombat>} options.combat
 * @param {number} [options.seed]
 */
export function createAI({ cells, combat, seed = AI_SEED }) {
  const rng = createRng(seed);

  /**
   * @type {WeakMap<import("./cell").Cell, {
   *   intent: AiIntent,
   *   thinkIn: number,
   *   holdTargetUntil: number,
   *   preferred: import("./cell").Cell | null,
   * }>}
   */
  const mind = new WeakMap();
  let timeMs = 0;

  function ensureMind(cell) {
    let m = mind.get(cell);
    if (!m) {
      m = {
        intent: "charge",
        thinkIn: randRange(AI_THINK_MIN_MS, AI_THINK_MAX_MS, rng),
        holdTargetUntil: 0,
        preferred: null,
      };
      mind.set(cell, m);
    }
    return m;
  }

  /**
   * 目标评分：越大越优先。
   * 中立偏「扩张」；玩家偏「威胁 / 弱点」。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @param {AiIntent} intent
   */
  function scoreTarget(source, target, intent) {
    if (!target || target === source) return -Infinity;
    if (target.color === COLOR_ENEMY) return -Infinity;

    const dx = target.container.x - source.container.x;
    const dy = target.container.y - source.container.y;
    const dist = Math.hypot(dx, dy) || 1;
    // 近距更优（伤害也更高）
    const near = 1 / (1 + dist / 220);

    if (target.isNeutral()) {
      // 扩张：空/弱中立优先
      const weak = 1 / (1 + target.value * 0.12);
      const expand = 2.2 * weak * near;
      return intent === "probe" ? expand * 1.35 : expand;
    }

    if (target.isPlayer()) {
      const threat = 0.35 + target.value * 0.04;
      const weakSpot = 1 / (1 + target.value * 0.08);
      if (intent === "press") {
        // 压制：优先近处强敌，也肯打弱的收割
        return (threat * 0.55 + weakSpot * 0.9) * near * 1.4;
      }
      // 试探：更喜欢弱的玩家细胞
      return weakSpot * near * 1.15;
    }

    return -Infinity;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {AiIntent} intent
   * @returns {import("./cell").Cell | null}
   */
  function pickBestTarget(source, intent) {
    let best = null;
    let bestScore = -Infinity;
    for (const cell of cells) {
      const s = scoreTarget(source, cell, intent);
      // 小幅抖动，避免永远同一目标，但幅度不足以推翻明显优劣
      const jitter = (rng() - 0.5) * 0.12;
      const total = s + jitter;
      if (total > bestScore) {
        bestScore = total;
        best = cell;
      }
    }
    return bestScore > -Infinity ? best : null;
  }

  /**
   * 根据能量与场上局势选意图。
   * @param {import("./cell").Cell} source
   * @returns {AiIntent}
   */
  function chooseIntent(source) {
    const chargeNeed = FIRE_COST * AI_CHARGE_COST_MULT;
    const pressNeed = FIRE_COST * AI_PRESS_COST_MULT;

    if (source.value < chargeNeed - ENERGY_EPS) {
      return "charge";
    }

    let playerPower = 0;
    let playerCount = 0;
    let weakNeutral = null;
    for (const c of cells) {
      if (c.isPlayer()) {
        playerPower += c.value;
        playerCount += 1;
      } else if (c.isNeutral() && (weakNeutral == null || c.value < weakNeutral.value)) {
        weakNeutral = c;
      }
    }

    // 能量充裕且玩家存在 → 压制
    if (source.value >= pressNeed - ENERGY_EPS && playerCount > 0) {
      // 玩家明显更强时仍压制（拖死不如换节奏，由 hold 与 retarget 缓冲）
      if (playerPower >= source.value * 0.55 || source.value >= pressNeed * 1.2) {
        return "press";
      }
    }

    // 有弱中立可吃 → 扩张
    if (weakNeutral && weakNeutral.value <= source.value * 0.85 + 2) {
      return "probe";
    }

    if (playerCount > 0) {
      return source.value >= pressNeed * 0.85 ? "press" : "probe";
    }

    // 场上只剩中立：继续扩张
    return weakNeutral ? "probe" : "charge";
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {{ intent: AiIntent, holdTargetUntil: number, preferred: import("./cell").Cell | null }} m
   */
  function applyIntent(source, m) {
    if (m.intent === "charge") {
      if (combat.fireLinks.has(source)) {
        combat.stopFireLink(source);
      }
      m.preferred = null;
      return;
    }

    const holding =
      m.preferred
      && m.preferred.color !== COLOR_ENEMY
      && timeMs < m.holdTargetUntil
      && combat.canFireLink(source, m.preferred);

    const target = holding ? m.preferred : pickBestTarget(source, m.intent);
    if (!target || !combat.canFireLink(source, target)) {
      if (combat.fireLinks.has(source)) combat.stopFireLink(source);
      m.preferred = null;
      return;
    }

    const current = combat.fireLinks.get(source);
    if (current && current.target === target) {
      m.preferred = target;
      return;
    }

    combat.startFireLink(source, target);
    m.preferred = target;
    m.holdTargetUntil = timeMs + AI_HOLD_TARGET_MS * (0.85 + rng() * 0.35);
  }

  /**
   * 每帧调用。
   * @param {number} dt
   */
  function update(dt) {
    timeMs += dt;

    for (const cell of cells) {
      if (!cell.isEnemy()) {
        // 被染色后断开 AI 连线状态由 combat 色校验处理；清理思维即可
        continue;
      }

      const m = ensureMind(cell);
      m.thinkIn -= dt;
      if (m.thinkIn > 0) {
        // 非思考帧：若当前目标已变色为己方，尽快松手
        const link = combat.fireLinks.get(cell);
        if (link && link.target.color === COLOR_ENEMY) {
          combat.stopFireLink(cell);
          m.preferred = null;
        }
        continue;
      }

      m.thinkIn = randRange(AI_THINK_MIN_MS, AI_THINK_MAX_MS, rng);
      m.intent = chooseIntent(cell);
      applyIntent(cell, m);
    }
  }

  return { update };
}
