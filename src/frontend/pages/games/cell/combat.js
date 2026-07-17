import { Graphics } from "pixi.js";
import {
  ENERGY_EPS,
  FIRE_COST,
  MIN_FIRE_ENERGY,
  MAX_ENERGY,
  fireIntervalMs,
  BULLET_COLLIDE_DIST,
  OVERFLOW_SPAWN_FREE,
  OVERFLOW_SPAWN_AIMED,
} from "./constants";
import { Bullet } from "./bullet";
import { OverflowSpark } from "./overflow";

/**
 * 连发、开火、命中结算、子弹更新与对撞；触顶溢出走独立粒子。
 * @param {object} options
 * @param {import("pixi.js").Container} options.stage
 * @param {import("./cell").Cell[]} options.cells
 * @param {import("./bullet").Bullet[]} options.bullets
 */
export function createCombat({ stage, cells, bullets }) {
  /** @type {import("./overflow").OverflowSpark[]} */
  const overflowSparks = [];
  /**
   * 源 → 连发目标。只描述「谁在打谁」，不含冷却。
   * 源变色断链；同色互连只保留较新的一条。
   * @type {Map<import("./cell").Cell, { target: import("./cell").Cell, color: number, seq: number }>}
   */
  const fireLinks = new Map();
  /**
   * 源 → 归一化冷却（唯一真相）。1.0 = 一整发间隔；≤0 可射。
   * 与连线解耦：断链/重连/换目标都不能重置射速。
   * @type {Map<import("./cell").Cell, number>}
   */
  const cooldown = new Map();
  /** @type {{ graphics: Graphics, age: number, duration: number, strength: number }[]} */
  const hitEffects = [];
  let fireLinkSeq = 0;

  /** @param {import("./cell").Cell} source */
  function getCd(source) {
    return cooldown.get(source) ?? 0;
  }

  /**
   * @param {import("./cell").Cell} source
   * @param {number} value
   */
  function setCd(source, value) {
    // 允许负值：长帧追赶时 cooldown 会先变负，再 +1 连射。
    // 仅在「已就绪且无连线」时删条目，避免 Map 膨胀。
    if (value <= 0 && !fireLinks.has(source)) cooldown.delete(source);
    else cooldown.set(source, value);
  }

  function createHitEffect(x, y, color, damage) {
    const strength = Math.max(0, Math.min(1, damage / FIRE_COST));
    const radius = 7 + strength * 10;
    const graphics = new Graphics()
      .circle(0, 0, radius * 0.45).fill({ color, alpha: 0.18 + strength * 0.28 })
      .circle(0, 0, radius).stroke({ color, width: 1 + strength * 2, alpha: 0.45 + strength * 0.4 });
    graphics.position.set(x, y);
    graphics.scale.set(0.35);
    graphics.eventMode = "none";
    stage.addChild(graphics);
    hitEffects.push({ graphics, age: 0, duration: 240 + strength * 100, strength });
  }

  function tickHitEffects(dt) {
    for (let i = hitEffects.length - 1; i >= 0; i -= 1) {
      const effect = hitEffects[i];
      effect.age += dt;
      const progress = Math.min(1, effect.age / effect.duration);
      effect.graphics.scale.set(0.35 + progress * (0.75 + effect.strength * 0.35));
      effect.graphics.alpha = (1 - progress) * (0.55 + effect.strength * 0.45);
      if (progress >= 1) {
        effect.graphics.destroy();
        hitEffects.splice(i, 1);
      }
    }
  }

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
      // 同色治疗：触顶部分记入溢出，连线时再全部输出
      const sum = target.value + qty;
      if (sum > MAX_ENERGY + ENERGY_EPS) {
        target.setValue(MAX_ENERGY);
        target.overflowEnergy += sum - MAX_ENERGY;
      } else {
        target.changeValue(qty);
      }
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
   * 生成一发常规战斗子弹（参与对撞）。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @returns {boolean}
   */
  function spawnBullet(source, target) {
    if (!target || source === target) return false;
    const color = source.color;
    const bullet = new Bullet({
      x: source.container.x,
      y: source.container.y,
      color,
      source,
      target,
      getCells: () => cells,
      onHit: (hitCell, damage, point) => {
        applyBulletHit(color, hitCell, damage);
        createHitEffect(point.x, point.y, color, damage);
      },
    });
    stage.addChild(bullet.container);
    bullets.push(bullet);
    return true;
  }

  /**
   * 生成溢出粒子（不参与弹-弹对撞，轻量独立体系）。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} target
   * @param {{ dirX?: number, dirY?: number }} [opts]
   * @returns {boolean}
   */
  function spawnOverflow(source, target = null, opts = {}) {
    if (target && source === target) return false;
    const color = source.color;
    const aimed = !!target;
    const spark = new OverflowSpark({
      x: source.container.x,
      y: source.container.y,
      color,
      source,
      target,
      dirX: opts.dirX,
      dirY: opts.dirY,
      aimed,
      getCells: () => cells,
      onHit: (hitCell, damage, point) => {
        applyBulletHit(color, hitCell, damage);
        // 溢出命中：更醒目的溅射环（略强于常规弹反馈）
        createHitEffect(point.x, point.y, color, damage * (aimed ? 1.35 : 0.9));
      },
    });
    stage.addChild(spark.graphics);
    overflowSparks.push(spark);
    return true;
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
    return spawnBullet(source, target);
  }

  /**
   * 触顶溢出 → 独立粒子体系（非 Bullet）。
   * 有连线：飞向目标并结算能量；无连线：随机方向短距泄压。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell | null} [target]
   */
  function dumpOverflow(source, target = null) {
    if (!source) return;
    if (target && source === target) {
      source.overflowEnergy = 0;
      return;
    }
    const maxSpawn = target ? OVERFLOW_SPAWN_AIMED : OVERFLOW_SPAWN_FREE;
    let spawned = 0;
    while (
      source.overflowEnergy >= FIRE_COST - ENERGY_EPS
      && spawned < maxSpawn
    ) {
      source.overflowEnergy -= FIRE_COST;
      let ok;
      if (target) {
        ok = spawnOverflow(source, target);
      } else {
        const angle = Math.random() * Math.PI * 2;
        ok = spawnOverflow(source, null, {
          dirX: Math.cos(angle),
          dirY: Math.sin(angle),
        });
      }
      if (!ok) {
        source.overflowEnergy += FIRE_COST;
        break;
      }
      spawned += 1;
    }
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
   * 冷却就绪时尝试开火；成功则进入一整发冷却。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   * @returns {boolean}
   */
  function tryFire(source, target) {
    if (getCd(source) > 0) return false;
    if (!fireBullet(source, target)) return false;
    // 累加而非重置为 1，长帧追赶时保留负冷却（连射多发仍符合总时间预算）
    setCd(source, getCd(source) + 1.0);
    return true;
  }

  /**
   * 建立或改向连发。只改目标；是否立刻开火完全由冷却决定。
   * @param {import("./cell").Cell} source
   * @param {import("./cell").Cell} target
   */
  function startFireLink(source, target) {
    if (!canFireLink(source, target)) return;
    fireLinks.set(source, {
      target,
      color: source.color,
      seq: ++fireLinkSeq,
    });
    tryFire(source, target);
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
   * 每帧：冷却推进 → 连发开火 → 溢出能量全力输出。
   * @param {number} dt
   */
  function tickFireLinks(dt) {
    enforceNoSameColorMutual();

    // 1) 所有源的冷却按当前体型推进（能量不足则冻结，不归零）
    for (const source of [...cooldown.keys()]) {
      if (source.value < MIN_FIRE_ENERGY - ENERGY_EPS) continue;
      const interval = fireIntervalMs(source.value);
      if (interval === Infinity) continue;
      setCd(source, getCd(source) - dt / interval);
    }

    // 2) 有连线且冷却就绪 → 常规开火
    for (const [source, link] of [...fireLinks]) {
      if (!fireLinks.has(source)) continue;
      if (source.color !== link.color) {
        stopFireLink(source);
        continue;
      }

      while (fireLinks.has(source) && getCd(source) <= 0) {
        if (source.color !== link.color) {
          stopFireLink(source);
          break;
        }
        if (!tryFire(source, link.target)) break;
      }
    }

    // 3) 触顶溢出全部打出：有连线→目标；无连线→随机方向
    for (const cell of cells) {
      if ((cell.overflowEnergy ?? 0) <= ENERGY_EPS) {
        cell.overflowEnergy = 0;
        continue;
      }
      const link = fireLinks.get(cell);
      if (link && cell.color === link.color) {
        dumpOverflow(cell, link.target);
      } else {
        dumpOverflow(cell, null);
      }
      // 不足一整发的余量留到下帧
    }
  }

  /**
   * 每帧：常规子弹飞行 + 弹-弹对撞 + 溢出粒子（无对撞）。
   * @param {number} dt
   */
  function tickBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (!bullets[i].update(dt)) {
        bullets.splice(i, 1);
      }
    }

    // 对撞抵消：仅常规 Bullet，溢出粒子不参与
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
          const hitX = (a.container.x + b.container.x) / 2;
          const hitY = (a.container.y + b.container.y) / 2;

          createHitEffect(hitX, hitY, a.color, dmgA);
          createHitEffect(hitX, hitY, b.color, dmgB);

          if (dmgA > dmgB + 1e-4) {
            a.damagePenalty += dmgB;
            b.cancel();
          } else if (dmgB > dmgA + 1e-4) {
            b.damagePenalty += dmgA;
            a.cancel();
            break;
          } else {
            a.cancel();
            b.cancel();
            break;
          }
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (!bullets[i].alive) {
        bullets.splice(i, 1);
      }
    }

    // 溢出粒子：只更新，不与子弹/彼此对撞
    for (let i = overflowSparks.length - 1; i >= 0; i -= 1) {
      if (!overflowSparks[i].update(dt)) {
        overflowSparks.splice(i, 1);
      }
    }

    tickHitEffects(dt);
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
