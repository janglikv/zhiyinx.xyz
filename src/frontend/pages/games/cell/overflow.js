import { Container, Graphics } from "pixi.js";
import {
  ENERGY_EPS,
  FIRE_COST,
  OVERFLOW_SPEED,
  OVERFLOW_FREE_MAX_DIST,
  OVERFLOW_AIMED_MAX_DIST,
  OVERFLOW_PARTICLE_R,
  damageFromDistance,
} from "./constants";

/**
 * 触顶溢出粒子：独立于 Bullet。
 * - 不参与弹-弹对撞
 * - 明显光晕 + 拖尾，和常规子弹区分
 * - 仍可命中细胞并结算能量
 */
export class OverflowSpark {
  /**
   * @param {object} options
   * @param {number} options.x
   * @param {number} options.y
   * @param {number} options.color
   * @param {import("./cell").Cell} options.source
   * @param {import("./cell").Cell | null} [options.target]
   * @param {number} [options.dirX]
   * @param {number} [options.dirY]
   * @param {boolean} [options.aimed]
   * @param {() => import("./cell").Cell[]} options.getCells
   * @param {(cell: import("./cell").Cell, damage: number, point: { x: number, y: number }) => void} [options.onHit]
   */
  constructor({
    x,
    y,
    color,
    source,
    target = null,
    dirX,
    dirY,
    aimed = false,
    getCells,
    onHit,
  }) {
    this.source = source;
    this.target = target;
    this.aimed = !!aimed;
    this.getCells = getCells;
    this.onHit = onHit;
    this.alive = true;
    this.color = color;
    this.energy = FIRE_COST;
    this.traveled = 0;
    this._age = 0;
    this._maxTravel = this.aimed ? OVERFLOW_AIMED_MAX_DIST : OVERFLOW_FREE_MAX_DIST;
    this._phase = Math.random() * Math.PI * 2;

    let nx;
    let ny;
    if (this.target) {
      const tx = this.target.container.x - x;
      const ty = this.target.container.y - y;
      const len = Math.hypot(tx, ty) || 1;
      nx = tx / len;
      ny = ty / len;
    } else {
      const len = Math.hypot(dirX ?? 0, dirY ?? 0) || 1;
      nx = (dirX ?? 1) / len;
      ny = (dirY ?? 0) / len;
    }
    this._dirX = nx;
    this._dirY = ny;

    const launchR = Math.max(0, source.radius);
    this.x = x + nx * launchR;
    this.y = y + ny * launchR;

    const r = OVERFLOW_PARTICLE_R * (this.aimed ? 1.25 : 1.05);
    this._r = r;

    // 容器：整体旋转对齐飞行方向，拖尾画在 -x
    this.graphics = new Container();
    this.graphics.eventMode = "none";
    this.graphics.position.set(this.x, this.y);
    this.graphics.rotation = Math.atan2(ny, nx);

    this._glow = new Graphics();
    this._body = new Graphics();
    this._trail = new Graphics();
    this.graphics.addChild(this._glow, this._trail, this._body);
    this._drawLook(1);

    // 起飞时略大一圈，更显眼
    this.graphics.scale.set(this.aimed ? 1.15 : 1.05);
    this.graphics.alpha = 1;
  }

  /**
   * @param {number} life 1→0 剩余寿命
   */
  _drawLook(life) {
    const r = this._r;
    const c = this.color;
    const pulse = 0.9 + 0.1 * Math.sin(this._age * 0.028 + this._phase);

    this._glow.clear()
      .circle(0, 0, r * 3.2 * pulse)
      .fill({ color: c, alpha: (this.aimed ? 0.22 : 0.16) * life })
      .circle(0, 0, r * 2.1 * pulse)
      .fill({ color: c, alpha: (this.aimed ? 0.32 : 0.24) * life });

    // 彗星拖尾（朝飞行反方向）
    const trailLen = r * (this.aimed ? 5.5 : 4.2) * (0.65 + life * 0.55);
    const trailW = r * (1.1 + life * 0.4);
    this._trail.clear()
      .moveTo(0, 0)
      .lineTo(-trailLen * 0.35, trailW * 0.55)
      .lineTo(-trailLen, 0)
      .lineTo(-trailLen * 0.35, -trailW * 0.55)
      .closePath()
      .fill({ color: c, alpha: (this.aimed ? 0.45 : 0.32) * life })
      .moveTo(0, 0)
      .lineTo(-trailLen * 0.55, trailW * 0.28)
      .lineTo(-trailLen * 0.85, 0)
      .lineTo(-trailLen * 0.55, -trailW * 0.28)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.2 * life });

    this._body.clear()
      .circle(0.15, 0.2, r * 1.05)
      .fill({ color: 0x000000, alpha: 0.22 * life })
      .circle(0, 0, r)
      .fill({ color: c, alpha: 0.95 * life })
      .circle(-r * 0.25, -r * 0.28, r * 0.42)
      .fill({ color: 0xffffff, alpha: 0.55 * life })
      .circle(0, 0, r * 1.15)
      .stroke({ color: 0xffffff, width: 0.9, alpha: 0.35 * life });
  }

  getDamage() {
    if (this.aimed) {
      return Math.max(0, damageFromDistance(this.traveled));
    }
    const t = Math.min(1, this.traveled / this._maxTravel);
    const fall = (1 - t) * (1 - t);
    return Math.max(0, this.energy * fall * 0.55);
  }

  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @returns {{ cell: import("./cell").Cell, x: number, y: number } | null}
   */
  _findHit(x0, y0, x1, y1) {
    const list = this.getCells?.() ?? [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const segLen2 = dx * dx + dy * dy;

    let best = null;
    let bestT = Infinity;
    let hitX = x0;
    let hitY = y0;

    for (const cell of list) {
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
      if (t < 0 || t > 1) t = (-b + sqrtD) / (2 * a);
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
   * @returns {boolean}
   */
  update(deltaMS) {
    if (!this.alive) return false;
    this._age += deltaMS;

    const step = OVERFLOW_SPEED * (deltaMS / 1000);
    const x0 = this.x;
    const y0 = this.y;

    let x1 = x0;
    let y1 = y0;

    if (this.aimed && this.target && !this.target.container.destroyed) {
      const tx = this.target.container.x - x0;
      const ty = this.target.container.y - y0;
      const dist = Math.hypot(tx, ty);
      if (dist > 1e-6) {
        const move = Math.min(step, dist);
        const inv = 1 / dist;
        x1 = x0 + tx * inv * move;
        y1 = y0 + ty * inv * move;
        this._dirX = tx * inv;
        this._dirY = ty * inv;
      }
    } else {
      this.target = null;
      x1 = x0 + this._dirX * step;
      y1 = y0 + this._dirY * step;
    }

    const hit = this._findHit(x0, y0, x1, y1);
    if (hit) {
      this.traveled += Math.hypot(hit.x - x0, hit.y - y0);
      this.x = hit.x;
      this.y = hit.y;
      const dmg = this.getDamage();
      this.alive = false;
      try {
        if (dmg > ENERGY_EPS) {
          this.onHit?.(hit.cell, dmg, { x: hit.x, y: hit.y });
        }
      } finally {
        this.destroy();
      }
      return false;
    }

    this.traveled += Math.hypot(x1 - x0, y1 - y0);
    this.x = x1;
    this.y = y1;
    this.graphics.position.set(x1, y1);
    this.graphics.rotation = Math.atan2(this._dirY, this._dirX);

    if (this.traveled >= this._maxTravel - 1e-6) {
      this.alive = false;
      this.destroy();
      return false;
    }

    // 前半程保持很亮，后半才收束 —— 比纯二次衰减更显眼
    const raw = 1 - this.traveled / this._maxTravel;
    const life = this.aimed
      ? 0.55 + raw * 0.45
      : Math.max(0.12, Math.pow(raw, 0.65));
    this._drawLook(life);

    const pulse = 1 + 0.08 * Math.sin(this._age * 0.03 + this._phase);
    if (this.aimed) {
      this.graphics.alpha = 0.75 + raw * 0.25;
      this.graphics.scale.set((0.85 + raw * 0.35) * pulse);
    } else {
      this.graphics.alpha = Math.max(0.2, 0.35 + raw * 0.65);
      this.graphics.scale.set((0.7 + raw * 0.45) * pulse);
    }

    return true;
  }

  destroy() {
    this.alive = false;
    if (this.graphics && !this.graphics.destroyed) {
      this.graphics.destroy({ children: true });
    }
  }
}
