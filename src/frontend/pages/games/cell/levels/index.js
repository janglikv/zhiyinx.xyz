import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 每章关卡数 / 总章数 */
export const LEVELS_PER_CHAPTER = 5;
export const TOTAL_CHAPTERS = 5;

/**
 * 章节：每章 5 关共用一张背景（level-1 … level-5）。
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
    title: "第一章",
    description: "占领中立、积蓄力量，熟悉拖拽连线与基础对攻。",
    background: "level-1",
  },
  {
    id: 2,
    name: "合击突破",
    title: "第二章",
    description: "多巢合流压制巨型敌巢，学会集火与协同。",
    background: "level-2",
  },
  {
    id: 3,
    name: "群星夺秒",
    title: "第三章",
    description: "抢占中立星群，速度决定胜负。",
    background: "level-3",
  },
  {
    id: 4,
    name: "远程跃迁",
    title: "第四章",
    description: "利用中立跳板跨越衰减距离，完成远程战役。",
    background: "level-4",
  },
  {
    id: 5,
    name: "切断补给",
    title: "第五章",
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
 * 章内第几关（1–5）
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
 * 按章内进度缩放数值（stage 1→0 … stage 5→1）
 * @param {number} stage 1–5
 * @param {number} easy
 * @param {number} hard
 */
function scaleByStage(stage, easy, hard) {
  const t = (stage - 1) / (LEVELS_PER_CHAPTER - 1);
  return lerp(easy, hard, t);
}

/**
 * 章内关名
 * @param {ChapterDef} chapter
 * @param {number} globalId 1–25
 * @param {number} stage 1–5
 * @param {string} short
 */
function levelName(chapter, globalId, stage, short) {
  return `${chapter.title} · 第${globalId}关：${short}`;
}

/**
 * 生成某一章的 5 关
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

    /** @type {LevelDef} */
    let level;

    if (chapterIndex === 0) {
      // 第一章：基础增殖 — 直线对峙，逐步加压
      // 第 1 关为教程：玩家满能量 99，便于专注学操作
      const player = stage === 1 ? 99 : scaleByStage(stage, 28, 18);
      const neutral = scaleByStage(stage, 10, 18);
      const enemy = scaleByStage(stage, 12, 32);
      const shorts = ["初识", "增压", "对峙", "夹击", "决裂"];
      const descs = [
        "占领中立细胞，积蓄力量，消灭敌方。拖拽己方细胞指向目标即可发射子弹。",
        "敌巢略强，先拿下中立再合围。",
        "双方势均力敌，节奏与集火是关键。",
        "中立资源更厚，抢点决定战局。",
        "敌方更强：稳扎稳打，一波清场。",
      ];
      level = {
        id,
        name: levelName(chapter, id, stage, shorts[stage - 1]),
        description: descs[stage - 1],
        cells: [
          { x: 280 - stage * 4, y: 270, value: player, color: COLOR_PLAYER },
          { x: 480, y: 270, value: neutral, color: COLOR_NEUTRAL },
          { x: 680 + stage * 4, y: 270, value: enemy, color: COLOR_ENEMY },
        ],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
        ...(stage === 1 ? { tutorial: "basic-capture" } : {}),
      };
    } else if (chapterIndex === 1) {
      // 第二章：合击突破 — 多巢 vs 大母巢
      const p = scaleByStage(stage, 16, 12);
      const n = scaleByStage(stage, 14, 22);
      const boss = scaleByStage(stage, 55, 88);
      const shorts = ["合流", "侧翼", "重压", "绞杀", "灭巢"];
      level = {
        id,
        name: levelName(chapter, id, stage, shorts[stage - 1]),
        description:
          stage === 1
            ? "敌方母巢庞大且自增极快。联合多个分巢，将子弹合流压制它！"
            : `巨型敌巢（约 ${boss} 能量）持续膨胀，用多路射流合击突破。`,
        cells: [
          { x: 190, y: 140, value: p, color: COLOR_PLAYER },
          { x: 190, y: 270, value: p + 2, color: COLOR_PLAYER },
          { x: 190, y: 400, value: p, color: COLOR_PLAYER },
          { x: 460, y: 270, value: n, color: COLOR_NEUTRAL },
          ...(stage >= 3
            ? [{ x: 460, y: 150, value: Math.max(8, n - 6), color: COLOR_NEUTRAL }]
            : []),
          { x: 740, y: 270, value: boss, color: COLOR_ENEMY },
          ...(stage >= 4
            ? [{ x: 740, y: 140, value: scaleByStage(stage, 10, 18), color: COLOR_ENEMY }]
            : []),
        ],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
      };
    } else if (chapterIndex === 2) {
      // 第三章：群星夺秒 — 中列中立
      const p = scaleByStage(stage, 32, 28);
      const e = scaleByStage(stage, 28, 42);
      const star = scaleByStage(stage, 4, 10);
      const mid = scaleByStage(stage, 8, 14);
      const shorts = ["星列", "双星", "星雨", "围猎", "全占"];
      const neutrals = [
        { x: 480, y: 100, value: star, color: COLOR_NEUTRAL },
        { x: 480, y: 185, value: star, color: COLOR_NEUTRAL },
        { x: 480, y: 270, value: mid, color: COLOR_NEUTRAL },
        { x: 480, y: 355, value: star, color: COLOR_NEUTRAL },
        { x: 480, y: 440, value: star, color: COLOR_NEUTRAL },
      ];
      if (stage >= 3) {
        neutrals.push(
          { x: 400, y: 220, value: star, color: COLOR_NEUTRAL },
          { x: 560, y: 320, value: star, color: COLOR_NEUTRAL },
        );
      }
      level = {
        id,
        name: levelName(chapter, id, stage, shorts[stage - 1]),
        description:
          "中间星群尚未归属。速度就是生命，以最快速度占领并包围敌人！",
        cells: [
          { x: 200, y: 270, value: p, color: COLOR_PLAYER },
          ...neutrals,
          { x: 760, y: 270, value: e, color: COLOR_ENEMY },
          ...(stage >= 5
            ? [
                { x: 760, y: 150, value: scaleByStage(stage, 12, 16), color: COLOR_ENEMY },
                { x: 760, y: 390, value: scaleByStage(stage, 12, 16), color: COLOR_ENEMY },
              ]
            : []),
        ],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
      };
    } else if (chapterIndex === 3) {
      // 第四章：远程跃迁 — 跳板
      const p = scaleByStage(stage, 38, 32);
      const e = scaleByStage(stage, 40, 55);
      const step = scaleByStage(stage, 8, 14);
      const shorts = ["跳板", "双桥", "岔路", "远征", "深空"];
      const bridges = [
        { x: 360, y: 180, value: step, color: COLOR_NEUTRAL },
        { x: 360, y: 360, value: step, color: COLOR_NEUTRAL },
        { x: 560, y: 180, value: step, color: COLOR_NEUTRAL },
        { x: 560, y: 360, value: step, color: COLOR_NEUTRAL },
      ];
      if (stage >= 3) {
        bridges.push({ x: 460, y: 270, value: step + 2, color: COLOR_NEUTRAL });
      }
      if (stage >= 5) {
        bridges.push(
          { x: 460, y: 140, value: step, color: COLOR_NEUTRAL },
          { x: 460, y: 400, value: step, color: COLOR_NEUTRAL },
        );
      }
      level = {
        id,
        name: levelName(chapter, id, stage, shorts[stage - 1]),
        description:
          "远距射流杀伤衰减剧烈。借助中间中立细胞作跳板，逐步逼近敌巢。",
        cells: [
          { x: 160, y: 270, value: p, color: COLOR_PLAYER },
          ...bridges,
          { x: 800, y: 270, value: e, color: COLOR_ENEMY },
          ...(stage >= 4
            ? [{ x: 800, y: 150, value: scaleByStage(stage, 14, 22), color: COLOR_ENEMY }]
            : []),
        ],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
      };
    } else {
      // 第五章：切断补给 — 母巢 + 副巢
      const p = scaleByStage(stage, 28, 24);
      const n = scaleByStage(stage, 12, 18);
      const boss = scaleByStage(stage, 32, 50);
      const wing = scaleByStage(stage, 12, 22);
      const shorts = ["补给", "双翼", "切断", "围城", "终局"];
      level = {
        id,
        name: levelName(chapter, id, stage, shorts[stage - 1]),
        description:
          stage <= 2
            ? "敌方副巢为母巢输送能量。滑动划刀切断射流，伺机占领！"
            : "补给网更密，优先切断连线再蚕食副巢，最后拔掉母巢。",
        cells: [
          { x: 200, y: 270, value: p, color: COLOR_PLAYER },
          ...(stage >= 2
            ? [{ x: 200, y: 150, value: p - 4, color: COLOR_PLAYER }]
            : []),
          { x: 460, y: 150, value: n, color: COLOR_NEUTRAL },
          { x: 460, y: 390, value: n, color: COLOR_NEUTRAL },
          ...(stage >= 4
            ? [{ x: 460, y: 270, value: n + 2, color: COLOR_NEUTRAL }]
            : []),
          { x: 760, y: 270, value: boss, color: COLOR_ENEMY },
          { x: 760, y: 110, value: wing, color: COLOR_ENEMY },
          { x: 760, y: 430, value: wing, color: COLOR_ENEMY },
          ...(stage >= 5
            ? [
                { x: 640, y: 200, value: wing - 4, color: COLOR_ENEMY },
                { x: 640, y: 340, value: wing - 4, color: COLOR_ENEMY },
              ]
            : []),
        ],
        aiSeed,
        chapterId: chapter.id,
        background: chapter.background,
      };
    }

    list.push(level);
  }

  return list;
}

/** @type {LevelDef[]} */
export const LEVELS = CHAPTERS.flatMap((ch, i) => buildChapterLevels(ch, i));

/**
 * @param {number} index
 * @returns {LevelDef | undefined}
 */
export function getLevel(index) {
  return LEVELS[index];
}
