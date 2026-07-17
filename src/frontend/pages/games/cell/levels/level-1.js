import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 第一关：基础增殖 + 新手引导 */
export default {
  id: 1,
  name: "第一关：基础增殖",
  description: "占领中立细胞，积蓄力量，消灭敌方细胞。拖拽己方细胞指向目标即可发射子弹。",
  cells: [
    { x: 300, y: 270, value: 99, color: COLOR_PLAYER },
    { x: 480, y: 270, value: 12, color: COLOR_NEUTRAL },
    { x: 660, y: 270, value: 16, color: COLOR_ENEMY },
  ],
  aiSeed: 101,
  /** 启用基础占领引导（见 tutorial/controller） */
  tutorial: "basic-capture",
};
