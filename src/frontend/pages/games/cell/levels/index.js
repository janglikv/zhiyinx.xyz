import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";
import { chapter1AiSpec } from "../aiProfiles";

/** 全游戏关卡总数（不再分章节） */
export const TOTAL_LEVELS = 18;
/** @deprecated 兼容旧引用；等同 TOTAL_LEVELS */
export const LEVELS_PER_CHAPTER = TOTAL_LEVELS;

/**
 * 主线闸门 Boss 位（1-based）。
 * 13–17 为紫色高难可选关（14 / 16 为紫色 Boss）；
 * 第 18 关为红色终章 Boss。
 */
export const GATE_BOSS_STAGE = 12;
/** @deprecated 兼容旧引用 */
export const CHAPTER_UNLOCK_STAGE = GATE_BOSS_STAGE;
export const HARD_STAGE_START = 13;
/** 紫色高难区结束 stage（含）；18 为红色终章 Boss，不在紫区 */
export const HARD_STAGE_END = 17;

/** 默认对局失败时限（秒）——防动态平衡拖死局 */
export const DEFAULT_TIME_LIMIT_SEC = 180;
/** 默认时间星目标（秒），须明显短于失败时限 */
export const DEFAULT_STAR_TIME_SEC = 120;
/** 能量星：通关时己方总能量 ≥ 开局己方总能量 × 该系数 */
export const DEFAULT_ENERGY_STAR_RATIO = 1;

/**
 * Boss 关（1-based stage）：
 * 6 中 Boss · 12 闸门 · 14/16 紫色高难 Boss · 18 红色终章 Boss
 */
export const BOSS_STAGES = Object.freeze([6, 12, 14, 16, 18]);

/**
 * @param {number} stage 第几关 1–18
 */
export function isBossStage(stage) {
  return BOSS_STAGES.includes(stage);
}

/**
 * 高难关（紫色）：13–17（含 14/16 紫 Boss；不含 18）
 * @param {number} stage 第几关 1–18
 */
export function isHardStage(stage) {
  return stage >= HARD_STAGE_START && stage <= HARD_STAGE_END;
}

/**
 * 紫色高难区内的 Boss（isHard && isBoss）——目前 14、16
 * @param {number} stage 第几关 1–18
 */
export function isHardBossStage(stage) {
  return isHardStage(stage) && isBossStage(stage);
}

/** 默认大厅 / 对局背景 id */
export const DEFAULT_BACKGROUND = "level-1";

/**
 * 关卡定义。
 * ai: 本关 AI（具名 profile 或 { profile, enemyRoles, 字段覆盖 }），勿依赖全局通用战术。
 * @typedef {{
 *   id: number,
 *   name: string,
 *   description: string,
 *   cells: Array<{ x: number, y: number, value: number, color: number }>,
 *   aiSeed: number,
 *   ai?: string | import("../aiProfiles").AiLevelConfig,
 *   tutorial?: string | boolean,
 *   background: string,
 *   isBoss?: boolean,
 *   isHard?: boolean,
 *   stage?: number,
 *   timeLimitSec?: number,
 *   starTimeSec?: number,
 *   energyStarRatio?: number,
 * }} LevelDef
 */

/**
 * 解析关卡时限与评星参数（缺省补全）。
 * @param {LevelDef | null | undefined} level
 * @returns {{
 *   timeLimitSec: number,
 *   starTimeSec: number,
 *   energyStarRatio: number,
 * }}
 */
export function resolveLevelStarRules(level) {
  const stage = level?.stage ?? 1;
  const boss = Boolean(level?.isBoss);
  const hard = Boolean(level?.isHard);

  let timeLimitSec = level?.timeLimitSec;
  if (timeLimitSec == null || !Number.isFinite(timeLimitSec)) {
    timeLimitSec = boss ? 210 : DEFAULT_TIME_LIMIT_SEC;
  }

  let starTimeSec = level?.starTimeSec;
  if (starTimeSec == null || !Number.isFinite(starTimeSec)) {
    if (boss) starTimeSec = 150;
    else if (hard) starTimeSec = 100;
    else if (stage <= 5) starTimeSec = 120;
    else starTimeSec = DEFAULT_STAR_TIME_SEC;
  }

  // 时间星必须严于失败时限，否则与 1★ 重合
  starTimeSec = Math.min(starTimeSec, Math.max(15, timeLimitSec - 15));

  let energyStarRatio = level?.energyStarRatio;
  if (energyStarRatio == null || !Number.isFinite(energyStarRatio)) {
    energyStarRatio = DEFAULT_ENERGY_STAR_RATIO;
  }

  return {
    timeLimitSec: Math.max(30, timeLimitSec),
    starTimeSec: Math.max(10, starTimeSec),
    energyStarRatio: Math.max(0.1, energyStarRatio),
  };
}

/**
 * 开局己方总能量（用于能量星对照）。
 * @param {LevelDef | null | undefined} level
 */
export function startingPlayerEnergy(level) {
  if (!level?.cells?.length) return 0;
  return level.cells.reduce((sum, c) => {
    if (c.color === COLOR_PLAYER) return sum + (Number(c.value) || 0);
    return sum;
  }, 0);
}

/**
 * 通关后评星：1★ 通关 + 能量充沛 + 限时。
 * @param {{
 *   elapsedSec: number,
 *   playerEnergy: number,
 *   startPlayerEnergy: number,
 *   starTimeSec: number,
 *   energyStarRatio?: number,
 * }} p
 * @returns {{
 *   stars: number,
 *   energyOk: boolean,
 *   timeOk: boolean,
 *   energyTarget: number,
 *   elapsedSec: number,
 *   starTimeSec: number,
 * }}
 */
export function evaluateClearStars(p) {
  const ratio =
    p.energyStarRatio != null && Number.isFinite(p.energyStarRatio)
      ? p.energyStarRatio
      : DEFAULT_ENERGY_STAR_RATIO;
  const energyTarget = (p.startPlayerEnergy || 0) * ratio;
  const energyOk = (p.playerEnergy || 0) + 1e-6 >= energyTarget;
  const timeOk = (p.elapsedSec || 0) <= (p.starTimeSec || DEFAULT_STAR_TIME_SEC);

  let stars = 1;
  if (energyOk) stars += 1;
  if (timeOk) stars += 1;

  return {
    stars,
    energyOk,
    timeOk,
    energyTarget,
    elapsedSec: p.elapsedSec || 0,
    starTimeSec: p.starTimeSec || DEFAULT_STAR_TIME_SEC,
  };
}

/**
 * @param {number} levelIndex 0-based
 * @returns {string} 背景 id，如 "level-1"
 */
export function backgroundIdForLevelIndex(levelIndex) {
  return LEVELS[levelIndex]?.background ?? DEFAULT_BACKGROUND;
}

/**
 * 第几关（1–18）
 * @param {number} levelIndex 0-based
 */
export function stageInChapter(levelIndex) {
  return Math.min(TOTAL_LEVELS, Math.max(1, (levelIndex | 0) + 1));
}

/**
 * 线性插值并取整
 * @param {number} a
 * @param {number} b
 * @param {number} t 0–1
 */
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/**
 * 按关卡进度缩放数值（stage 1→0 … stage 18→1）
 * @param {number} stage 1–18
 * @param {number} easy
 * @param {number} hard
 */
function scaleByStage(stage, easy, hard) {
  const t = (stage - 1) / Math.max(1, TOTAL_LEVELS - 1);
  return lerp(easy, hard, t);
}

/**
 * @param {number} id 1–18
 * @param {string} short
 */
function levelName(id, short) {
  return `第${id}关：${short}`;
}

/**
 * 普通关占位：直线对峙（紫高难等未细做布局时回退）
 * @param {number} stage
 * @param {boolean} tutorial
 */
function buildNormalCells(stage, tutorial) {
  // 参战单位至少一档（20），避免开局无法开火
  const player = tutorial ? 99 : Math.max(20, scaleByStage(stage, 28, 20));
  const neutral = scaleByStage(stage, 10, 20);
  const enemy = Math.max(20, scaleByStage(stage, 20, 38));
  return [
    { x: 280 - Math.min(stage, 8) * 3, y: 270, value: player, color: COLOR_PLAYER },
    { x: 480, y: 270, value: neutral, color: COLOR_NEUTRAL },
    { x: 680 + Math.min(stage, 8) * 3, y: 270, value: enemy, color: COLOR_ENEMY },
  ];
}

/**
 * 第一章前 5 关：教学布局（一关一个主决策）
 * 1 初识连线 · 2 占点扩势 · 3 双线群殴 · 4 前哨供给 · 5 先养再打
 * @param {number} stage 1–5
 * @returns {Array<{ x: number, y: number, value: number, color: number }>}
 */
function buildChapter1TutorialCells(stage) {
  switch (stage) {
    // 关 1 · 初识：高血量绿 + 中立 + 弱红，跟着引导几乎必胜
    case 1:
      return [
        { x: 260, y: 270, value: 99, color: COLOR_PLAYER },
        { x: 480, y: 270, value: 12, color: COLOR_NEUTRAL },
        // 一档起步，引导解锁后即可对射
        { x: 700, y: 270, value: 20, color: COLOR_ENEMY },
      ];

    // 关 2 · 占点：1 绿 + 2 中立（近/远）+ 1 中等红；先占灰再打更稳
    case 2:
      return [
        { x: 220, y: 270, value: 32, color: COLOR_PLAYER },
        { x: 400, y: 170, value: 10, color: COLOR_NEUTRAL },
        { x: 420, y: 370, value: 14, color: COLOR_NEUTRAL },
        { x: 720, y: 270, value: 28, color: COLOR_ENEMY },
      ];

    // 关 3 · 群殴：双绿 vs 单大红；单路磨不动，双路锁同目标才稳
    case 3:
      return [
        { x: 220, y: 160, value: 22, color: COLOR_PLAYER },
        { x: 220, y: 380, value: 22, color: COLOR_PLAYER },
        { x: 720, y: 270, value: 48, color: COLOR_ENEMY },
      ];

    // 关 4 · 前哨：后排双绿喂前排，前排须 ≥20 才能输出
    case 4:
      return [
        { x: 170, y: 150, value: 28, color: COLOR_PLAYER },
        { x: 170, y: 390, value: 28, color: COLOR_PLAYER },
        { x: 430, y: 270, value: 22, color: COLOR_PLAYER },
        { x: 740, y: 270, value: 52, color: COLOR_ENEMY },
      ];

    // 关 5 · 蓄势：1v1。开局在成长一档（<20）且射速极慢；空窗进二档再打。红方 rush_punish。
    case 5:
      return [
        { x: 260, y: 270, value: 12, color: COLOR_PLAYER },
        { x: 700, y: 270, value: 28, color: COLOR_ENEMY },
      ];

    default:
      return buildNormalCells(stage, false);
  }
}

/**
 * 第一章 1–5 关文案
 * @param {number} stage 1–5
 * @returns {{ short: string, description: string }}
 */
function chapter1StageCopy(stage) {
  switch (stage) {
    case 1:
      return {
        short: "初识",
        description:
          "拖拽己方绿色细胞指向目标后松手即可连线输出。先占领灰色中立，再消灭红色敌巢。",
      };
    case 2:
      return {
        short: "占点",
        description:
          "场上有多处中立细胞。先占领它们扩大己方巢穴，再合力清除敌方，比硬刚更稳。",
      };
    case 3:
      return {
        short: "合击",
        description:
          "敌巢强于任一己方单巢。将两个绿色细胞同时连向同一红色目标，双路群殴才能压过。",
      };
    case 4:
      return {
        short: "前哨",
        description:
          "后排细胞连向前排=输送能量，前排连向敌人=输出。把火力叠在贴脸前哨上，比全员远射更狠。",
      };
    case 5:
      return {
        short: "蓄势",
        description:
          "开局很瘦、射速极慢，对面会主动压过来。先空窗自增（成长一档更快），过 20 进二档后再出手；低能硬冲会被射穿。",
      };
    default:
      return { short: `关卡 ${stage}`, description: "内容待定" };
  }
}

/**
 * 第一章中 Boss（关 6）：多红环伺「被围殴」，但玩家核高能，爽快清场。
 * @returns {Array<{ x: number, y: number, value: number, color: number }>}
 */
function buildChapter1MidBossCells() {
  return [
    // 中心双核：体量大、射速高，多路锁敌可瞬间撕开包围
    { x: 430, y: 270, value: 88, color: COLOR_PLAYER },
    { x: 530, y: 270, value: 88, color: COLOR_PLAYER },
    // 六向围殴：单体中等，叠在一起气势压人，却经不起集火
    { x: 480, y: 88, value: 28, color: COLOR_ENEMY },
    { x: 200, y: 150, value: 26, color: COLOR_ENEMY },
    { x: 760, y: 150, value: 26, color: COLOR_ENEMY },
    { x: 160, y: 340, value: 24, color: COLOR_ENEMY },
    { x: 800, y: 340, value: 24, color: COLOR_ENEMY },
    { x: 480, y: 460, value: 30, color: COLOR_ENEMY },
  ];
}

/**
 * 第一章试炼 7–11：组合应用教学技能（无强制引导）。
 * 细胞数规律：第 N 关场上共计 N 个细胞（7→7 … 11→11）。
 * 7 争点 · 8 断流 · 9 夹击 · 10 纵深 · 11 饥荒
 * @param {number} stage 7–11
 * @returns {Array<{ x: number, y: number, value: number, color: number }>}
 */
function buildChapter1TrialCells(stage) {
  switch (stage) {
    // 关 7 · 争点（7 细胞）：2绿 + 3灰偏敌 + 2红；先抢点再合击
    case 7:
      return [
        { x: 180, y: 180, value: 24, color: COLOR_PLAYER },
        { x: 180, y: 360, value: 24, color: COLOR_PLAYER },
        { x: 460, y: 140, value: 11, color: COLOR_NEUTRAL },
        { x: 500, y: 270, value: 12, color: COLOR_NEUTRAL },
        { x: 460, y: 400, value: 11, color: COLOR_NEUTRAL },
        { x: 760, y: 180, value: 28, color: COLOR_ENEMY },
        { x: 760, y: 360, value: 30, color: COLOR_ENEMY },
      ];

    // 关 8 · 断流（8 细胞）：3绿 + 1灰 + 2前哨 + 1中继 + 1母巢
    // 前哨/中继会 AI 同色喂母巢；母巢开局偏瘦，靠补给变壮——先拆补给线才是正解
    case 8:
      return [
        { x: 160, y: 140, value: 22, color: COLOR_PLAYER },
        { x: 160, y: 270, value: 24, color: COLOR_PLAYER },
        { x: 160, y: 400, value: 22, color: COLOR_PLAYER },
        { x: 380, y: 270, value: 10, color: COLOR_NEUTRAL },
        // 前哨/中继须 ≥20 才能输送；母巢一档，靠喂养冲二档
        { x: 540, y: 180, value: 22, color: COLOR_ENEMY },
        { x: 540, y: 360, value: 22, color: COLOR_ENEMY },
        { x: 680, y: 270, value: 24, color: COLOR_ENEMY },
        { x: 820, y: 270, value: 26, color: COLOR_ENEMY },
      ];

    // 关 9 · 夹击（9 细胞）：3绿 + 2灰中路 + 上翼2红 + 下翼2红
    case 9:
      return [
        { x: 190, y: 150, value: 22, color: COLOR_PLAYER },
        { x: 190, y: 270, value: 24, color: COLOR_PLAYER },
        { x: 190, y: 390, value: 22, color: COLOR_PLAYER },
        { x: 440, y: 200, value: 12, color: COLOR_NEUTRAL },
        { x: 440, y: 340, value: 12, color: COLOR_NEUTRAL },
        // 上翼（略弱）
        { x: 700, y: 100, value: 22, color: COLOR_ENEMY },
        { x: 780, y: 160, value: 24, color: COLOR_ENEMY },
        // 下翼（略强）
        { x: 700, y: 440, value: 26, color: COLOR_ENEMY },
        { x: 780, y: 380, value: 28, color: COLOR_ENEMY },
      ];

    // 关 10 · 纵深（10 细胞）：后排2 + 中继2 + 前线1 + 1灰 + 侧翼2 + 母巢线2
    case 10:
      return [
        // 后排
        { x: 140, y: 150, value: 24, color: COLOR_PLAYER },
        { x: 140, y: 390, value: 24, color: COLOR_PLAYER },
        // 中继 / 前线均需 ≥20 才能射或转输
        { x: 300, y: 200, value: 22, color: COLOR_PLAYER },
        { x: 300, y: 340, value: 22, color: COLOR_PLAYER },
        // 前线前哨
        { x: 480, y: 270, value: 20, color: COLOR_PLAYER },
        { x: 400, y: 100, value: 10, color: COLOR_NEUTRAL },
        // 上下侧翼骚扰
        { x: 620, y: 100, value: 22, color: COLOR_ENEMY },
        { x: 620, y: 440, value: 22, color: COLOR_ENEMY },
        // 母巢纵深
        { x: 760, y: 220, value: 28, color: COLOR_ENEMY },
        { x: 820, y: 340, value: 36, color: COLOR_ENEMY },
      ];

    // 关 11 · 饥荒：绿方刻意 <20 须先攒档；红方均已一档可压
    case 11:
      return [
        { x: 180, y: 130, value: 12, color: COLOR_PLAYER },
        { x: 180, y: 230, value: 14, color: COLOR_PLAYER },
        { x: 180, y: 330, value: 14, color: COLOR_PLAYER },
        { x: 180, y: 430, value: 12, color: COLOR_PLAYER },
        // 前压线
        { x: 520, y: 160, value: 22, color: COLOR_ENEMY },
        { x: 520, y: 270, value: 24, color: COLOR_ENEMY },
        { x: 520, y: 380, value: 22, color: COLOR_ENEMY },
        // 后排红核
        { x: 740, y: 120, value: 22, color: COLOR_ENEMY },
        { x: 780, y: 220, value: 24, color: COLOR_ENEMY },
        { x: 780, y: 340, value: 24, color: COLOR_ENEMY },
        { x: 740, y: 440, value: 22, color: COLOR_ENEMY },
      ];

    default:
      return buildNormalCells(stage, false);
  }
}

/**
 * 第一章试炼 7–11 文案
 * @param {number} stage 7–11
 * @returns {{ short: string, description: string, starTimeSec?: number }}
 */
function chapter1TrialCopy(stage) {
  switch (stage) {
    case 7:
      return {
        short: "争点",
        description:
          "中立更靠近敌巢。先抢占灰色扩势，再合击红色；开局硬刚母巢容易两头空。",
        starTimeSec: 110,
      };
    case 8:
      return {
        short: "断流",
        description:
          "前哨与中继会给后方母巢输送能量。先拆掉补给（或划刀切断红方连线），再集火变瘦的母巢；放任输血会把母巢养肥。",
        // 正确断流节奏可三星；硬刚满补给母巢会超时
        starTimeSec: 115,
      };
    case 9:
      return {
        short: "夹击",
        description:
          "上下两翼同时来犯。可先灭较弱一翼再转火，或抢中路中立稳住局面——别两边平均磨。",
        starTimeSec: 100,
      };
    case 10:
      return {
        short: "纵深",
        description:
          "后排输送 → 中继中转 → 前线输出。把火力叠在贴脸前哨上；全员远射射速差，还要提防侧翼骚扰。",
        starTimeSec: 100,
      };
    case 11:
      return {
        short: "饥荒",
        description:
          "没有中立可抢，己方四巢开局偏瘦，对面七红压境。先空窗攒过成长一档再分路出手；低能硬冲会被前压线吃掉。",
        // 略紧：鼓励蓄势后高效清场，服务三星
        starTimeSec: 95,
      };
    default:
      return { short: `关卡 ${stage}`, description: "内容待定" };
  }
}

/**
 * 主线闸门（关 12，共 12 细胞）：
 * 4 绿 + 3 灰争点 + 侧翼/前哨/母巢 5 红，综合验收 7–11。
 * @returns {Array<{ x: number, y: number, value: number, color: number }>}
 */
function buildChapter1GateBossCells() {
  return [
    // 己方左纵列（4）
    { x: 150, y: 120, value: 20, color: COLOR_PLAYER },
    { x: 150, y: 220, value: 22, color: COLOR_PLAYER },
    { x: 150, y: 320, value: 22, color: COLOR_PLAYER },
    { x: 150, y: 420, value: 20, color: COLOR_PLAYER },
    // 争点带中立（3）
    { x: 380, y: 160, value: 11, color: COLOR_NEUTRAL },
    { x: 420, y: 270, value: 12, color: COLOR_NEUTRAL },
    { x: 380, y: 380, value: 11, color: COLOR_NEUTRAL },
    // 敌前哨补给（1）— 须 ≥20 才能喂母巢
    { x: 580, y: 270, value: 22, color: COLOR_ENEMY },
    // 上下侧翼（2）
    { x: 680, y: 100, value: 22, color: COLOR_ENEMY },
    { x: 680, y: 440, value: 22, color: COLOR_ENEMY },
    // 母巢集群（2）
    { x: 800, y: 200, value: 32, color: COLOR_ENEMY },
    { x: 820, y: 340, value: 40, color: COLOR_ENEMY },
  ];
}

/**
 * Boss 关占位：多巢 vs 巨型母巢
 * stage 6 = 中 Boss；≥12（含 12 闸门、14/16 紫 Boss、18 终章）用加强布局
 * @param {number} stage
 */
function buildBossCells(stage) {
  const isMajor = stage >= GATE_BOSS_STAGE;
  const p = Math.max(20, scaleByStage(stage, 22, 20));
  const n = scaleByStage(stage, 14, 22);
  const boss = isMajor
    ? Math.min(99, scaleByStage(stage, 70, 99))
    : scaleByStage(stage, 48, 72);

  /** @type {Array<{ x: number, y: number, value: number, color: number }>} */
  const cells = [
    { x: 190, y: 140, value: p, color: COLOR_PLAYER },
    { x: 190, y: 270, value: p + 2, color: COLOR_PLAYER },
    { x: 190, y: 400, value: p, color: COLOR_PLAYER },
    { x: 460, y: 270, value: n, color: COLOR_NEUTRAL },
    { x: 740, y: 270, value: boss, color: COLOR_ENEMY },
  ];

  if (isMajor) {
    cells.splice(4, 0, {
      x: 460,
      y: 150,
      value: Math.max(8, n - 4),
      color: COLOR_NEUTRAL,
    });
    cells.push(
      { x: 740, y: 140, value: Math.max(20, scaleByStage(stage, 20, 28)), color: COLOR_ENEMY },
      { x: 740, y: 400, value: Math.max(20, scaleByStage(stage, 20, 28)), color: COLOR_ENEMY },
    );
  }

  return cells;
}

/**
 * 生成全部 18 关（主线 1–12 · 紫高难 13–17 · 终章 18）。
 * @returns {LevelDef[]}
 */
function buildAllLevels() {
  /** @type {LevelDef[]} */
  const list = [];

  for (let stage = 1; stage <= TOTAL_LEVELS; stage++) {
    const id = stage;
    const aiSeed = 100 + id;
    const boss = isBossStage(stage);
    const hard = isHardStage(stage);
    const tutorial = stage === 1;

    let short;
    let description;
    /** @type {Array<{ x: number, y: number, value: number, color: number }>} */
    let cells;
    /** @type {number | undefined} */
    let starTimeSec;
    /** @type {number | undefined} */
    let timeLimitSec;
    const ai = chapter1AiSpec(stage);

    if (boss) {
      if (stage === 6) {
        short = "绝境清场";
        description =
          "敌群四面合围——别慌，你的核巢能量爆表。多路连线逐个撕开，享受被围仍能碾压的快感。";
        cells = buildChapter1MidBossCells();
      } else if (hard) {
        short = `紫 Boss ${stage}`;
        description = `紫色高难 Boss（可选）· 更强母巢布局，第 ${stage} 关（占位，后续细化）。`;
        cells = buildBossCells(stage);
      } else if (stage === 18) {
        short = "终章 Boss";
        description =
          "终章 Boss：红色终极关卡。肃清最强母巢，亦可回头刷满紫色高难与星数。";
        cells = buildBossCells(stage);
      } else if (stage === 12) {
        short = "闸门";
        description =
          "主线闸门（12 细胞）：侧翼、中路争点、前哨补给与双核母巢。按阶段拆掉守卫——先翼后点再断流，最后合击母巢。";
        cells = buildChapter1GateBossCells();
        starTimeSec = 130;
        timeLimitSec = 200;
      } else {
        short = "闸门";
        description =
          "闸门 Boss：更强母巢与侧翼。亦可继续挑战紫色高难关。";
        cells = buildBossCells(stage);
      }
    } else if (hard) {
      short = `高难 ${stage}`;
      description = `高难挑战（可选）· 第 ${stage} 关（占位，后续细化）。`;
      cells = buildNormalCells(stage, false);
    } else if (stage <= 5) {
      const copy = chapter1StageCopy(stage);
      short = copy.short;
      description = copy.description;
      cells = buildChapter1TutorialCells(stage);
    } else if (stage >= 7 && stage <= 11) {
      const copy = chapter1TrialCopy(stage);
      short = copy.short;
      description = copy.description;
      cells = buildChapter1TrialCells(stage);
      if (copy.starTimeSec != null) starTimeSec = copy.starTimeSec;
    } else {
      short = `关卡 ${stage}`;
      description = `第 ${stage} 关（占位布局，后续细化）。`;
      cells = buildNormalCells(stage, false);
    }

    list.push({
      id,
      name: levelName(id, short),
      description,
      cells,
      aiSeed,
      ai,
      background: DEFAULT_BACKGROUND,
      isBoss: boss,
      isHard: hard,
      stage,
      ...(starTimeSec != null ? { starTimeSec } : {}),
      ...(timeLimitSec != null ? { timeLimitSec } : {}),
      ...(tutorial ? { tutorial: "basic-capture" } : {}),
    });
  }

  return list;
}

/** @type {LevelDef[]} 共 18 关 */
export const LEVELS = buildAllLevels();

/**
 * @param {number} index
 * @returns {LevelDef | undefined}
 */
export function getLevel(index) {
  return LEVELS[index];
}
