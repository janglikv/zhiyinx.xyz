import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 每章关卡数 / 总章数 */
export const LEVELS_PER_CHAPTER = 18;
export const TOTAL_CHAPTERS = 5;

/**
 * 本章累计星达到该值后解锁下一章节第 1 关。
 * 单关最高 3★，18★ ≈ 主线平均 1.5★ 或 18 关各 1★。
 */
export const CHAPTER_UNLOCK_STARS = 18;

/**
 * 章内主线关数参考（1-based）。第 12 关仍为章节闸门 Boss 位。
 * 其后 HARD_STAGE_START–LEVELS_PER_CHAPTER 为紫色高难可选关。
 * 章节解锁改由 {@link CHAPTER_UNLOCK_STARS} 控制。
 */
export const CHAPTER_UNLOCK_STAGE = 12;
export const HARD_STAGE_START = 13;

/** 默认对局失败时限（秒）——防动态平衡拖死局 */
export const DEFAULT_TIME_LIMIT_SEC = 180;
/** 默认时间星目标（秒），须明显短于失败时限 */
export const DEFAULT_STAR_TIME_SEC = 120;
/** 能量星：通关时己方总能量 ≥ 开局己方总能量 × 该系数 */
export const DEFAULT_ENERGY_STAR_RATIO = 1;

/** 章内 Boss 关（1-based stage）：第 6 关中 Boss、第 12 关章节闸门 */
export const BOSS_STAGES = Object.freeze([6, 12]);

/**
 * @param {number} stage 章内第几关 1–18
 */
export function isBossStage(stage) {
  return BOSS_STAGES.includes(stage);
}

/**
 * 章内高难关（紫色）：后 6 关
 * @param {number} stage 章内第几关 1–18
 */
export function isHardStage(stage) {
  return stage >= HARD_STAGE_START && stage <= LEVELS_PER_CHAPTER;
}

/**
 * 章节：每章 18 关共用一张背景（level-1 … level-5）。
 * 本章累计 {@link CHAPTER_UNLOCK_STARS} 星解锁下一章；13–18 为紫色高难。
 * @typedef {{
 *   id: number,
 *   name: string,
 *   title: string,
 *   description: string,
 *   background: string,
 * }} ChapterDef
 */

/** @type {ChapterDef[]} */
export const CHAPTERS = [
  {
    id: 1,
    name: "基础增殖",
    title: "第一章节",
    description: "连线、占领、集火、前哨输送、蓄势——打牢细胞战争底盘。",
    background: "level-1",
  },
  {
    id: 2,
    name: "待定",
    title: "第二章节",
    description: "内容待定",
    background: "level-2",
  },
  {
    id: 3,
    name: "待定",
    title: "第三章节",
    description: "内容待定",
    background: "level-3",
  },
  {
    id: 4,
    name: "待定",
    title: "第四章节",
    description: "内容待定",
    background: "level-4",
  },
  {
    id: 5,
    name: "待定",
    title: "第五章节",
    description: "内容待定",
    background: "level-5",
  },
];

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   description: string,
 *   cells: Array<{ x: number, y: number, value: number, color: number }>,
 *   aiSeed: number,
 *   tutorial?: string | boolean,
 *   chapterId: number,
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
 * @returns {number} 0-based chapter index
 */
export function chapterIndexFromLevelIndex(levelIndex) {
  return Math.min(
    TOTAL_CHAPTERS - 1,
    Math.max(0, Math.floor(levelIndex / LEVELS_PER_CHAPTER)),
  );
}

/**
 * @param {number} levelIndex 0-based
 * @returns {string} 背景 id，如 "level-1"
 */
export function backgroundIdForLevelIndex(levelIndex) {
  const ch = CHAPTERS[chapterIndexFromLevelIndex(levelIndex)];
  return ch?.background ?? "level-1";
}

/**
 * @param {number} levelIndex 0-based
 * @returns {ChapterDef}
 */
export function getChapterForLevelIndex(levelIndex) {
  return CHAPTERS[chapterIndexFromLevelIndex(levelIndex)];
}

/**
 * 章内第几关（1–18）
 * @param {number} levelIndex 0-based
 */
export function stageInChapter(levelIndex) {
  return (levelIndex % LEVELS_PER_CHAPTER) + 1;
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
 * 按章内进度缩放数值（stage 1→0 … stage 18→1）
 * @param {number} stage 1–18
 * @param {number} easy
 * @param {number} hard
 */
function scaleByStage(stage, easy, hard) {
  const t = (stage - 1) / Math.max(1, LEVELS_PER_CHAPTER - 1);
  return lerp(easy, hard, t);
}

/**
 * 章内关名
 * @param {ChapterDef} chapter
 * @param {number} globalId 1–90
 * @param {string} short
 */
function levelName(chapter, globalId, short) {
  return `${chapter.title} · 第${globalId}关：${short}`;
}

/**
 * 普通关：直线对峙（章内 7–11 等占位布局）
 * @param {number} stage
 * @param {boolean} tutorial
 */
function buildNormalCells(stage, tutorial) {
  const player = tutorial ? 99 : scaleByStage(stage, 28, 16);
  const neutral = scaleByStage(stage, 10, 20);
  const enemy = scaleByStage(stage, 12, 38);
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
        { x: 700, y: 270, value: 14, color: COLOR_ENEMY },
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

    // 关 4 · 前哨：后排双绿喂前排，前排贴脸输出；忌全员远射
    case 4:
      return [
        { x: 170, y: 150, value: 28, color: COLOR_PLAYER },
        { x: 170, y: 390, value: 28, color: COLOR_PLAYER },
        { x: 430, y: 270, value: 16, color: COLOR_PLAYER },
        { x: 740, y: 270, value: 52, color: COLOR_ENEMY },
      ];

    // 关 5 · 蓄势：仅绿 vs 红，无中立。同一排；先养厚再出手（略放水：开局差缩小）
    case 5:
      return [
        { x: 260, y: 270, value: 26, color: COLOR_PLAYER },
        { x: 700, y: 270, value: 34, color: COLOR_ENEMY },
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
          "开局能量很低，射速几乎没有。先空窗自增，养厚后再连线出手；低能硬冲红巢会被压垮。",
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
 * Boss 关占位：多巢 vs 巨型母巢
 * stage 6 = 中 Boss，stage 12 = 章节闸门 Boss
 * @param {number} stage
 */
function buildBossCells(stage) {
  const isMajor = stage >= CHAPTER_UNLOCK_STAGE;
  const p = scaleByStage(stage, 16, 12);
  const n = scaleByStage(stage, 14, 22);
  const boss = isMajor
    ? scaleByStage(stage, 70, 100)
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
      { x: 740, y: 140, value: scaleByStage(stage, 12, 20), color: COLOR_ENEMY },
      { x: 740, y: 400, value: scaleByStage(stage, 12, 20), color: COLOR_ENEMY },
    );
  }

  return cells;
}

/**
 * 生成某一章的 18 关。
 * 目前仅第一章节有完整内容；其余章节关卡内容已清空（壳位保留，后续再填）。
 * @param {ChapterDef} chapter
 * @param {number} chapterIndex 0-based
 * @returns {LevelDef[]}
 */
function buildChapterLevels(chapter, chapterIndex) {
  const baseId = chapterIndex * LEVELS_PER_CHAPTER;
  /** @type {LevelDef[]} */
  const list = [];
  const contentReady = chapterIndex === 0;

  for (let stage = 1; stage <= LEVELS_PER_CHAPTER; stage++) {
    const id = baseId + stage;
    const aiSeed = 100 + id;
    const boss = isBossStage(stage);
    const hard = isHardStage(stage);
    const tutorial = contentReady && stage === 1;

    if (!contentReady) {
      // 第 2–5 章：只保留槽位、Boss / 高难标记，关卡内容清空
      let short;
      if (boss) short = stage === 6 ? "中 Boss" : "章节闸门";
      else if (hard) short = `高难 ${stage}`;
      else short = `关卡 ${stage}`;

      list.push({
        id,
        name: levelName(chapter, id, short),
        description: hard
          ? "高难挑战（可选）· 内容待定"
          : "内容待定",
        cells: [],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
        isBoss: boss,
        isHard: hard,
        stage,
      });
      continue;
    }

    let short;
    let description;
    /** @type {Array<{ x: number, y: number, value: number, color: number }>} */
    let cells;

    if (boss) {
      if (stage === 6) {
        short = "绝境清场";
        description =
          "敌群四面合围——别慌，你的核巢能量爆表。多路连线逐个撕开，享受被围仍能碾压的快感。";
        cells = buildChapter1MidBossCells();
      } else {
        short = "章节闸门";
        description =
          "章节闸门 Boss：更强母巢与侧翼。本章攒满星数可解锁下一章节，亦可继续挑战紫色高难关。";
        cells = buildBossCells(stage);
      }
    } else if (hard) {
      short = `高难 ${stage}`;
      description = `${chapter.name} · 高难挑战（可选）· 章节内第 ${stage} 关（占位，后续细化）。`;
      cells = buildNormalCells(stage, false);
    } else if (stage <= 5) {
      const copy = chapter1StageCopy(stage);
      short = copy.short;
      description = copy.description;
      cells = buildChapter1TutorialCells(stage);
    } else {
      short = `关卡 ${stage}`;
      description = `${chapter.name} · 章节内第 ${stage} 关（占位布局，后续细化）。`;
      cells = buildNormalCells(stage, false);
    }

    list.push({
      id,
      name: levelName(chapter, id, short),
      description,
      cells,
      aiSeed,
      chapterId: chapter.id,
      background: chapter.background,
      isBoss: boss,
      isHard: hard,
      stage,
      ...(tutorial ? { tutorial: "basic-capture" } : {}),
    });
  }

  return list;
}

/** @type {LevelDef[]} 5 章 × 18 关 = 90 关（仅第 1 章有完整内容） */
export const LEVELS = CHAPTERS.flatMap((ch, i) => buildChapterLevels(ch, i));

/**
 * @param {number} index
 * @returns {LevelDef | undefined}
 */
export function getLevel(index) {
  return LEVELS[index];
}
