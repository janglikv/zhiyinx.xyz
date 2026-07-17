import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 第二关：切断补给 */
export default {
  id: 2,
  name: "第二关：切断补给",
  description: "敌方的副巢源源不断地为母巢输送能量。滑动划刀切断它们的红/绿射流，寻找机会占领它！",
  cells: [
    { x: 220, y: 270, value: 30, color: COLOR_PLAYER },
    { x: 480, y: 150, value: 15, color: COLOR_NEUTRAL },
    { x: 480, y: 390, value: 15, color: COLOR_NEUTRAL },
    { x: 740, y: 270, value: 40, color: COLOR_ENEMY },
    { x: 740, y: 120, value: 15, color: COLOR_ENEMY },
    { x: 740, y: 420, value: 15, color: COLOR_ENEMY },
  ],
  aiSeed: 102,
};
