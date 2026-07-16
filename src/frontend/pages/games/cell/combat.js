import { ENERGY_EPS, FIRE_COST, MIN_FIRE_ENERGY, fireIntervalMs, BULLET_COLLIDE_DIST } from "./constants";
import { Bullet } from "./bullet";

/**
 * 连发、开火、命中结算、子弹更新与对撞。
 * @param {object} options
 * @param {import("pixi.js").Container} options.stage
 * @param {import("./cell").Cell[]} options.cells
 * @param {import("./bullet").Bullet[]} options.bullets
 */
export function createCombat({ stage, cells, bullets }) {
  /**
   * 每个源细胞各自锁定一个持续发射目标。
   * 没能量时仍保持连线；源变色断链。
   * 异色 A↔B 互连允许；同色互连禁止，seq 更大（后连）的保留。
   * @type {Map<import("./cell").Cell, { target: import("./cell").Cell, cooldown: number, color: number, seq: number }>}
   */
  const fireLinks = new Map();
  let fireLinkSeq = 0;

  /**
   * 子弹命中：同色治疗、异色扣血。
   * @param {number} sourceColor
   * @param {import("./cell").Cell} target
   * @param {number} amount
   */
  function applyBulletHit(sourceColor, target, amount) {
    if (!target) return;
    const qty = Number(amount);
    if (!Number.isFinite(qty) || qty <= ENERGY_EPS) return;

    if (target.color === sourceColor) {
      target.changeValue(qty);
      return;
    }

    if (target.value <= ENERGY_EPS) {
      target.setValue(0);
      target.setColor(sourceColor);
      return;
    }

    target.changeValue(-qty);
    if (target.value <= ENERGY_EPS) {
      target.setValue(0);
      target.setColor(sourceColor);
    }
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @returns {boolean}
   */
  function fireBullet(source, target) {
    if (source === target) return false;
    if (source.value < MIN_FIRE_ENERGY - ENERGY_EPS) return false;
    if (source.value < FIRE_COST - ENERGY_EPS) return false;

    source.changeValue(-FIRE_COST);
    const color = source.color;
    const bullet = new Bullet({
      x: source.container.x,
      y: source.container.y,
      color,
      source,
      target,
      getCells: () => cells,
      onHit: (hitCell, damage) => applyBulletHit(color, hitCell, damage),
    });
    stage.addChild(bullet.container);
    bullets.push(bullet);
    return true;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} target
   */
  function canFireLink(source, target) {
    if (!source || !target || source === target) return false;
    return true;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   */
  function startFireLink(source, target) {
    if (!canFireLink(source, target)) return;
    const color = source.color;
    const ok = fireBullet(source, target);
    fireLinks.set(source, {
      target,
      color,
      cooldown: ok ? 1.0 : 0.0,
      seq: ++fireLinkSeq,
    });
    enforceNoSameColorMutual(source);
  }

  /** @param {import("./cell").Cell} source */
  function stopFireLink(source) {
    fireLinks.delete(source);
  }

  /**
   * 仅禁止同色互相连接：A↔B 且同色时，只保留较新的一条。
   * @param {import("./cell").Cell | null} [justLinked]
   */
  function enforceNoSameColorMutual(justLinked = null) {
    for (const [source, link] of [...fireLinks]) {
      const other = link.target;
      if (source.color !== other.color) continue;

      const reverse = fireLinks.get(other);
      if (!reverse || reverse.target !== source) continue;

      const keepSource =
        justLinked === source
          ? source
          : justLinked === other
            ? other
            : link.seq >= reverse.seq
              ? source
              : other;
      const drop = keepSource === source ? other : source;
      stopFireLink(drop);
    }
  }

  /**
   * 每帧：维护互连规则 + 冷却开火。
   * @param {number} dt
   */
  function tickFireLinks(dt) {
    enforceNoSameColorMutual();

    for (const [source, link] of [...fireLinks]) {
      if (!fireLinks.has(source)) continue;

      if (source.color !== link.color) {
        stopFireLink(source);
        continue;
      }

      if (source.value < MIN_FIRE_ENERGY - ENERGY_EPS) {
        link.cooldown = 0.0;
        continue;
      }

      const currentInterval = fireIntervalMs(source.value);
      if (currentInterval === Infinity) {
        continue;
      }

      // 采用归一化的动态时间标尺（Dynamic Time Scaling），防止在能量剧烈波动时冷却进度失衡
      link.cooldown -= dt / currentInterval;

      while (
        fireLinks.has(source)
        && link.cooldown <= 0
        && source.value >= MIN_FIRE_ENERGY - ENERGY_EPS
      ) {
        if (source.color !== link.color) {
          stopFireLink(source);
          break;
        }
        if (!fireBullet(source, link.target)) {
          link.cooldown = 0.0;
          break;
        }
        // 开火成功，进度百分比重新增加 1.0 (100% 冷却)
        link.cooldown += 1.0;
      }
    }
  }

  /**
   * 每帧：子弹飞行 + 异色对撞抵消。
   * @param {number} dt
   */
  function tickBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (!bullets[i].update(dt)) {
        bullets.splice(i, 1);
      }
    }

    // 对撞抵消：动能（威力值）大者胜出，扣减相应能量后继续飞行，小者湮灭
    const collideR2 = BULLET_COLLIDE_DIST * BULLET_COLLIDE_DIST;
    for (let i = 0; i < bullets.length; i += 1) {
      const a = bullets[i];
      if (!a.alive || a.container.destroyed) continue;
      for (let j = i + 1; j < bullets.length; j += 1) {
        const b = bullets[j];
        if (!b.alive || b.container.destroyed) continue;
        if (a.color === b.color) continue;
        const dx = a.container.x - b.container.x;
        const dy = a.container.y - b.container.y;
        if (dx * dx + dy * dy <= collideR2) {
          const dmgA = a.getDamage();
          const dmgB = b.getDamage();

          if (dmgA > dmgB + 1e-4) {
            a.damagePenalty += dmgB;
            b.cancel();
          } else if (dmgB > dmgA + 1e-4) {
            b.damagePenalty += dmgA;
            a.cancel();
            break; // 子弹 a 已经消亡，退出对 j 的循环
          } else {
            a.cancel();
            b.cancel();
            break; // 同归于尽
          }
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (!bullets[i].alive) {
        bullets.splice(i, 1);
      }
    }
  }

  return {
    fireLinks,
    canFireLink,
    startFireLink,
    stopFireLink,
    enforceNoSameColorMutual,
    tickFireLinks,
    tickBullets,
  };
}
