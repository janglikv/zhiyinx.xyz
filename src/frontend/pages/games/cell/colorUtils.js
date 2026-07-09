/**
 * 将十六进制颜色字符串转换为 HSL 颜色值
 * @param {string} hex - 例如 "#10b981"
 * @returns {{h: number, s: number, l: number}} HSL 组成部分
 */
export function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * 将 HSL 颜色值转换为十六进制颜色字符串
 * @param {number} h - 色相 (0-360)
 * @param {number} s - 饱和度 (0-100)
 * @param {number} l - 亮度 (0-100)
 * @returns {string} 例如 "#10b981"
 */
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs((h / 60) % 2 - 1));
  let m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (val) => {
    let hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 通过单一基础色动态计算出细胞背景色（极暗版）以及条纹2（高亮版）
 * @param {string} baseColor - 十六进制颜色值
 * @returns {{bg: string, strand1: string, strand2: string}} 完整的颜色主题
 */
export function generateCellTheme(baseColor) {
  const { h, s, l } = hexToHsl(baseColor);
  return {
    bg: hslToHex(h, s, Math.max(5, l * 0.18)),        // 极暗背景色
    strand1: baseColor,                               // 主色 (条纹1)
    strand2: hslToHex(h, s, Math.min(95, l + 20)),    // 高亮色 (条纹2)
  };
}
