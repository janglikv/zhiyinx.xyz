import * as PIXI from "pixi.js";
import {
  MAX_ENERGY,
  LARGE_CELL_THRESHOLD,
  GROWTH_BASE,
  GROWTH_PER_UNIT,
  GROWTH_MIN,
  RADIUS_ANIM_SPEED,
  ENERGY_EPS,
  COLOR_PLAYER,
  COLOR_ENEMY,
  COLOR_NEUTRAL,
} from "./constants";

// 对外仍可从 cell 入口引用这些常量
export {
  MAX_ENERGY,
  LARGE_CELL_THRESHOLD,
  GROWTH_BASE,
  GROWTH_PER_UNIT,
  GROWTH_MIN,
  RADIUS_ANIM_SPEED,
  ENERGY_EPS,
  COLOR_PLAYER,
  COLOR_ENEMY,
  COLOR_NEUTRAL,
};

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function unpack(color) {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

function pack(r, g, b) {
  return (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const gray = l * 255;
    return [gray, gray, gray];
  }

  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

/**
 * 在 HSL 空间调节 base 色：
 * - h：色相偏移（0~1）
 * - sMul / lMul：饱和度、亮度倍率
 * - s / l：饱和度、亮度加减
 */
function adjustColor(base, { h = 0, s = 0, l = 0, sMul = 1, lMul = 1 } = {}) {
  const [r, g, b] = unpack(base);
  const [hh, ss, ll] = rgbToHsl(r, g, b);
  const nextH = ((hh + h) % 1 + 1) % 1;
  const nextS = clamp01(ss * sMul + s);
  const nextL = clamp01(ll * lMul + l);
  return pack(...hslToRgb(nextH, nextS, nextL));
}

/**
 * 仅用 base 色推导绘制所需的全部色阶。
 * 用 HSL 压暗/提亮并保持饱和，避免 RGB 掺白导致发灰发飘。
 */
export function derivePalette(base) {
  return {
    main: base,
    // 受光面：略提亮并加一点饱和
    light: adjustColor(base, { l: 0.1, sMul: 1.08 }),
    // 高光：提亮但保留色相，略偏暖，不做发白
    highlight: adjustColor(base, { l: 0.2, sMul: 0.92, h: 0.025 }),
    // 暗部：压低亮度、抬高饱和，轮廓更立体
    dark: adjustColor(base, { lMul: 0.42, sMul: 1.25 }),
    shadow: adjustColor(base, { lMul: 0.1, sMul: 0.95 }),
    outline: adjustColor(base, { lMul: 0.24, sMul: 1.2 }),
    poreRing: adjustColor(base, { lMul: 0.52, sMul: 1.28 }),
    pore: adjustColor(base, { lMul: 0.38, sMul: 1.22 }),
    poreDark: adjustColor(base, { lMul: 0.22, sMul: 1.1 }),
    centerDark: adjustColor(base, { lMul: 0.14, sMul: 0.9 }),
    center: adjustColor(base, { lMul: 0.28, sMul: 1.0 }),
  };
}

function createCellDrawers(colors) {
  function drawShadow(graphics, radius) {
    // 不用 BlurFilter：半径变化时滤镜包围盒会留下方形残影。
    // 多层半透明椭圆模拟柔和投影。
    graphics.clear()
      .ellipse(3, 4, radius + 8, radius + 6).fill({ color: colors.shadow, alpha: 0.12 })
      .ellipse(2.5, 3.5, radius + 5.5, radius + 4).fill({ color: colors.shadow, alpha: 0.18 })
      .ellipse(2, 3, radius + 3.5, radius + 2.5).fill({ color: colors.shadow, alpha: 0.28 })
      .ellipse(1.5, 2.5, radius + 1.5, radius + 1).fill({ color: colors.shadow, alpha: 0.22 });
  }

  function drawBody(graphics, radius) {
    graphics.clear()
      // 底侧暗边，增强体积感
      .circle(1.2, 1.8, radius).fill({ color: colors.shadow })
      .circle(0.4, 0.6, radius).fill({ color: colors.dark, alpha: 0.55 })
      .circle(0, 0, radius).fill({ color: colors.main })
      // 左上受光
      .circle(-radius * 0.18, -radius * 0.22, radius * 0.78).fill({ color: colors.light, alpha: 0.72 })
      .ellipse(-radius * 0.28, -radius * 0.38, radius * 0.48, radius * 0.34)
      .fill({ color: colors.highlight, alpha: 0.42 })
      .circle(0, 0, radius).stroke({ color: colors.outline, width: 1.35, alpha: 0.92 })
      .circle(0, 0, radius - 1.6).stroke({ color: colors.light, width: 0.9, alpha: 0.45 });
  }

  function drawBump(graphics, radius) {
    graphics.clear()
      .circle(0.7, 0.9, radius + 0.85).fill({ color: colors.dark })
      .circle(0, 0, radius).fill({ color: colors.main })
      .circle(-0.55, -0.7, radius * 0.42).fill({ color: colors.light, alpha: 0.9 })
      .circle(-0.75, -0.95, radius * 0.22).fill({ color: colors.highlight, alpha: 0.7 });
  }

  function drawFlagellum(graphics, length) {
    graphics.clear()
      .moveTo(-1, 0)
      .lineTo(length, 0)
      .stroke({ color: colors.light, width: 1.25, alpha: 0.82 });
  }

  function drawPore(graphics, radius) {
    graphics.clear()
      .circle(0.35, 0.55, radius + 0.75).fill({ color: colors.dark, alpha: 0.9 })
      .circle(0, 0, radius).fill({ color: colors.pore })
      .ellipse(-radius * 0.25, -radius * 0.3, radius * 0.52, radius * 0.35)
      .fill({ color: colors.poreDark, alpha: 0.82 })
      .circle(-radius * 0.32, -radius * 0.38, Math.max(0.4, radius * 0.16))
      .fill({ color: colors.light, alpha: 0.65 });
  }

  function drawCenter(graphics) {
    graphics.clear()
      .circle(0.6, 0.8, 9.2).fill({ color: colors.shadow, alpha: 0.55 })
      .circle(0, 0.5, 9).fill({ color: colors.centerDark, alpha: 0.98 })
      .circle(-0.5, -0.25, 8.1).fill({ color: colors.center })
      .ellipse(-2.2, -2.4, 3.6, 2.1).fill({ color: colors.light, alpha: 0.28 })
      .circle(0, 0.25, 8.4).stroke({ color: colors.outline, width: 0.7, alpha: 0.75 });
  }

  function drawSheen(graphics, radius) {
    graphics.clear()
      .ellipse(-radius * 0.68, -radius * 0.28, 7.5, 13.5).fill({ color: colors.highlight, alpha: 0.18 })
      .ellipse(-radius * 0.42, -radius * 0.48, 2.8, 6.2).fill({ color: colors.light, alpha: 0.16 });
  }

  function drawHint(graphics, radius, target = false) {
    graphics.clear()
      .circle(0, 0, radius).stroke({ color: colors.highlight, width: target ? 11 : 9, alpha: target ? 0.38 : 0.32 })
      .circle(0, 0, radius).stroke({ color: colors.highlight, width: target ? 6 : 5, alpha: target ? 0.7 : 0.58 })
      .circle(0, 0, radius).stroke({ color: 0xffffff, width: target ? 2.2 : 1.8, alpha: target ? 1 : 0.95 });
  }

  return { drawShadow, drawBody, drawBump, drawFlagellum, drawPore, drawCenter, drawSheen, drawHint };
}

function radiusFromValue(value) {
  const v = Math.max(0, value);
  return Math.min(40, Math.max(16, 14 + Math.sqrt(v) * 1.6));
}

/**
 * 界面上显示的整数能量（内部仍是浮点）。
 * 向上取整：只要还有残余能量就至少显示 1，避免 UI 已是 0 却还能再扛几下。
 */
export function displayEnergy(value) {
  const v = Math.max(0, value);
  if (v <= ENERGY_EPS) return 0;
  // 减去极小量，避免 3.0000002 这类浮点误差被抬到 4
  return Math.ceil(v - ENERGY_EPS);
}

/**
 * 细胞实体：外观、能量显示、选中高亮与闲置动画。
 * 只需传入 base 色 `color`，其余色阶自动推导。
 * 选中 / 改能量的输入逻辑由外部控制层负责。
 */
export class Cell {
  /**
   * @param {object} options
   * @param {number} options.x
   * @param {number} options.y
   * @param {number} [options.value=0]
   * @param {number} options.color - base 颜色，如 0x54c92b
   */
  constructor({ x, y, value = 0, color }) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.colors = derivePalette(color);
    // 内部浮点能量；UI 仅显示整数
    this.value = Math.max(0, Math.min(MAX_ENERGY, Number(value) || 0));
    this._selected = false;
    /** @type {false | 'source' | 'target'} 引导高亮：操作源 / 指向目标 */
    this._tutorialHighlight = false;
    this._displayEnergy = displayEnergy(this.value);

    const drawers = createCellDrawers(this.colors);
    this._draw = drawers;

    const cellRadius = radiusFromValue(this.value);
    const detailRadius = radiusFromValue(60);
    const bumpCount = Math.round((Math.PI * 2 * detailRadius) / 8);
    const poreCount = Math.max(2, Math.round((detailRadius ** 2 - 9 ** 2) / 55));

    this.container = new PIXI.Container();
    this.container.position.set(x, y);
    // 瞄准射线需要命中所有细胞；仅玩家细胞显示可拖拽光标
    this.container.eventMode = "static";
    this.container.hitArea = new PIXI.Circle(0, 0, Math.max(20, cellRadius + 5));
    this._syncInteraction();

    this._shadow = new PIXI.Graphics();
    drawers.drawShadow(this._shadow, cellRadius);

    this._membrane = new PIXI.Container();
    this._flagella = new PIXI.Container();
    this._flagellumSprites = [];
    this._bumpSprites = [];
    this._bumpAngleOffset = Math.random() * Math.PI * 2;
    this._bumpOrder = [];
    this._poreOrder = [];

    for (let index = 0; index < 12; index += 1) {
      const angle = this._bumpAngleOffset + (index / 12) * Math.PI * 2;
      const length = 10 + (index % 3) * 2.5;
      const flagellum = new PIXI.Graphics();
      drawers.drawFlagellum(flagellum, length);
      flagellum.visible = false;
      this._flagella.addChild(flagellum);
      this._flagellumSprites.push({
        flagellum, angle, length, phase: index * 0.91, appearance: 0, targetVisible: false,
      });
    }

    for (let index = 0; index < bumpCount; index += 1) {
      const angle = (this._bumpAngleOffset + index * 2.399) % (Math.PI * 2);
      const bumpX = Math.cos(angle) * (cellRadius + 1.5);
      const bumpY = Math.sin(angle) * (cellRadius + 1.5);
      const radius = index % 3 === 0 ? 3 : 2.5;
      const bump = new PIXI.Graphics();
      drawers.drawBump(bump, radius);
      bump.position.set(bumpX, bumpY);
      this._membrane.addChild(bump);
      this._bumpSprites.push({
        bump, x: bumpX, y: bumpY, radius, angle, targetAngle: angle,
        phase: index * 0.83, appearance: 0, targetVisible: false,
      });
    }

    this._body = new PIXI.Graphics();
    drawers.drawBody(this._body, cellRadius);

    this._sheen = new PIXI.Container();
    this._sheenShape = new PIXI.Graphics();
    drawers.drawSheen(this._sheenShape, cellRadius);
    this._sheenMask = new PIXI.Graphics().circle(0, 0, cellRadius - 2).fill(0xffffff);
    this._sheen.addChild(this._sheenShape, this._sheenMask);
    this._sheen.mask = this._sheenMask;

    this._pores = new PIXI.Container();
    this._poreSprites = [];
    for (let index = 0; index < poreCount; index += 1) {
      const angle = index * 2.399 + 0.5;
      const distanceFromCenter = (12 + cellRadius - 4) / 2;
      const poreX = Math.cos(angle) * distanceFromCenter;
      const poreY = Math.sin(angle) * distanceFromCenter;
      const radius = index % 3 === 0 ? 2.4 : 1.8;
      const pore = new PIXI.Graphics();
      drawers.drawPore(pore, radius);
      pore.position.set(poreX, poreY);
      this._pores.addChild(pore);
      this._poreSprites.push({
        pore, radius, angle, targetAngle: angle, appearance: 0, targetVisible: false,
      });
    }

    this._center = new PIXI.Graphics();
    drawers.drawCenter(this._center);

    this._valueText = new PIXI.Text({
      text: String(this._displayEnergy),
      style: {
        fontFamily: "Arial, sans-serif",
        fontSize: 11.5,
        fontWeight: "700",
        fill: 0xffffff,
        stroke: { color: this.colors.centerDark, width: 0.8 },
      },
    });
    this._valueText.anchor.set(0.5);
    this._valueText.position.set(0, 1);

    this._selection = new PIXI.Graphics();
    drawers.drawHint(this._selection, cellRadius);
    this._selection.visible = false;

    this.container.addChild(
      this._shadow,
      this._flagella,
      this._membrane,
      this._body,
      this._sheen,
      this._pores,
      this._center,
      this._valueText,
      this._selection,
    );

    this.radius = cellRadius;
    this._targetRadius = cellRadius;
    this._lastDrawnRadius = cellRadius;
    this._detailScale = 1;
    this._sheenRange = cellRadius * 0.35;

    this._syncValueVisuals(this.value);
    this._applyRadiusVisuals(this.radius);
  }

  setSelected(selected) {
    this._selected = !!selected;
    this._refreshHintRing();
  }

  /**
   * 新手引导高亮闪烁。
   * @param {false | 'source' | 'target'} mode
   */
  setTutorialHighlight(mode) {
    const next = mode === "source" || mode === "target" ? mode : false;
    if (this._tutorialHighlight === next) {
      this._selection.visible = this._selected || !!this._tutorialHighlight;
      return;
    }
    this._tutorialHighlight = next;
    this._refreshHintRing();
  }

  _refreshHintRing() {
    const show = this._selected || !!this._tutorialHighlight;
    this._selection.visible = show;
    if (!show) {
      this._selection.alpha = 1;
      return;
    }
    const asTarget = this._tutorialHighlight === "target";
    this._draw.drawHint(this._selection, this.radius, asTarget);
  }

  changeValue(delta) {
    this.setValue(this.value + delta);
  }

  setValue(nextValue) {
    const parsed = Number(nextValue);
    // 不用 `|| 0`：避免把合法计算误伤；非有限数则忽略本次写入
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(0, Math.min(MAX_ENERGY, parsed));
    if (Math.abs(next - this.value) < ENERGY_EPS) {
      // 贴 0 / 上限时夹紧，避免残留极小值
      if (next < ENERGY_EPS) this.value = 0;
      else if (next > MAX_ENERGY - ENERGY_EPS) this.value = MAX_ENERGY;
      return;
    }
    this.value = next < ENERGY_EPS ? 0 : next;
    this._targetRadius = radiusFromValue(this.value);
    // 浮点每帧自增只更新半径目标；显示整数变化时再同步数字/细节
    if (displayEnergy(this.value) !== this._displayEnergy) {
      this._syncValueVisuals(this.value);
    }
  }

  /** 运行时换 base 色，自动重算色阶并重绘 */
  setColor(color) {
    if (color === this.color) return;
    this.color = color;
    this.colors = derivePalette(color);
    this._draw = createCellDrawers(this.colors);

    this._bumpSprites.forEach(({ bump, radius }) => this._draw.drawBump(bump, radius));
    this._flagellumSprites.forEach(({ flagellum, length }) => this._draw.drawFlagellum(flagellum, length));
    this._poreSprites.forEach(({ pore, radius }) => this._draw.drawPore(pore, radius));
    this._draw.drawCenter(this._center);
    this._draw.drawSheen(this._sheenShape, this.radius);
    this._valueText.style.stroke = { color: this.colors.centerDark, width: 0.8 };
    this._applyRadiusVisuals(this.radius, { force: true });
    this._syncInteraction();
  }

  isPlayer() {
    return this.color === COLOR_PLAYER;
  }

  isEnemy() {
    return this.color === COLOR_ENEMY;
  }

  isNeutral() {
    return this.color === COLOR_NEUTRAL;
  }

  /** 中立不自增；被染色后随阵营恢复 */
  canGrow() {
    return !this.isNeutral();
  }

  _syncInteraction() {
    // 玩家可拖；敌/中立仅作瞄准落点，不显示 pointer
    this.container.cursor = this.isPlayer() ? "pointer" : "default";
  }

  /**
   * 自增能量（浮点连续）：中立跳过；其余能量为 0 也会长；越大越快，封顶 MAX_ENERGY。
   * @param {number} deltaMS
   */
  tickGrowth(deltaMS) {
    if (!this.canGrow()) return;
    if (this.value >= MAX_ENERGY - ENERGY_EPS) {
      this.value = MAX_ENERGY;
      return;
    }
    const raw = GROWTH_BASE + Math.max(0, this.value) * GROWTH_PER_UNIT;
    const rate = Math.max(GROWTH_MIN, raw);
    this.changeValue(rate * (deltaMS / 1000));
  }

  update(deltaMS, elapsed, cellIndex = 0) {
    this.tickGrowth(deltaMS);
    this._tickRadius(deltaMS);

    if (this._tutorialHighlight) {
      // 引导：更快更明显的呼吸闪烁
      this._selection.alpha = 0.3 + (Math.sin(elapsed * 0.16 + cellIndex) * 0.5 + 0.5) * 0.7;
    } else if (this._selected) {
      this._selection.alpha = 0.55 + Math.sin(elapsed * 0.08 + cellIndex) * 0.45;
    }

    const { radius, _detailScale: detailScale, _sheenRange: sheenRange } = this;

    this._flagellumSprites.forEach((item) => {
      const target = item.targetVisible ? 1 : 0;
      item.appearance += (target - item.appearance) * Math.min(1, deltaMS / 260);
      const sway = Math.sin(elapsed * 0.035 + item.phase + cellIndex) * 0.13;
      item.flagellum.position.set(
        Math.cos(item.angle) * (radius - 1),
        Math.sin(item.angle) * (radius - 1),
      );
      item.flagellum.rotation = item.angle + sway;
      item.flagellum.visible = item.appearance > 0.01;
      item.flagellum.alpha = item.appearance;
      item.flagellum.scale.set(item.appearance * detailScale);
    });

    this._bumpSprites.forEach((item) => {
      const angleDelta = Math.atan2(
        Math.sin(item.targetAngle - item.angle),
        Math.cos(item.targetAngle - item.angle),
      );
      item.angle += angleDelta * Math.min(1, deltaMS / 360);
      const sway = Math.sin(elapsed * 0.025 + item.phase + cellIndex) * 0.45;
      item.x = Math.cos(item.angle) * (radius + 1.5);
      item.y = Math.sin(item.angle) * (radius + 1.5);
      item.bump.position.set(
        item.x - Math.sin(item.angle) * sway,
        item.y + Math.cos(item.angle) * sway,
      );

      const target = item.targetVisible ? 1 : 0;
      item.appearance += (target - item.appearance) * Math.min(1, deltaMS / 180);
      item.bump.visible = item.appearance > 0.01;
      item.bump.alpha = item.appearance;
      item.bump.scale.set((0.45 + item.appearance * 0.55) * detailScale);
    });

    this._poreSprites.forEach((item) => {
      const angleDelta = Math.atan2(
        Math.sin(item.targetAngle - item.angle),
        Math.cos(item.targetAngle - item.angle),
      );
      item.angle += angleDelta * Math.min(1, deltaMS / 360);
      const ringRadius = (12 + radius - 4) / 2;
      item.pore.position.set(
        Math.cos(item.angle) * ringRadius,
        Math.sin(item.angle) * ringRadius,
      );

      const target = item.targetVisible ? 1 : 0;
      item.appearance += (target - item.appearance) * Math.min(1, deltaMS / 180);
      item.pore.visible = item.appearance > 0.01;
      item.pore.alpha = item.appearance;
      item.pore.scale.set((0.45 + item.appearance * 0.55) * detailScale);
    });

    this._sheenShape.x = Math.sin(elapsed * 0.008 + cellIndex) * sheenRange;
    this._sheenShape.y = Math.cos(elapsed * 0.006 + cellIndex) * sheenRange * 0.24;
    this._sheenShape.alpha = 0.8 + Math.sin(elapsed * 0.012 + cellIndex) * 0.2;
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  /** 半径匀速追向目标（线性，非指数缓动） */
  _tickRadius(deltaMS) {
    this._targetRadius = radiusFromValue(this.value);
    const target = this._targetRadius;
    const diff = target - this.radius;
    if (Math.abs(diff) < 0.02) {
      if (this.radius !== target) {
        this.radius = target;
        this._applyRadiusVisuals(this.radius);
      }
      return;
    }
    const step = RADIUS_ANIM_SPEED * (deltaMS / 1000);
    if (Math.abs(diff) <= step) {
      this.radius = target;
    } else {
      this.radius += Math.sign(diff) * step;
    }
    this._applyRadiusVisuals(this.radius);
  }

  /** 随能量立刻更新：数字、鞭毛/凸起/气孔数量（与半径动画解耦） */
  _syncValueVisuals(currentValue) {
    const currentDetailRadius = radiusFromValue(Math.min(currentValue, 60));
    const currentBumpCount = Math.round((Math.PI * 2 * currentDetailRadius) / 8);
    const currentPoreCount = Math.max(2, Math.round((currentDetailRadius ** 2 - 9 ** 2) / 55));

    this._flagellumSprites.forEach((item) => {
      item.targetVisible = currentValue > LARGE_CELL_THRESHOLD;
    });

    // 仅显示整数；内部 value 仍是浮点
    const shown = displayEnergy(currentValue);
    if (shown !== this._displayEnergy) {
      this._displayEnergy = shown;
      this._valueText.text = String(shown);
    }
    // 0 也显示，方便看到空细胞仍在自增
    this._valueText.visible = true;

    while (this._bumpOrder.length > currentBumpCount) {
      this._bumpOrder.splice(Math.floor(Math.random() * this._bumpOrder.length), 1);
    }
    while (this._bumpOrder.length < currentBumpCount) {
      const newIndex = this._bumpSprites.findIndex((_, index) => !this._bumpOrder.includes(index));
      this._bumpOrder.splice(Math.floor(Math.random() * (this._bumpOrder.length + 1)), 0, newIndex);
    }
    const activeBumps = new Set(this._bumpOrder);
    this._bumpSprites.forEach((item, index) => { item.targetVisible = activeBumps.has(index); });
    this._bumpOrder.forEach((itemIndex, slot) => {
      const item = this._bumpSprites[itemIndex];
      item.targetAngle = this._bumpAngleOffset + (slot / currentBumpCount) * Math.PI * 2;
      if (item.appearance === 0) item.angle = item.targetAngle;
    });

    while (this._poreOrder.length > currentPoreCount) {
      this._poreOrder.splice(Math.floor(Math.random() * this._poreOrder.length), 1);
    }
    while (this._poreOrder.length < currentPoreCount) {
      const newIndex = this._poreSprites.findIndex((_, index) => !this._poreOrder.includes(index));
      this._poreOrder.splice(Math.floor(Math.random() * (this._poreOrder.length + 1)), 0, newIndex);
    }
    const activePores = new Set(this._poreOrder);
    this._poreSprites.forEach((item, index) => { item.targetVisible = activePores.has(index); });
    this._poreOrder.forEach((itemIndex, slot) => {
      const item = this._poreSprites[itemIndex];
      item.targetAngle = 0.5 + (slot / currentPoreCount) * Math.PI * 2;
      if (item.appearance === 0) item.angle = item.targetAngle;
    });
  }

  /**
   * 按当前显示半径重绘轮廓相关图形。
   * @param {number} radius
   * @param {{ force?: boolean }} [options]
   */
  _applyRadiusVisuals(radius, { force = false } = {}) {
    const radiusAtDetailLimit = radiusFromValue(60);
    this._detailScale = this.value > 60 ? radius / radiusAtDetailLimit : 1;
    this._sheenRange = radius * 0.35;

    if (!force) {
      if (radius === this._lastDrawnRadius) return;
      // 动画中途跳过过密重绘；到位时（接近 target）始终画准
      const settled = Math.abs(radius - this._targetRadius) < 0.02;
      if (!settled && Math.abs(radius - this._lastDrawnRadius) < 0.15) return;
    }

    this._lastDrawnRadius = radius;
    this.container.hitArea = new PIXI.Circle(0, 0, Math.max(20, radius + 5));
    this._draw.drawShadow(this._shadow, radius);
    this._draw.drawBody(this._body, radius);
    this._sheenMask.clear().circle(0, 0, radius - 2).fill(0xffffff);
    const asTarget = this._tutorialHighlight === "target";
    this._draw.drawHint(this._selection, radius, asTarget);
  }
}
