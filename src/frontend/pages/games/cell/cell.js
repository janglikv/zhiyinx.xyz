import * as PIXI from "pixi.js";

export const MAX_ENERGY = 99;
export const LARGE_CELL_THRESHOLD = 50;

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function unpack(color) {
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

function pack(r, g, b) {
  return (clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b);
}

/** t=0 为 a，t=1 为 b */
function mixColor(a, b, t) {
  const [ar, ag, ab] = unpack(a);
  const [br, bg, bb] = unpack(b);
  return pack(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  );
}

/** 仅用 base 色推导绘制所需的全部色阶 */
export function derivePalette(base) {
  return {
    main: base,
    light: mixColor(base, 0xffffff, 0.22),
    highlight: mixColor(base, 0xffffff, 0.58),
    dark: mixColor(base, 0x000000, 0.55),
    shadow: mixColor(base, 0x000000, 0.88),
    outline: mixColor(base, 0x000000, 0.72),
    poreRing: mixColor(base, 0x000000, 0.38),
    pore: mixColor(base, 0x000000, 0.55),
    poreDark: mixColor(base, 0x000000, 0.72),
    centerDark: mixColor(base, 0x000000, 0.78),
    center: mixColor(base, 0x000000, 0.65),
  };
}

function createCellDrawers(colors) {
  function drawShadow(graphics, radius) {
    graphics.clear().ellipse(2, 3, radius + 4, radius + 3)
      .fill({ color: colors.shadow, alpha: 0.55 });
  }

  function drawBody(graphics, radius) {
    graphics.clear()
      .circle(1, 1.5, radius).fill({ color: colors.shadow })
      .circle(0, 0, radius).fill({ color: colors.main })
      .circle(-1.5, -2, radius - 2.5).fill({ color: colors.light })
      .ellipse(-radius * 0.25, -radius * 0.35, radius * 0.58, radius * 0.42)
      .fill({ color: colors.highlight, alpha: 0.34 })
      .circle(0, 0, radius).stroke({ color: colors.outline, width: 1.2, alpha: 0.85 })
      .circle(0, 0, radius - 1.8).stroke({ color: colors.highlight, width: 0.8, alpha: 0.62 });
  }

  function drawBump(graphics, radius) {
    graphics.clear()
      .circle(0.6, 0.8, radius + 0.8).fill({ color: colors.dark })
      .circle(0, 0, radius).fill({ color: colors.main })
      .circle(-0.6, -0.8, radius * 0.48).fill({ color: colors.highlight, alpha: 0.75 });
  }

  function drawFlagellum(graphics, length) {
    graphics.clear()
      .moveTo(-1, 0)
      .lineTo(length, 0)
      .stroke({ color: colors.highlight, width: 1.25, alpha: 0.76 });
  }

  function drawPore(graphics, radius) {
    graphics.clear()
      .circle(0.3, 0.5, radius + 0.7).fill({ color: colors.poreRing, alpha: 0.85 })
      .circle(0, 0, radius).fill({ color: colors.pore })
      .ellipse(-radius * 0.25, -radius * 0.3, radius * 0.52, radius * 0.35)
      .fill({ color: colors.poreDark, alpha: 0.78 })
      .circle(-radius * 0.32, -radius * 0.38, Math.max(0.4, radius * 0.16))
      .fill({ color: colors.highlight, alpha: 0.7 });
  }

  function drawCenter(graphics) {
    graphics.clear()
      .circle(0, 0.5, 9).fill({ color: colors.centerDark, alpha: 0.96 })
      .circle(-0.5, -0.25, 8.25).fill({ color: colors.center })
      .circle(0, 0.25, 8.5).stroke({ color: colors.highlight, width: 0.6, alpha: 0.55 });
  }

  function drawSheen(graphics, radius) {
    graphics.clear()
      .ellipse(-radius * 0.7, -radius * 0.25, 7, 13).fill({ color: colors.highlight, alpha: 0.13 })
      .ellipse(-radius * 0.4, -radius * 0.45, 3, 7).fill({ color: 0xffffff, alpha: 0.11 });
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
  return Math.min(40, Math.max(16, 14 + Math.sqrt(value) * 1.6));
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
    this.value = Math.min(MAX_ENERGY, Number(value));
    this._selected = false;

    const drawers = createCellDrawers(this.colors);
    this._draw = drawers;

    const cellRadius = radiusFromValue(this.value);
    const detailRadius = radiusFromValue(60);
    const bumpCount = Math.round((Math.PI * 2 * detailRadius) / 8);
    const poreCount = Math.max(2, Math.round((detailRadius ** 2 - 9 ** 2) / 55));

    this.container = new PIXI.Container();
    this.container.position.set(x, y);
    this.container.eventMode = "static";
    this.container.cursor = "pointer";
    this.container.hitArea = new PIXI.Circle(0, 0, Math.max(20, cellRadius + 5));

    this._shadow = new PIXI.Graphics();
    drawers.drawShadow(this._shadow, cellRadius);
    this._shadow.filters = [new PIXI.BlurFilter({ strength: 4 })];

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
      text: String(Math.floor(this.value)),
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
    this._detailScale = 1;
    this._sheenRange = cellRadius * 0.35;

    this._renderGrowth(this.value);
  }

  setSelected(selected) {
    this._selected = selected;
    this._selection.visible = selected;
    if (!selected) this._selection.alpha = 1;
  }

  changeValue(delta) {
    this.setValue(this.value + delta);
  }

  setValue(nextValue) {
    const next = Math.max(0, Math.min(MAX_ENERGY, nextValue));
    if (next === this.value) return;
    this.value = next;
    this._renderGrowth(this.value);
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
    this._renderGrowth(this.value);
  }

  update(deltaMS, elapsed, cellIndex = 0) {
    if (this._selected) {
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

  _renderGrowth(currentValue) {
    const radius = radiusFromValue(currentValue);
    const currentDetailRadius = radiusFromValue(Math.min(currentValue, 60));
    const currentBumpCount = Math.round((Math.PI * 2 * currentDetailRadius) / 8);
    const currentPoreCount = Math.max(2, Math.round((currentDetailRadius ** 2 - 9 ** 2) / 55));
    const radiusAtDetailLimit = radiusFromValue(60);

    this.radius = radius;
    this._detailScale = currentValue > 60 ? radius / radiusAtDetailLimit : 1;
    this._sheenRange = radius * 0.35;

    this._flagellumSprites.forEach((item) => {
      item.targetVisible = currentValue > LARGE_CELL_THRESHOLD;
    });

    this.container.hitArea = new PIXI.Circle(0, 0, Math.max(20, radius + 5));
    this._valueText.text = String(Math.floor(currentValue));
    this._valueText.visible = currentValue > 0;

    this._draw.drawShadow(this._shadow, radius);
    this._draw.drawBody(this._body, radius);

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

    this._sheenMask.clear().circle(0, 0, radius - 2).fill(0xffffff);
    this._draw.drawHint(this._selection, radius);
  }
}
