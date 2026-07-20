import {
  ENERGY_EPS,
  FIRE_COST,
  MAX_ENERGY,
  MIN_FIRE_ENERGY,
  COLOR_ENEMY,
  AI_SEED,
} from "./constants";
import { resolveLevelAi } from "./aiProfiles";

/** @typedef {'charge' | 'probe' | 'press' | 'supply'} AiIntent */
/** @typedef {import("./aiProfiles").AiBehavior} AiBehavior */
/** @typedef {import("./aiProfiles").AiEnemyRole} AiEnemyRole */

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
 * 按关卡行为配置驱动的敌人 AI（无内置通用战术）。
 * - 仅操作 COLOR_ENEMY
 * - 行为参数来自 resolveLevelAi(level.ai)
 * - 可选 enemyRoles：按红巢生成顺序绑定 feeder/core/…
 *
 * @param {object} options
 * @param {import("./cell").Cell[]} options.cells
 * @param {ReturnType<import("./combat").createCombat>} options.combat
 * @param {number} [options.seed]
 * @param {import("./aiProfiles").AiLevelConfig | string | null} [options.ai]
 * @param {AiBehavior} [options.behavior] 已解析行为（优先于 ai）
 * @param {AiEnemyRole[]} [options.enemyRoles]
 */
export function createAI({
  cells,
  combat,
  seed = AI_SEED,
  ai = null,
  behavior: behaviorIn = null,
  enemyRoles: rolesIn = null,
}) {
  const resolved = behaviorIn
    ? {
        behavior: behaviorIn,
        enemyRoles: Array.isArray(rolesIn) ? rolesIn : [],
      }
    : resolveLevelAi(ai);

  const B = resolved.behavior;
  const enemyRoles = resolved.enemyRoles;
  const rng = createRng(seed);

  /** @type {WeakMap<import("./cell").Cell, AiEnemyRole>} */
  const roleOf = new WeakMap();
  {
    let ei = 0;
    for (const c of cells) {
      if (!c.isEnemy()) continue;
      roleOf.set(c, enemyRoles[ei] || "default");
      ei += 1;
    }
  }

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
        thinkIn: randRange(B.thinkMinMs, B.thinkMaxMs, rng),
        holdTargetUntil: 0,
        preferred: null,
      };
      mind.set(cell, m);
    }
    return m;
  }

  /** @param {import("./cell").Cell} source */
  function getRole(source) {
    return roleOf.get(source) || "default";
  }

  /**
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
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} ally
   */
  function canSupplyAlly(source, ally) {
    if (!B.supplyEnabled) return false;
    if (!ally || !ally.isEnemy() || ally === source) return false;
    if (source.value < MIN_FIRE_ENERGY + ENERGY_EPS) return false;
    if (source.value < B.recoveryThreshold - ENERGY_EPS) return false;
    const room = MAX_ENERGY - ally.value;
    if (room < B.supplyRoomMin - ENERGY_EPS) return false;
    if (ally.value + ENERGY_EPS < source.value + B.supplyAllyLead) return false;
    return true;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @param {AiIntent} intent
   */
  function scoreTarget(source, target, intent) {
    if (!target || target === source) return -Infinity;

    const dx = target.container.x - source.container.x;
    const dy = target.container.y - source.container.y;
    const dist = Math.hypot(dx, dy) || 1;
    const near = (1 / (1 + dist / 220)) * (B.nearBias || 1);

    if (intent === "supply") {
      if (target.color !== COLOR_ENEMY) return -Infinity;
      if (!canSupplyAlly(source, target)) return -Infinity;
      const room = MAX_ENERGY - target.value;
      return target.value * 0.08 + room * 0.12 + near * 2.5;
    }

    if (target.color === COLOR_ENEMY) return -Infinity;

    const role = getRole(source);

    if (target.isNeutral()) {
      if (B.expandWeight <= ENERGY_EPS && role !== "expander") return -Infinity;
      const weak = 1 / (1 + target.value * 0.12);
      let expand = B.expandWeight + 3.0 * weak * near;
      if (role === "expander") expand *= 1.5;
      if (role === "raider") expand *= 0.35;
      if (role === "core") expand *= 0.55;
      return intent === "probe" ? expand * 1.25 : expand;
    }

    if (target.isPlayer()) {
      const threat = 0.35 + target.value * 0.04;
      const weakSpot =
        (1 / (1 + target.value * 0.08)) * (B.preferWeakPlayer || 1);
      let score;
      if (intent === "press") {
        score = (threat * 0.55 + weakSpot * 0.9) * near * 1.4 * B.pressWeight;
      } else {
        score = weakSpot * near * 1.15 * B.pressWeight;
      }
      if (role === "raider") score *= 1.25;
      if (role === "feeder") score *= 0.85;
      return score;
    }

    return -Infinity;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {AiIntent} intent
   */
  function pickBestTarget(source, intent) {
    let best = null;
    let bestScore = -Infinity;
    for (const cell of cells) {
      const s = scoreTarget(source, cell, intent);
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
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} preferred
   * @param {AiIntent} intent
   */
  function preferredStillValid(source, preferred, intent) {
    if (!preferred || !combat.canFireLink(source, preferred)) return false;
    if (intent === "supply") return canSupplyAlly(source, preferred);
    return preferred.isPlayer() || preferred.isNeutral();
  }

  /**
   * @param {import("./cell").Cell} source
   * @returns {AiIntent}
   */
  function chooseIntent(source) {
    const role = getRole(source);
    if (role === "idle") return "charge";

    const pressNeed = FIRE_COST * B.pressCostMult;
    const chargeNeed = FIRE_COST * B.chargeCostMult;

    if (source.value < B.recoveryThreshold - ENERGY_EPS) {
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
    const supplyOk =
      B.supplyEnabled &&
      role !== "core" &&
      role !== "raider" &&
      allyCount > 0 &&
      canSupplyAlly(source, feedTarget);

    // 角色：feeder 无紧急争点时强输送
    if (role === "feeder" && supplyOk) {
      if (!weakNeutral || weakNeutral.value > source.value * 0.5) {
        if (rng() < Math.max(0.55, B.supplyStickiness)) return "supply";
      }
    }

    // 争点：expandWeight 高时优先吃灰
    if (
      weakNeutral &&
      B.expandWeight > ENERGY_EPS &&
      role !== "raider" &&
      weakNeutral.value <= source.value * 0.85 + 2
    ) {
      // expandWeight 越高越不容易跳过抢点
      const skipChance = 1 / (1 + B.expandWeight * 0.15);
      if (rng() > skipChance * 0.35 || role === "expander") {
        return "probe";
      }
    }

    if (supplyOk && role !== "core") {
      const stick = B.supplyStickiness;
      if (stick > ENERGY_EPS && (role === "feeder" || source.value < pressNeed * 1.35 || rng() < stick)) {
        return "supply";
      }
    }

    if (playerCount > 0 && B.pressWeight > ENERGY_EPS) {
      if (source.value >= pressNeed - ENERGY_EPS) {
        if (playerPower >= source.value * 0.55 || source.value >= pressNeed * 1.2) {
          return "press";
        }
      }
      return source.value >= pressNeed * 0.85 ? "press" : "probe";
    }

    if (weakNeutral && B.expandWeight > ENERGY_EPS) return "probe";
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
      preferredStillValid(source, m.preferred, m.intent) &&
      timeMs < m.holdTargetUntil;

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
    m.holdTargetUntil = timeMs + B.holdTargetMs * (0.85 + rng() * 0.35);
  }

  /**
   * @param {number} dt
   */
  function update(dt) {
    timeMs += dt;

    for (const cell of cells) {
      if (!cell.isEnemy()) continue;

      const m = ensureMind(cell);
      m.thinkIn -= dt;
      if (m.thinkIn > 0) continue;

      m.thinkIn = randRange(B.thinkMinMs, B.thinkMaxMs, rng);
      m.intent = chooseIntent(cell);
      applyIntent(cell, m);
    }
  }

  return {
    update,
    /** 调试/HUD 用 */
    getBehavior: () => B,
    getRole: (cell) => getRole(cell),
  };
}

export { resolveLevelAi, AI_PROFILES, chapter1AiSpec } from "./aiProfiles";
