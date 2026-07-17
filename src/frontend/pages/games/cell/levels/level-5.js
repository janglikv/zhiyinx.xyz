import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";

/** 第五关：远程跃迁 */
export default {
  id: 5,
  name: "第五关：远程跃迁",
  description: "距离会让射流的杀伤力产生剧烈衰减。你无法直接攻击极其遥远的对手，必须借助中间的中立细胞作为跳板。",
  cells: [
    { x: 180, y: 270, value: 40, color: COLOR_PLAYER },
    { x: 360, y: 180, value: 10, color: COLOR_NEUTRAL },
    { x: 360, y: 360, value: 10, color: COLOR_NEUTRAL },
    { x: 580, y: 180, value: 10, color: COLOR_NEUTRAL },
    { x: 580, y: 360, value: 10, color: COLOR_NEUTRAL },
    { x: 780, y: 270, value: 45, color: COLOR_ENEMY },
  ],
  aiSeed: 105,
};
