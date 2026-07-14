import { TEAM_COLORS } from "./gameConfig";

function cell(x, y, team = "neutral", value = 0) {
  return {
    x,
    y,
    value: String(value),
    colors: { ...TEAM_COLORS[team] },
    options: team === "neutral"
      ? { grows: false, empty: true, team }
      : { team },
  };
}

export const CELL_LEVELS = [
  {
    id: 1,
    name: "初次接触",
    description: "夺取中央细胞，再进攻敌方。",
    ai: { thinkInterval: 1700, reserveEnergy: 8, attackRatio: 1.45 },
    cells: [cell(310, 270, "green", 15), cell(480, 270), cell(650, 270, "red", 15)],
  },
  {
    id: 2,
    name: "分岔争夺",
    description: "争夺上下两条扩张路线。",
    ai: { thinkInterval: 1100, reserveEnergy: 6, attackRatio: 1.25 },
    cells: [
      cell(210, 270, "green", 18), cell(390, 175), cell(390, 365),
      cell(570, 175), cell(570, 365), cell(750, 270, "red", 18),
    ],
  },
  {
    id: 3,
    name: "菌落对决",
    description: "双基地混战，选择进攻与支援路线。",
    ai: { thinkInterval: 750, reserveEnergy: 4, attackRatio: 1.08 },
    cells: [
      cell(190, 185, "green", 20), cell(190, 355, "green", 15),
      cell(375, 150), cell(375, 390), cell(480, 270), cell(585, 150), cell(585, 390),
      cell(770, 185, "red", 20), cell(770, 355, "red", 15),
    ],
  },
];
