import * as PIXI from "pixi.js";
import { derivePalette } from "./cell";
import {
  BULLET_SPEED,
  BULLET_RADIUS,
  BULLET_COLLIDE_DIST,
  FIRE_COST,
  damageFromDistance,
} from "./constants";

export {
  BULLET_RADIUS,
  BULLET_COLLIDE_DIST,
  FIRE_COST,
  damageFromDistance,
};

/**
 * 小细胞子弹：飞向目标；途中碰到其它细胞会被挡住并命中该细胞。
 * 命中点取飞行路径与「当前细胞壁」（cell.radius）的交点；伤害按飞行距离衰减。
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
   * @param {(cell: import("./cell").Cell, damage: number) => void} [options.onHit]
   */
  constructor({ x, y, color, source, target, getCells, onHit }) {
    this.source = source;
    this.target = target;
    this.getCells = getCells;
    this.onHit = onHit;
    this.alive = true;
    this.color = color;
    this.colors = derivePalette(color);

    // 从源细胞壁沿目标方向出发（用实时半径；源不参与阻挡，不自撞）
    const tx = target.container.x - x;
    const ty = target.container.y - y;
    const tlen = Math.hypot(tx, ty) || 1;
    const launchR = Math.max(0, source.radius);
    const startX = x + (tx / tlen) * launchR;
    const startY = y + (ty / tlen) * launchR;

    /** 已飞行距离（用于伤害衰减） */
    this.traveled = 0;

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
   * 本帧线段与细胞壁（圆）求交：取沿飞行方向最先碰到的壁上一点。
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {{ cell: import("./cell").Cell, x: number, y: number } | null}
   */
  _findBlockerAlong(x0, y0, x1, y1) {
    const cells = this.getCells?.() ?? [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const segLen2 = dx * dx + dy * dy;

    /** @type {import("./cell").Cell | null} */
    let best = null;
    let bestT = Infinity;
    let hitX = x0;
    let hitY = y0;

    for (const cell of cells) {
      if (cell === this.source) continue;

      const cx = cell.container.x;
      const cy = cell.container.y;
      const wallR = Math.max(0.5, cell.radius);
      const ox = x0 - cx;
      const oy = y0 - cy;
      const dist0 = Math.hypot(ox, oy);

      if (dist0 <= wallR + 1e-4) {
        if (0 < bestT) {
          bestT = 0;
          best = cell;
          if (dist0 < 1e-6) {
            hitX = x0;
            hitY = y0;
          } else {
            hitX = cx + (ox / dist0) * wallR;
            hitY = cy + (oy / dist0) * wallR;
          }
        }
        continue;
      }

      if (segLen2 < 1e-12) continue;

      const a = segLen2;
      const b = 2 * (ox * dx + oy * dy);
      const c = ox * ox + oy * oy - wallR * wallR;
      const disc = b * b - 4 * a * c;
      if (disc < 0) continue;

      const sqrtD = Math.sqrt(disc);
      let t = (-b - sqrtD) / (2 * a);
      if (t < 0 || t > 1) {
        t = (-b + sqrtD) / (2 * a);
      }
      if (t < 0 || t > 1) continue;

      if (t < bestT) {
        bestT = t;
        best = cell;
        hitX = x0 + t * dx;
        hitY = y0 + t * dy;
      }
    }

    return best ? { cell: best, x: hitX, y: hitY } : null;
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

    let x1 = x0;
    let y1 = y0;
    if (dist > 1e-6) {
      const move = Math.min(step, dist);
      x1 = x0 + (dx / dist) * move;
      y1 = y0 + (dy / dist) * move;
    }

    const hit = this._findBlockerAlong(x0, y0, x1, y1);
    if (hit) {
      this.alive = false;
      // 计入到命中点的实际飞行距离
      this.traveled += Math.hypot(hit.x - x0, hit.y - y0);
      this.container.x = hit.x;
      this.container.y = hit.y;
      const damage = damageFromDistance(this.traveled);
      try {
        this.onHit?.(hit.cell, damage);
      } finally {
        this.destroy();
      }
      return false;
    }

    this.traveled += Math.hypot(x1 - x0, y1 - y0);
    this.container.x = x1;
    this.container.y = y1;
    return true;
  }

  /**
   * 异色对撞抵消：不触发细胞命中，直接消失。
   */
  cancel() {
    if (!this.alive) return;
    this.alive = false;
    this.destroy();
  }

  destroy() {
    if (!this.container || this.container.destroyed) return;
    this.container.destroy({ children: true });
  }
}
