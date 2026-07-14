export const AUTO_GROWTH_INTERVAL = 1000;
export const MAX_ENERGY = 99;
export const BEAD_SPACING = 6;
export const CUT_ATTACK_SPEED_MULTIPLIER = 2;
export const CUT_MIN_LOSS_RATE = 0.25;
export const CUT_MAX_LOSS_RATE = 0.6;
export const CUT_FULL_LOSS_DISTANCE = 800;
export const LARGE_CELL_THRESHOLD = 50;
export const LARGE_CELL_GROWTH_MULTIPLIER = 2;
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const TEAM_COLORS = {
  green: {
    shadow: 0x00150c, dark: 0x0b5e27, main: 0x54c92b, light: 0x69dc32,
    highlight: 0xc1f56a, outline: 0x173f1c, poreRing: 0x2b8e21,
    pore: 0x17641e, poreDark: 0x0a3c18, centerDark: 0x0a2c17, center: 0x163c1e,
  },
  neutral: {
    shadow: 0x11151a, dark: 0x424952, main: 0x737d88, light: 0x929ca7,
    highlight: 0xd2d9df, outline: 0x30363d, poreRing: 0x59616b,
    pore: 0x424952, poreDark: 0x272d34, centerDark: 0x15191e, center: 0x2b3138,
  },
  red: {
    shadow: 0x240506, dark: 0x852427, main: 0xd94343, light: 0xee5553,
    highlight: 0xff9a82, outline: 0x5d171b, poreRing: 0xb52f32,
    pore: 0x8f2025, poreDark: 0x581319, centerDark: 0x2d0a0c, center: 0x4c1719,
  },
};

export function getInitialCells() {
  return [
    {
      x: 312,
      y: 270,
      value: "15",
      colors: { ...TEAM_COLORS.green },
      options: { team: "green" },
    },
    {
      x: 480,
      y: 270,
      value: "0",
      colors: { ...TEAM_COLORS.neutral },
      options: { grows: false, empty: true, team: "neutral" },
    },
    {
      x: 648,
      y: 270,
      value: "15",
      colors: { ...TEAM_COLORS.red },
      options: { team: "red" },
    },
  ];
}
