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

  // 辅助函数：十六进制颜色线性插值，支持颜色平滑过渡过程
  _interpolateColor(hex1, hex2, t) {
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);

    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    const toHex = (val) => {
      const h = val.toString(16);
      return h.length === 1 ? "0" + h : h;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  update(time) {
    // 2. 绘制透明细胞壁 (玻璃感双层质感)
    this.cellWallGraphics.clear();
    this.cellWallGraphics.circle(0, 0, this.radius + 4);
    this.cellWallGraphics.stroke({ color: this.wallColor, width: this.wallThickness, alpha: 0.22 });
    this.cellWallGraphics.fill({ color: this.wallColor, alpha: 0.02 });

    // 3. 处理母细胞旋转
    if (this.targetPoint && this.targetTentacleIndex !== undefined && this.targetTentacleIndex !== null) {
      // 目标点在父坐标系中的绝对方向
      const targetAngleGlobal = Math.atan2(this.targetPoint.y - this.y, this.targetPoint.x - this.x);
      
      // 鞭毛在细胞本地的基础相对角度
      const baseAngle = (this.targetTentacleIndex * 2 * Math.PI) / this.numTentacles;
      
      // 目标细胞旋转值 = 目标方向 - 鞭毛本地基础角度
      const targetRotation = targetAngleGlobal - baseAngle;
      
      // 平滑旋转过渡
      let rotationDiff = targetRotation - this.rotation;
      rotationDiff = Math.atan2(Math.sin(rotationDiff), Math.cos(rotationDiff)); // 限制在 [-PI, PI]
      this.rotation += rotationDiff * 0.03; // 微调旋转对准的速度
    }

    // 4. 绘制半透明鞭毛
    this.tentacleGraphics.clear();

    const targetIndex = (this.targetPoint && this.targetTentacleIndex !== null) ? this.targetTentacleIndex : -1;

    for (let i = 0; i < this.numTentacles; i++) {
      const baseAngle = (i * 2 * Math.PI) / this.numTentacles;
      const flagellaStartRadius = this.radius + 6;
      let lastX = Math.cos(baseAngle) * flagellaStartRadius;
      let lastY = Math.sin(baseAngle) * flagellaStartRadius;

      const segments = 18;
      const isTarget = i === targetIndex;

      // 如果是目标鞭毛，计算根部到本地目标点的总长度
      let targetLength = this.tentacleLength;
      if (isTarget && this.targetPoint) {
        const localTarget = this.toLocal(this.targetPoint);
        const dx = localTarget.x - lastX;
        const dy = localTarget.y - lastY;
        targetLength = Math.hypot(dx, dy);
      }

      // 我们可以在 Cell 实例上为每根鞭毛记录一个当前的伸展状态，以实现平滑的过渡
      if (!this.tentacleStates) {
        this.tentacleStates = Array.from({ length: this.numTentacles }, () => ({
          currentLength: this.tentacleLength,
          currentForkAngle: 0.85, // 初始分叉偏角
          targetLengthOverride: null, // 用于被连接时缩短的覆盖长度
        }));
      }

      const state = this.tentacleStates[i];

      // 我们需要实现分步骤萎缩：1. 先让分叉角 currentForkAngle 缩到 0；2. 分叉缩完后主干长度 currentLength 才开始收回。
      const isShrinking = state.targetLengthOverride === 0;

      // 判断这根鞭毛是否已经是建立连接锁死的管道态
      const isEstablishedPipeline = isTarget && this.targetPoint && !this.isDragging;

      // 跟踪主干长度是否基本已经伸长贴近到了目标细胞壁 (误差小于 3px 认为已触及)
      const hasTouchedTarget = isEstablishedPipeline && Math.abs(targetLength - state.currentLength) < 3.0;

      // 1. 分叉收合目标角度：
      // - 萎缩状态：目标为 0.0
      // - 已锁定的管道状态：【必须等主干长度完全碰上对方细胞壁】之后，分叉才开始向 0.0 收合，否则保持 0.85
      let targetForkAngle = 0.85;
      if (isShrinking) {
        targetForkAngle = 0.0;
      } else if (isEstablishedPipeline && hasTouchedTarget) {
        targetForkAngle = 0.0;
      }
      state.currentForkAngle += (targetForkAngle - state.currentForkAngle) * 0.08;

      // 如果有外部强制的长度覆盖（如萎缩到0）
      if (state.targetLengthOverride !== null && state.targetLengthOverride !== undefined) {
        // 主干收回逻辑：只有在分叉几乎合拢完毕（角度 < 0.15）时，主干长度才开始向覆盖目标（如 0）过渡
        if (!isShrinking || state.currentForkAngle < 0.15) {
          targetLength = state.targetLengthOverride;
        }
      }

      // 状态平滑过渡 (Lerp，调慢速度由 0.04 变为 0.01)
      const lerpSpeed = isShrinking ? 0.02 : 0.01; 
      state.currentLength += (targetLength - state.currentLength) * lerpSpeed;

      // 2. 管道粗细插值系数：
      // - 初始化系数
      if (state.currentThicknessFactor === undefined) {
        state.currentThicknessFactor = 0.0;
      }
      // - 触发条件：【必须在分叉已经合拢完毕 (角度 < 0.15)】之后，末梢才开始变粗，否则保持 0.0 默认粗细
      const isForkFinished = isEstablishedPipeline && state.currentForkAngle < 0.15;
      const targetThicknessFactor = isForkFinished ? 1.0 : 0.0;
      state.currentThicknessFactor += (targetThicknessFactor - state.currentThicknessFactor) * 0.05;

      for (let j = 0; j < segments; j++) {
        const ratio = j / segments;
        // 自然的蠕动幅度，如果正在被拖拽，则减少蠕动的抖动
        const amplitude = 0.08 * ratio * (isTarget ? 0.2 : 1.0);
        
        const wave = Math.sin(time * 1.2 - ratio * 4.0 + i * 1.3) * amplitude;
        const angle = baseAngle + wave;
        const dist = flagellaStartRadius + state.currentLength * ratio;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        // thickness 基础公式为 1.0 * (1 - ratio * 0.8)，其中 0.8 是末端缩水因子。
        // 如果 currentThicknessFactor 趋近于 1.0，则末端缩水因子变成 0，即厚度从根部到末梢一直是 1.0 粗细。
        const shrinkFactor = 0.8 * (1 - state.currentThicknessFactor);
        const thickness = 1.0 * (1 - ratio * shrinkFactor);
        const alpha = 0.35 * (1 - ratio * 0.6);
        const color = this.tentacleColor;

        this.tentacleGraphics.moveTo(lastX, lastY);
        this.tentacleGraphics.lineTo(x, y);
        this.tentacleGraphics.stroke({ color, width: thickness, alpha: Math.min(alpha, 1.0) });

        if (j === segments - 1) {
          // 分叉部分长度：如果正在合拢，让分叉自身的长度 forkLength 也随着分叉角度的萎缩等比缩减到 0
          const maxForkLength = isTarget ? 12.0 : 8.0;
          const forkLength = maxForkLength * (state.currentForkAngle / 0.85);

          if (forkLength > 0.1) {
            // 左分叉
            const leftAngle = angle + state.currentForkAngle;
            const leftX = x + Math.cos(leftAngle) * forkLength;
            const leftY = y + Math.sin(leftAngle) * forkLength;
            this.tentacleGraphics.moveTo(x, y);
            this.tentacleGraphics.lineTo(leftX, leftY);
            this.tentacleGraphics.stroke({ color, width: thickness, alpha: Math.min(alpha, 1.0) });
            // 右分叉
            const rightAngle = angle - state.currentForkAngle;
            const rightX = x + Math.cos(rightAngle) * forkLength;
            const rightY = y + Math.sin(rightAngle) * forkLength;
            this.tentacleGraphics.moveTo(x, y);
            this.tentacleGraphics.lineTo(rightX, rightY);
            this.tentacleGraphics.stroke({ color, width: thickness, alpha: Math.min(alpha, 1.0) });
          }
        }

        lastX = x;
        lastY = y;
      }
    }
  }

  setTargetPoint(point) {
    this.targetPoint = point;
    // 首次按下拖拽时锁死最近的鞭毛
    if (this.targetTentacleIndex === undefined || this.targetTentacleIndex === null) {
      const localTarget = this.toLocal(point);
      let minDist = Infinity;
      let targetIndex = 0;
      for (let i = 0; i < this.numTentacles; i++) {
        const baseAngle = (i * 2 * Math.PI) / this.numTentacles;
        const flagellaStartRadius = this.radius + 6;
        const rootX = Math.cos(baseAngle) * flagellaStartRadius;
        const rootY = Math.sin(baseAngle) * flagellaStartRadius;
        const dist = Math.hypot(localTarget.x - rootX, localTarget.y - rootY);
        if (dist < minDist) {
          minDist = dist;
          targetIndex = i;
        }
      }
      this.targetTentacleIndex = targetIndex;
    }
  }

  clearTargetPoint() {
    this.targetPoint = null;
    this.targetTentacleIndex = null;
    this.isEstablishedConnection = false;
    if (this.tentacleStates) {
      this.tentacleStates.forEach(state => {
        state.targetLengthOverride = null;
      });
    }
  }

  getTentacleTipPositions() {
    const tips = [];
    for (let i = 0; i < this.numTentacles; i++) {
      const baseAngle = (i * 2 * Math.PI) / this.numTentacles;
      const flagellaStartRadius = this.radius + 6;
      const length = this.tentacleStates && this.tentacleStates[i]
        ? this.tentacleStates[i].currentLength
        : this.tentacleLength;
      
      const forkAngle = this.tentacleStates && this.tentacleStates[i]
        ? this.tentacleStates[i].currentForkAngle
        : 0.85;

      const isTarget = (this.targetPoint && this.targetTentacleIndex === i);
      const forkLength = isTarget ? 12.0 : 8.0;

      // 末梢主节点坐标
      const localX = Math.cos(baseAngle) * (flagellaStartRadius + length);
      const localY = Math.sin(baseAngle) * (flagellaStartRadius + length);

      // 左分叉终端
      const leftAngle = baseAngle + forkAngle;
      const leftLocalX = localX + Math.cos(leftAngle) * forkLength;
      const leftLocalY = localY + Math.sin(leftAngle) * forkLength;
      const leftGlobal = this.toGlobal(new PIXI.Point(leftLocalX, leftLocalY));

      // 右分叉终端
      const rightAngle = baseAngle - forkAngle;
      const rightLocalX = localX + Math.cos(rightAngle) * forkLength;
      const rightLocalY = localY + Math.sin(rightAngle) * forkLength;
      const rightGlobal = this.toGlobal(new PIXI.Point(rightLocalX, rightLocalY));

      tips.push({
        index: i,
        left: { x: leftGlobal.x, y: leftGlobal.y },
        right: { x: rightGlobal.x, y: rightGlobal.y }
      });
    }
    return tips;
  }

  getTentacleRoots() {
    const roots = [];
    for (let i = 0; i < this.numTentacles; i++) {
      const baseAngle = (i * 2 * Math.PI) / this.numTentacles;
      // 之前是 radius + 6，这里改回 radius (或者 radius - 2)，让它往前伸深一点，完美贴在细胞壁表面上
      const flagellaStartRadius = this.radius;
      const localX = Math.cos(baseAngle) * flagellaStartRadius;
      const localY = Math.sin(baseAngle) * flagellaStartRadius;
      const globalPos = this.toGlobal(new PIXI.Point(localX, localY));
      roots.push({
        index: i,
        x: globalPos.x,
        y: globalPos.y
      });
    }
    return roots;
  }
}
