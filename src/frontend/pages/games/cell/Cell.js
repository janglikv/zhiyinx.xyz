import * as PIXI from "pixi.js";
import { generateCellTheme } from "./colorUtils";

// ==========================================
// 细胞自定义配置（在此直接修改即可生效）
// ==========================================
export const CELL_CONFIG = {
  wallThickness: 0.8,       // 细胞壁厚度
  wallColor: "#ffffff",     // 细胞壁颜色
  tentacleColor: "#ffffff",  // 鞭毛颜色
};

const BASE_COLORS = {
  green: "#10b981",
  blue: "#1d4ed8",
  purple: "#6d28d9",
  orange: "#c2410c",
  red: "#b91c1c",
  white: "#7c8ba1",
};

export class Cell extends PIXI.Container {
  constructor(options = {}) {
    super();

    this.radius = options.radius || 15;
    this.numTentacles = options.numTentacles || 8;
    this.tentacleLength = options.tentacleLength || 18;
    this.colorType = options.color || "green";
    
    // 从基础色动态计算整套主题颜色
    const baseColor = BASE_COLORS[this.colorType] || BASE_COLORS.green;
    this.theme = generateCellTheme(baseColor);

    // 使用顶部 CELL_CONFIG 配置，同时支持 options 传入覆盖
    this.wallThickness = options.wallThickness !== undefined ? options.wallThickness : CELL_CONFIG.wallThickness;
    this.wallColor = options.wallColor || CELL_CONFIG.wallColor;
    this.tentacleColor = options.tentacleColor || CELL_CONFIG.tentacleColor;

    this.tentacleGraphics = new PIXI.Graphics();
    this.addChild(this.tentacleGraphics);

    // 1. 动态渲染指定颜色的放射虹膜纹理
    this.cellTexture = this._createTexture();

    // 2. 细胞主体 Sprite
    this.cellBody = new PIXI.Sprite(this.cellTexture);
    this.cellBody.anchor.set(0.5);
    this.cellBody.width = this.radius * 2.2;
    this.cellBody.height = this.radius * 2.2;
    this.addChild(this.cellBody);

    // 3. 白色透明细胞壁层
    this.cellWallGraphics = new PIXI.Graphics();
    this.addChild(this.cellWallGraphics);
  }

  _createTexture() {
    const textureSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d");
    const cx = textureSize / 2;
    const cy = textureSize / 2;

    if (ctx) {
      // 虹膜基底色
      ctx.fillStyle = this.theme.bg;
      ctx.beginPath();
      ctx.arc(cx, cy, textureSize * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // 绘制放射状纤维条纹（使用确定性伪随机计算，且保证上下对称）
      const numStrands = 12;
      const half = numStrands / 2;
      for (let i = 0; i < numStrands; i++) {
        const angle = (i * Math.PI * 2) / numStrands;
        
        // 映射为对称索引以实现上下轴对称（对折对称）
        const symmetricI = i <= half ? i : numStrands - i;
        
        // 基于对称索引的确定性伪随机值
        const randLength = Math.abs(Math.sin(symmetricI * 12.9898)) % 1;
        const randAlpha = Math.abs(Math.sin(symmetricI * 78.233)) % 1;

        const lengthFactor = 0.65 + randLength * 0.35;
        const startDist = textureSize * 0.02;
        const endDist = textureSize * 0.46 * lengthFactor;

        const x1 = cx + Math.cos(angle) * startDist;
        const y1 = cy + Math.sin(angle) * startDist;
        const x2 = cx + Math.cos(angle) * endDist;
        const y2 = cy + Math.sin(angle) * endDist;

        ctx.strokeStyle = i % 2 === 0 ? this.theme.strand1 : this.theme.strand2;
        ctx.lineWidth = 9.0;
        ctx.globalAlpha = 0.25 + randAlpha * 0.35;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // 外层边缘渐变收束 (大幅放宽中心亮色区，只在 0.33 外围收束，且调低暗部遮罩强度以防压黑)
      const outerGrad = ctx.createRadialGradient(cx, cy, textureSize * 0.33, cx, cy, textureSize * 0.48);
      outerGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      outerGrad.addColorStop(0.85, this._hexToRgba(this.theme.bg, 0.35)); // 由 0.8 降至 0.35
      outerGrad.addColorStop(1, this._hexToRgba(this.theme.bg, 0.75));    // 由 1.0 降至 0.75
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, textureSize * 0.48, 0, Math.PI * 2);
      ctx.fill();

      // D. 叠加同心环形高光 (高光适度调亮至 0.25，使其在明亮基底上依然具有通透的光泽感)
      const rimGrad = ctx.createRadialGradient(cx, cy, textureSize * 0.10, cx, cy, textureSize * 0.47);
      rimGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      rimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.15)"); // 从 0.16 上调至 0.25
      rimGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, textureSize * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
    return PIXI.Texture.from(canvas);
  }

  // 辅助函数：十六进制颜色转 RGBA，为了外层渐变遮罩支持
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  update(time) {
    // 2. 绘制透明细胞壁 (玻璃感双层质感)
    this.cellWallGraphics.clear();
    this.cellWallGraphics.circle(0, 0, this.radius + 4);
    this.cellWallGraphics.stroke({ color: this.wallColor, width: this.wallThickness, alpha: 0.22 });
    this.cellWallGraphics.fill({ color: this.wallColor, alpha: 0.02 });

    // 3. 绘制半透明鞭毛 (小振幅温和蠕动)
    this.tentacleGraphics.clear();
    for (let i = 0; i < this.numTentacles; i++) {
      const baseAngle = (i * 2 * Math.PI) / this.numTentacles;
      
      const flagellaStartRadius = this.radius + 6;
      let lastX = Math.cos(baseAngle) * flagellaStartRadius;
      let lastY = Math.sin(baseAngle) * flagellaStartRadius;

      const segments = 18;
      for (let j = 0; j < segments; j++) {
        const ratio = j / segments;

        const amplitude = 0.08 * ratio;
        const wave = Math.sin(time * 1.2 - ratio * 4.0 + i * 1.3) * amplitude;
        
        const angle = baseAngle + wave;
        const dist = flagellaStartRadius + this.tentacleLength * ratio;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        const thickness = 1.0 * (1 - ratio * 0.8);
        const alpha = 0.35 * (1 - ratio * 0.6);
        const color = this.tentacleColor;

        this.tentacleGraphics.moveTo(lastX, lastY);
        this.tentacleGraphics.lineTo(x, y);
        this.tentacleGraphics.stroke({ color, width: thickness, alpha });

        if (j === segments - 1) {
          this.tentacleGraphics.circle(x, y, 0.2);
          this.tentacleGraphics.fill({ color: this.tentacleColor, alpha: 0.4 });
        }

        lastX = x;
        lastY = y;
      }
    }
  }
}
