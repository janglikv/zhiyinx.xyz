/**
 * 关卡 AI 行为配置。
 * 引擎不再内置「通用战术」——每关必须通过 profile / 覆盖项声明对手怎么打。
 *
 * 用法（LevelDef.ai）：
 *   ai: 'contest'
 *   ai: { profile: 'supply_line', enemyRoles: ['feeder','feeder','core'] }
 *   ai: { profile: 'aggressive', expandWeight: 0 }  // 局部覆盖
 */

import {
  AI_THINK_MIN_MS,
  AI_THINK_MAX_MS,
  AI_CHARGE_COST_MULT,
  AI_PRESS_COST_MULT,
  AI_HOLD_TARGET_MS,
  AI_RECOVERY_THRESHOLD,
  AI_SUPPLY_ALLY_LEAD,
  AI_SUPPLY_ROOM_MIN,
} from "./constants";

/**
 * 敌巢角色（按 level.cells 中红色出现顺序对齐）。
 * - default：完全跟档案权重
 * - feeder：优先同色输送大核
 * - core：不输送，倾向压制
 * - expander：抢中立优先
 * - raider：盯玩家，少抢灰
 * - idle：只蓄能（教学/演出）
 * @typedef {'default' | 'feeder' | 'core' | 'expander' | 'raider' | 'idle'} AiEnemyRole
 */

/**
 * 已解析的 AI 行为参数（引擎只读此结构）。
 * expandWeight: 中立争点欲望（0=无视灰）
 * pressWeight: 对玩家进攻欲望
 * supplyEnabled / supplyStickiness: 同色输送开关与粘性 0–1
 * @typedef {{
 *   id: string,
 *   label: string,
 *   thinkMinMs: number,
 *   thinkMaxMs: number,
 *   holdTargetMs: number,
 *   recoveryThreshold: number,
 *   chargeCostMult: number,
 *   pressCostMult: number,
 *   expandWeight: number,
 *   pressWeight: number,
 *   supplyEnabled: boolean,
 *   supplyStickiness: number,
 *   supplyAllyLead: number,
 *   supplyRoomMin: number,
 *   preferWeakPlayer: number,
 *   nearBias: number,
 * }} AiBehavior
 */

/**
 * @typedef {{
 *   profile?: string,
 *   enemyRoles?: AiEnemyRole[],
 * } & Partial<AiBehavior>} AiLevelConfig
 */

/** @type {AiBehavior} */
const BASE = {
  id: "base",
  label: "基线",
  thinkMinMs: AI_THINK_MIN_MS,
  thinkMaxMs: AI_THINK_MAX_MS,
  holdTargetMs: AI_HOLD_TARGET_MS,
  recoveryThreshold: AI_RECOVERY_THRESHOLD,
  chargeCostMult: AI_CHARGE_COST_MULT,
  pressCostMult: AI_PRESS_COST_MULT,
  expandWeight: 6,
  pressWeight: 1,
  supplyEnabled: false,
  supplyStickiness: 0,
  supplyAllyLead: AI_SUPPLY_ALLY_LEAD,
  supplyRoomMin: AI_SUPPLY_ROOM_MIN,
  preferWeakPlayer: 1,
  nearBias: 1,
};

/**
 * 具名档案：关卡选题用，避免每关从零填参数。
 * 仍可通过 LevelDef.ai 覆盖任意字段。
 * @type {Record<string, AiBehavior>}
 */
export const AI_PROFILES = {
  /** 教学关：几乎不动，引导结束前由 tutorial 锁 AI */
  tutorial: {
    ...BASE,
    id: "tutorial",
    label: "教学待机",
    expandWeight: 0,
    pressWeight: 0.35,
    recoveryThreshold: 16,
    chargeCostMult: 2.2,
  },

  /** 基础对射：会抢近灰，会压玩家，不输送 */
  basic: {
    ...BASE,
    id: "basic",
    label: "基础对抗",
    expandWeight: 8,
    pressWeight: 1,
  },

  /** 争点：中立权重极高 */
  contest: {
    ...BASE,
    id: "contest",
    label: "争点",
    expandWeight: 22,
    pressWeight: 0.85,
    holdTargetMs: 1100,
  },

  /** 猛攻：少抢灰，高压玩家 */
  aggressive: {
    ...BASE,
    id: "aggressive",
    label: "猛攻",
    expandWeight: 2,
    pressWeight: 1.8,
    recoveryThreshold: 10,
    pressCostMult: 2.6,
    preferWeakPlayer: 1.25,
  },

  /**
   * 敌方龟缩（高休养、出手晚）——不是「蓄势」教学关用的。
   * 教学关「蓄势」应给玩家留空窗，红方用 rush_punish 立刻压。
   */
  turtle: {
    ...BASE,
    id: "turtle",
    label: "敌方龟缩",
    expandWeight: 1,
    pressWeight: 0.7,
    recoveryThreshold: 24,
    chargeCostMult: 2.8,
    pressCostMult: 3.8,
    thinkMinMs: 360,
    thinkMaxMs: 640,
  },

  /**
   * 惩罚硬冲：开局就压玩家、低休养阈值。
   * 给「蓄势」教学用——红方主动开火，低能连线会被射穿。
   */
  rush_punish: {
    ...BASE,
    id: "rush_punish",
    label: "压制硬冲",
    expandWeight: 0,
    pressWeight: 1.7,
    recoveryThreshold: 10,
    chargeCostMult: 1.35,
    pressCostMult: 2.1,
    holdTargetMs: 1400,
    thinkMinMs: 240,
    thinkMaxMs: 420,
    preferWeakPlayer: 1.2,
    nearBias: 1.05,
  },

  /** 断流：前哨喂母巢 */
  supply_line: {
    ...BASE,
    id: "supply_line",
    label: "补给线",
    expandWeight: 7,
    pressWeight: 1,
    supplyEnabled: true,
    supplyStickiness: 0.82,
    supplyAllyLead: 4,
    holdTargetMs: 1000,
  },

  /** 夹击：双侧高压，粘目标 */
  pincer: {
    ...BASE,
    id: "pincer",
    label: "夹击",
    expandWeight: 5,
    pressWeight: 1.55,
    holdTargetMs: 1200,
    recoveryThreshold: 11,
    nearBias: 1.15,
  },

  /** 纵深：默认可输送，配合 enemyRoles 区分前后排 */
  depth: {
    ...BASE,
    id: "depth",
    label: "纵深",
    expandWeight: 4,
    pressWeight: 1.2,
    supplyEnabled: true,
    supplyStickiness: 0.7,
  },

  /** 饥荒围压：无灰可抢时的压迫型 */
  starve_press: {
    ...BASE,
    id: "starve_press",
    label: "围压",
    expandWeight: 0,
    pressWeight: 1.65,
    recoveryThreshold: 11,
    preferWeakPlayer: 1.1,
  },

  /** 人海围殴：多线、快思考、粘目标短 */
  swarm: {
    ...BASE,
    id: "swarm",
    label: "围殴",
    expandWeight: 3,
    pressWeight: 1.4,
    thinkMinMs: 220,
    thinkMaxMs: 400,
    holdTargetMs: 700,
    recoveryThreshold: 10,
  },

  /** 闸门综合：争点 + 可输送 */
  gate: {
    ...BASE,
    id: "gate",
    label: "闸门",
    expandWeight: 14,
    pressWeight: 1.2,
    supplyEnabled: true,
    supplyStickiness: 0.75,
  },

  /** 占位关：保守，避免空壳关乱打 */
  placeholder: {
    ...BASE,
    id: "placeholder",
    label: "占位",
    expandWeight: 4,
    pressWeight: 0.9,
    recoveryThreshold: 14,
  },
};

/**
 * @param {string | AiLevelConfig | null | undefined} ai
 * @returns {{ behavior: AiBehavior, enemyRoles: AiEnemyRole[] }}
 */
export function resolveLevelAi(ai) {
  /** @type {AiLevelConfig} */
  let cfg = {};
  if (typeof ai === "string") {
    cfg = { profile: ai };
  } else if (ai && typeof ai === "object") {
    cfg = ai;
  }

  const profileId = cfg.profile || "placeholder";
  const base = AI_PROFILES[profileId] || AI_PROFILES.placeholder;

  /** @type {AiBehavior} */
  const behavior = {
    ...base,
    id: base.id,
    label: base.label,
  };

  // 允许关卡覆盖行为字段（不含 meta）
  const skip = new Set(["profile", "enemyRoles", "id", "label"]);
  for (const [k, v] of Object.entries(cfg)) {
    if (skip.has(k) || v === undefined) continue;
    if (k in behavior) {
      // @ts-expect-error index
      behavior[k] = v;
    }
  }

  // 覆盖后若显式关供给，粘性清零
  if (!behavior.supplyEnabled) {
    behavior.supplyStickiness = 0;
  }

  /** @type {AiEnemyRole[]} */
  const enemyRoles = Array.isArray(cfg.enemyRoles)
    ? cfg.enemyRoles.map((r) => normalizeRole(r))
    : [];

  return { behavior, enemyRoles };
}

/**
 * @param {unknown} r
 * @returns {AiEnemyRole}
 */
function normalizeRole(r) {
  const s = String(r || "default");
  if (
    s === "feeder" ||
    s === "core" ||
    s === "expander" ||
    s === "raider" ||
    s === "idle" ||
    s === "default"
  ) {
    return s;
  }
  return "default";
}

/**
 * 第一章 stage → AI 规格（每关显式定制）。
 * @param {number} stage 1–18
 * @returns {string | AiLevelConfig}
 */
export function chapter1AiSpec(stage) {
  switch (stage) {
    case 1:
      return { profile: "tutorial" };
    case 2:
      return { profile: "contest" };
    case 3:
      return { profile: "basic", pressWeight: 1.15 };
    case 4:
      return { profile: "basic", expandWeight: 5 };
    case 5:
      // 蓄势是玩家课题：红方必须主动压，不能一起龟
      return { profile: "rush_punish" };
    case 6:
      return { profile: "swarm" };
    case 7:
      return { profile: "contest" };
    case 8:
      // 红出现顺序：前哨上、前哨下、中继、母巢
      return {
        profile: "supply_line",
        enemyRoles: ["feeder", "feeder", "feeder", "core"],
      };
    case 9:
      return { profile: "pincer" };
    case 10:
      // 侧翼、侧翼、母巢线、母巢线
      return {
        profile: "depth",
        enemyRoles: ["raider", "raider", "core", "core"],
      };
    case 11:
      return { profile: "starve_press" };
    case 12:
      // 前哨补给、上翼、下翼、母巢、母巢
      return {
        profile: "gate",
        enemyRoles: ["feeder", "raider", "raider", "core", "core"],
      };
    case 14:
    case 16:
      return { profile: "aggressive", supplyEnabled: true, supplyStickiness: 0.5 };
    case 18:
      return { profile: "aggressive", expandWeight: 6, pressWeight: 1.7 };
    default:
      // 13–17 紫区占位等
      if (stage >= 13 && stage <= 17) {
        return { profile: "placeholder", pressWeight: 1.1 };
      }
      return { profile: "placeholder" };
  }
}
