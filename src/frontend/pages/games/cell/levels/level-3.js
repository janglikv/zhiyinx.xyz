import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 第三关：群星夺秒 */
export default {
  id: 3,
  name: "第三关：群星夺秒",
  description: "中间有一排未被激活的星群细胞。速度就是生命，以最快速度占领并包围敌人！",
  cells: [
    { x: 200, y: 270, value: 35, color: COLOR_PLAYER },
    { x: 480, y: 110, value: 5, color: COLOR_NEUTRAL },
    { x: 480, y: 190, value: 5, color: COLOR_NEUTRAL },
    { x: 480, y: 270, value: 10, color: COLOR_NEUTRAL },
    { x: 480, y: 350, value: 5, color: COLOR_NEUTRAL },
    { x: 480, y: 430, value: 5, color: COLOR_NEUTRAL },
    { x: 760, y: 270, value: 35, color: COLOR_ENEMY },
  ],
  aiSeed: 103,
};
