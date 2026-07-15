import * as PIXI from "pixi.js";
import { derivePalette } from "./cell";

const BULLET_SPEED = 160; // px/s
const BULLET_RADIUS = 3.2;

/**
 * 小细胞子弹：飞向目标；途中碰到其它细胞会被挡住并命中该细胞。
 */
export class Bullet {
  /**
   * @param {object} options
   * @param {number} options.x
   * @param {number} options.y
   * @param {number} options.color - base 色，与源细胞一致
   * @param {import("./cell").Cell} options.source - 发射源（不参与阻挡）
   * @param {import("./cell").Cell} options.target - 预定目标
   * @param {() => import("./cell").Cell[]} options.getCells - 场景中全部细胞
   * @param {(cell: import("./cell").Cell) => void} [options.onHit]
   */
  constructor({ x, y, color, source, target, getCells, onHit }) {
    this.source = source;
    this.target = target;
    this.getCells = getCells;
    this.onHit = onHit;
    this.alive = true;
    this.color = color;
    this.colors = derivePalette(color);

    // 从源边缘朝目标方向出发，避免一出生就撞到自己
    const tx = target.container.x - x;
    const ty = target.container.y - y;
    const tlen = Math.hypot(tx, ty) || 1;
    const launchR = Math.max(0, source.radius * 0.9);
    const startX = x + (tx / tlen) * launchR;
    const startY = y + (ty / tlen) * launchR;

    this.container = new PIXI.Container();
    this.container.position.set(startX, startY);
    this.container.eventMode = "none";

    this._body = new PIXI.Graphics();
    this._drawBody();
    this.container.addChild(this._body);

    this.container.scale.set(0.35);
    this._spawn = 0;
  }

  _drawBody() {
    const r = BULLET_RADIUS;
    const c = this.colors;
    this._body.clear()
      .circle(0.35, 0.45, r + 0.45).fill({ color: c.shadow, alpha: 0.3 })
      .circle(0, 0, r).fill({ color: c.main })
      .circle(-r * 0.3, -r * 0.35, r * 0.5).fill({ color: c.light, alpha: 0.8 })
      .circle(-r * 0.4, -r * 0.45, r * 0.2).fill({ color: c.highlight, alpha: 0.75 })
      .circle(0, 0, r).stroke({ color: c.outline, width: 0.55, alpha: 0.9 });
  }

  /**
   * 在路径上找最近的可阻挡细胞（不含发射源）。
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {import("./cell").Cell | null}
   */
  _findBlockerAlong(x0, y0, x1, y1) {
    const cells = this.getCells?.() ?? [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const ux = len > 1e-6 ? dx / len : 0;
    const uy = len > 1e-6 ? dy / len : 0;

    /** @type {import("./cell").Cell | null} */
    let best = null;
    let bestT = Infinity;

    for (const cell of cells) {
      if (cell === this.source) continue;

      const cx = cell.container.x;
      const cy = cell.container.y;
      const hitR = cell.radius * 0.62 + BULLET_RADIUS;

      // 点到线段最近点
      let t = len > 1e-6
        ? ((cx - x0) * ux + (cy - y0) * uy)
        : 0;
      t = Math.max(0, Math.min(len, t));
      const px = x0 + ux * t;
      const py = y0 + uy * t;
      const dist = Math.hypot(cx - px, cy - py);

      if (dist <= hitR && t < bestT) {
        bestT = t;
        best = cell;
      }
    }

    return best;
  }

  /**
   * @param {number} deltaMS
   * @returns {boolean} 是否仍存活
   */
  update(deltaMS) {
    if (!this.alive) return false;

    if (this._spawn < 1) {
      this._spawn = Math.min(1, this._spawn + deltaMS / 120);
      const t = this._spawn;
      const s = 0.35 + 0.65 * (1 - (1 - t) * (1 - t));
      this.container.scale.set(s);
    }

    const x0 = this.container.x;
    const y0 = this.container.y;
    const tx = this.target.container.x;
    const ty = this.target.container.y;
    const dx = tx - x0;
    const dy = ty - y0;
    const dist = Math.hypot(dx, dy);
    const step = BULLET_SPEED * (deltaMS / 1000);

    let x1;
    let y1;
    if (dist <= 1e-6) {
      x1 = x0;
      y1 = y0;
    } else if (dist <= step) {
      x1 = tx;
      y1 = ty;
    } else {
      x1 = x0 + (dx / dist) * step;
      y1 = y0 + (dy / dist) * step;
    }

    // 本帧移动线段上是否撞到细胞（含预定目标）
    const hit = this._findBlockerAlong(x0, y0, x1, y1);
    if (hit) {
      this.alive = false;
      // 吸附到被挡细胞边缘，观感更干净
      const hx = hit.container.x;
      const hy = hit.container.y;
      const hdx = hx - x0;
      const hdy = hy - y0;
      const hlen = Math.hypot(hdx, hdy) || 1;
      const stopR = Math.max(0, hit.radius * 0.55);
      this.container.x = hx - (hdx / hlen) * stopR;
      this.container.y = hy - (hdy / hlen) * stopR;
      try {
        this.onHit?.(hit);
      } finally {
        this.destroy();
      }
      return false;
    }

    this.container.x = x1;
    this.container.y = y1;
    return true;
  }

  destroy() {
    if (this.container.destroyed) return;
    this.container.destroy({ children: true });
  }
}
