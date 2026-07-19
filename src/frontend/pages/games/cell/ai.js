import {
  ENERGY_EPS,
  FIRE_COST,
  MAX_ENERGY,
  MIN_FIRE_ENERGY,
  COLOR_ENEMY,
  AI_SEED,
  AI_THINK_MIN_MS,
  AI_THINK_MAX_MS,
  AI_CHARGE_COST_MULT,
  AI_PRESS_COST_MULT,
  AI_HOLD_TARGET_MS,
  AI_RECOVERY_THRESHOLD,
  AI_SUPPLY_ALLY_LEAD,
  AI_SUPPLY_ROOM_MIN,
} from "./constants";

/** @typedef {'charge' | 'probe' | 'press' | 'supply'} AiIntent */

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
 * - 小巢可对更大己方巢「同色输送」（supply），支撑断流/补给线玩法
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
   * 场上最强红巢（可作补给目标）。
   * @param {import("./cell").Cell} source
   * @returns {import("./cell").Cell | null}
   */
  function strongestAlly(source) {
    let best = null;
    for (const c of cells) {
      if (!c.isEnemy() || c === source) continue;
      if (!best || c.value > best.value) best = c;
    }
    return best;
  }

  /**
   * 源是否适合给某友军输送：友军明显更壮，且未顶满。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} ally
   */
  function canSupplyAlly(source, ally) {
    if (!ally || !ally.isEnemy() || ally === source) return false;
    if (source.value < MIN_FIRE_ENERGY + ENERGY_EPS) return false;
    if (source.value < AI_RECOVERY_THRESHOLD - ENERGY_EPS) return false;
    const room = MAX_ENERGY - ally.value;
    if (room < AI_SUPPLY_ROOM_MIN - ENERGY_EPS) return false;
    // 只喂「更大核」：前哨/中继 → 母巢；避免母巢倒灌小兵
    if (ally.value + ENERGY_EPS < source.value + AI_SUPPLY_ALLY_LEAD) return false;
    return true;
  }

  /**
   * 目标评分：越大越优先。
   * 中立偏「扩张」；玩家偏「威胁 / 弱点」；supply 时评友军。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @param {AiIntent} intent
   */
  function scoreTarget(source, target, intent) {
    if (!target || target === source) return -Infinity;

    const dx = target.container.x - source.container.x;
    const dy = target.container.y - source.container.y;
    const dist = Math.hypot(dx, dy) || 1;
    // 近距更优（伤害/治疗效率也更高）
    const near = 1 / (1 + dist / 220);

    if (intent === "supply") {
      if (target.color !== COLOR_ENEMY) return -Infinity;
      if (!canSupplyAlly(source, target)) return -Infinity;
      const room = MAX_ENERGY - target.value;
      // 优先喂更壮的核、还有空间、距离不离谱
      return target.value * 0.08 + room * 0.12 + near * 2.5;
    }

    if (target.color === COLOR_ENEMY) return -Infinity;

    if (target.isNeutral()) {
      // 扩张：空/弱中立优先，加入极高的固定值偏置，以确保有中立细胞时必定集火抢点占领
      const weak = 1 / (1 + target.value * 0.12);
      const expand = 12.0 + 3.0 * weak * near;
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
   * preferred 是否仍适应当前意图（用于 hold，避免乱切目标）。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} preferred
   * @param {AiIntent} intent
   */
  function preferredStillValid(source, preferred, intent) {
    if (!preferred || !combat.canFireLink(source, preferred)) return false;
    if (intent === "supply") {
      return canSupplyAlly(source, preferred);
    }
    // 进攻意图只锁玩家/中立
    return preferred.isPlayer() || preferred.isNeutral();
  }

  /**
   * 根据能量与场上局势选意图。
   * @param {import("./cell").Cell} source
   * @returns {AiIntent}
   */
  function chooseIntent(source) {
    const pressNeed = FIRE_COST * AI_PRESS_COST_MULT;
    const chargeNeed = FIRE_COST * AI_CHARGE_COST_MULT;

    // 过瘦：强制休养
    if (source.value < AI_RECOVERY_THRESHOLD - ENERGY_EPS) {
      return "charge";
    }
    if (source.value < chargeNeed - ENERGY_EPS && source.value < MIN_FIRE_ENERGY + 2) {
      return "charge";
    }

    let playerPower = 0;
    let playerCount = 0;
    let weakNeutral = null;
    let allyCount = 0;
    for (const c of cells) {
      if (c.isPlayer()) {
        playerPower += c.value;
        playerCount += 1;
      } else if (c.isNeutral() && (weakNeutral == null || c.value < weakNeutral.value)) {
        weakNeutral = c;
      } else if (c.isEnemy() && c !== source) {
        allyCount += 1;
      }
    }

    const feedTarget = strongestAlly(source);
    const supplyOk = allyCount > 0 && canSupplyAlly(source, feedTarget);

    // 有弱中立可吃 → 扩张优先（争点仍压过喂养，避免开局全员只灌母巢）
    if (weakNeutral && weakNeutral.value <= source.value * 0.85 + 2) {
      return "probe";
    }

    // 小巢/中继：无争点时优先给大核输血（断流关的核心行为）
    // 大核自身（场上最壮）不会 supply
    if (supplyOk) {
      // 能量刚够开火时更倾向输送；很肥时偶发转压制，避免永远不输出
      if (source.value < pressNeed * 1.35 || rng() < 0.72) {
        return "supply";
      }
    }

    // 能量充裕且玩家存在 → 压制
    if (source.value >= pressNeed - ENERGY_EPS && playerCount > 0) {
      if (playerPower >= source.value * 0.55 || source.value >= pressNeed * 1.2) {
        return "press";
      }
    }

    if (playerCount > 0) {
      return source.value >= pressNeed * 0.85 ? "press" : "probe";
    }

    // 场上只剩中立：继续扩张；否则能喂就喂
    if (weakNeutral) return "probe";
    if (supplyOk) return "supply";
    return "charge";
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
      preferredStillValid(source, m.preferred, m.intent)
      && timeMs < m.holdTargetUntil;

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
        continue;
      }

      m.thinkIn = randRange(AI_THINK_MIN_MS, AI_THINK_MAX_MS, rng);
      m.intent = chooseIntent(cell);
      applyIntent(cell, m);
    }
  }

  return { update };
}
