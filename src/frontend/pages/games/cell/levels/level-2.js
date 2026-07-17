import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 第二关：合击突破 */
export default {
  id: 2,
  name: "第二关：合击突破",
  description: "敌方母巢极其庞大且自增极快，直接对攻难以取胜。联合你的多个分巢，将子弹合流压制它！",
  cells: [
    { x: 200, y: 160, value: 18, color: COLOR_PLAYER },
    { x: 200, y: 270, value: 18, color: COLOR_PLAYER },
    { x: 200, y: 380, value: 18, color: COLOR_PLAYER },
    { x: 480, y: 270, value: 20, color: COLOR_NEUTRAL },
    { x: 720, y: 270, value: 75, color: COLOR_ENEMY },
  ],
  aiSeed: 102,
};
