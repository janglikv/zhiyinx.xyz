/** @typedef {'connect' | 'weaken' | 'attack' | 'done'} TutorialPhase */

/**
 * 引导文案（UI 层只读）
 * @type {Record<TutorialPhase, { index: number, total: number, title: string, hint: string }>}
 */
export const TUTORIAL_COPY = {
  connect: {
    index: 0,
    total: 3,
    title: "按住我方绿色细胞，拖向灰色中立细胞后松手",
    hint: "建立链路，准备占领",
  },
  weaken: {
    index: 1,
    total: 3,
    title: "保持链路，清空中立细胞的能量",
    hint: "归零后即可占领，转为我方绿色",
  },
  attack: {
    index: 2,
    total: 3,
    title: "以新占领的绿色细胞，锁定红色对抗细胞",
    hint: "松手连线，对其持续输出",
  },
  done: {
    index: 3,
    total: 3,
    title: "链路已接通，全面接敌",
    hint: "绿对我方 · 灰为中立 · 红为敌对",
  },
};

/** 完成步展示多久后自动卸引导（ms） */
export const TUTORIAL_DONE_AUTO_END_MS = 2800;

/** @type {TutorialPhase} */
export const TUTORIAL_START_PHASE = "connect";
