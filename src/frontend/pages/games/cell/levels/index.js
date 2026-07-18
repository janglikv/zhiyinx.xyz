import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 每章关卡数 / 总章数 */
export const LEVELS_PER_CHAPTER = 12;
export const TOTAL_CHAPTERS = 5;

/** 章内 Boss 关（1-based stage）：第 6 关、第 12 关 */
export const BOSS_STAGES = Object.freeze([6, 12]);

/**
 * @param {number} stage 章内第几关 1–12
 */
export function isBossStage(stage) {
  return BOSS_STAGES.includes(stage);
}

/**
 * 章节：每章 12 关共用一张背景（level-1 … level-5）。
 * 关卡具体叙事内容后续再填，当前只保证数量与 Boss 位。
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
    description: "占领中立、积蓄力量，熟悉拖拽连线与基础对攻。",
    background: "level-1",
  },
  {
    id: 2,
    name: "合击突破",
    title: "第二章节",
    description: "多巢合流压制巨型敌巢，学会集火与协同。",
    background: "level-2",
  },
  {
    id: 3,
    name: "群星夺秒",
    title: "第三章节",
    description: "抢占中立星群，速度决定胜负。",
    background: "level-3",
  },
  {
    id: 4,
    name: "远程跃迁",
    title: "第四章节",
    description: "利用中立跳板跨越衰减距离，完成远程战役。",
    background: "level-4",
  },
  {
    id: 5,
    name: "切断补给",
    title: "第五章节",
    description: "切断敌方补给线，瓦解母巢与副巢的联动。",
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
 *   stage?: number,
 * }} LevelDef
 */

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
 * 章内第几关（1–12）
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
 * 按章内进度缩放数值（stage 1→0 … stage 12→1）
 * @param {number} stage 1–12
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
 * @param {number} globalId 1–60
 * @param {string} short
 */
function levelName(chapter, globalId, short) {
  return `${chapter.title} · 第${globalId}关：${short}`;
}

/**
 * 普通关：直线对峙（占位布局，后续按章再细化）
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
 * Boss 关：多巢 vs 巨型母巢
 * stage 6 = 中 Boss，stage 12 = 章末大 Boss
 * @param {number} stage
 */
function buildBossCells(stage) {
  const isMajor = stage >= 12;
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
 * 生成某一章的 12 关（占位内容；第 6 / 第 12 关为 Boss）
 * @param {ChapterDef} chapter
 * @param {number} chapterIndex 0-based
 * @returns {LevelDef[]}
 */
function buildChapterLevels(chapter, chapterIndex) {
  const baseId = chapterIndex * LEVELS_PER_CHAPTER;
  /** @type {LevelDef[]} */
  const list = [];

  for (let stage = 1; stage <= LEVELS_PER_CHAPTER; stage++) {
    const id = baseId + stage;
    const aiSeed = 100 + id;
    const boss = isBossStage(stage);
    const tutorial = chapterIndex === 0 && stage === 1;

    let short;
    let description;
    if (boss) {
      short = stage === 6 ? "中 Boss" : "章节末 Boss";
      description =
        stage === 6
          ? "Boss 关：巨型敌巢持续膨胀，联合分巢集火突破。"
          : "章节末 Boss：更强母巢与侧翼，多路射流合击歼灭。";
    } else if (tutorial) {
      short = "初识";
      description =
        "占领中立细胞，积蓄力量，消灭敌方。拖拽己方细胞指向目标即可发射子弹。";
    } else {
      short = `关卡 ${stage}`;
      description = `${chapter.name} · 章节内第 ${stage} 关（占位布局，后续细化）。`;
    }

    list.push({
      id,
      name: levelName(chapter, id, short),
      description,
      cells: boss ? buildBossCells(stage) : buildNormalCells(stage, tutorial),
      aiSeed,
      chapterId: chapter.id,
      background: chapter.background,
      isBoss: boss,
      stage,
      ...(tutorial ? { tutorial: "basic-capture" } : {}),
    });
  }

  return list;
}

/** @type {LevelDef[]} 5 章 × 12 关 = 60 关 */
export const LEVELS = CHAPTERS.flatMap((ch, i) => buildChapterLevels(ch, i));

/**
 * @param {number} index
 * @returns {LevelDef | undefined}
 */
export function getLevel(index) {
  return LEVELS[index];
}
