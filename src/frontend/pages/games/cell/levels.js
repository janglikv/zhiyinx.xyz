import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "./constants";

export const LEVELS = [
  {
    id: 1,
    name: "第一关：基础增殖",
    description: "占领中立细胞，积蓄力量，消灭敌方细胞。拖拽己方细胞指向目标即可发射子弹。",
    cells: [
      { x: 300, y: 270, value: 25, color: COLOR_PLAYER },
      { x: 480, y: 270, value: 8, color: COLOR_NEUTRAL },
      { x: 660, y: 270, value: 20, color: COLOR_ENEMY },
    ],
    aiSeed: 101,
  },
  {
    id: 2,
    name: "第二关：切断补给",
    description: "敌方的副巢源源不断地为母巢输送能量。滑动划刀切断它们的红/绿射流，寻找机会占领它！",
    cells: [
      { x: 220, y: 270, value: 30, color: COLOR_PLAYER },
      { x: 480, y: 150, value: 15, color: COLOR_NEUTRAL },
      { x: 480, y: 390, value: 15, color: COLOR_NEUTRAL },
      { x: 740, y: 270, value: 45, color: COLOR_ENEMY },
      { x: 740, y: 120, value: 15, color: COLOR_ENEMY },
      { x: 740, y: 420, value: 15, color: COLOR_ENEMY },
    ],
    aiSeed: 102,
  },
  {
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
  },
  {
    id: 4,
    name: "第四关：合击突破",
    description: "敌方母巢极其庞大且自增极快，直接对攻难以取胜。联合你的多个分巢，将子弹合流压制它！",
    cells: [
      { x: 200, y: 160, value: 18, color: COLOR_PLAYER },
      { x: 200, y: 270, value: 18, color: COLOR_PLAYER },
      { x: 200, y: 380, value: 18, color: COLOR_PLAYER },
      { x: 480, y: 270, value: 20, color: COLOR_NEUTRAL },
      { x: 720, y: 270, value: 75, color: COLOR_ENEMY },
    ],
    aiSeed: 104,
  },
  {
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
  },
];
