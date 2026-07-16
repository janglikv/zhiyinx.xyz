import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell, ENERGY_EPS } from "./cell";
import { Bullet, BULLET_COLLIDE_DIST, FIRE_COST } from "./bullet";
import backgroundScene from "./background.png";
import backgroundDish from "./background-dish.png";
import backgroundDna from "./background-dna.png";
import backgroundMicrobes from "./background-microbes.jpg";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const INITIAL_CELLS = [
  { x: 312, y: 270, value: 15, color: 0x54c92b },
  { x: 480, y: 270, value: 0, color: 0x737d88 },
  { x: 648, y: 270, value: 15, color: 0xd94343 },
];

const BACKGROUNDS = [
  { id: "scene", label: "场景", src: backgroundScene },
  { id: "dish", label: "培养皿", src: backgroundDish },
  { id: "dna", label: "DNA", src: backgroundDna },
  { id: "microbes", label: "微生物", src: backgroundMicrobes },
  { id: "black", label: "纯黑", src: null },
];

/** @typedef {typeof BACKGROUNDS[number]['id']} BackgroundMode */

const BG_STORAGE_KEY = "cell-game-background";

function isBackgroundMode(value) {
  return BACKGROUNDS.some((item) => item.id === value);
}

function loadBackgroundMode() {
  try {
    const saved = localStorage.getItem(BG_STORAGE_KEY);
    if (isBackgroundMode(saved)) return /** @type {BackgroundMode} */ (saved);
  } catch (e) {
    // private mode / 禁用存储时忽略
  }
  return "scene";
}

function saveBackgroundMode(mode) {
  try {
    localStorage.setItem(BG_STORAGE_KEY, mode);
  } catch (e) {
    // private mode / 禁用存储时忽略
  }
}

function fitBackgroundSprite(sprite, texture) {
  const scale = Math.max(
    GAME_WIDTH / texture.width,
    GAME_HEIGHT / texture.height,
  );
  sprite.texture = texture;
  sprite.anchor.set(0.5);
  sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  sprite.scale.set(scale);
}

function mountCellGame(container, apiRef, getDesiredBgMode) {
  const app = new PIXI.Application();
  let destroyed = false;
  let onKeyDown = null;

  async function initPixi() {
    await app.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
    });

    const imageEntries = BACKGROUNDS.filter((item) => item.src);
    const textures = await Promise.all(
      imageEntries.map((item) => PIXI.Assets.load(item.src)),
    );

    if (destroyed) {
      try {
        app.destroy(true, { children: true });
      } catch (e) {
        // 静默忽略
      }
      return;
    }

    /** @type {Record<string, PIXI.Texture>} */
    const textureById = {};
    imageEntries.forEach((item, index) => {
      textureById[item.id] = textures[index];
    });

    container.appendChild(app.canvas);
    app.ticker.maxFPS = 60;

    const defaultTexture = textureById.scene;
    const background = new PIXI.Sprite(defaultTexture);
    fitBackgroundSprite(background, defaultTexture);
    app.stage.addChild(background);

    /** @type {BackgroundMode} */
    let backgroundMode = "scene";

    function setBackgroundMode(mode) {
      backgroundMode = mode;
      if (mode === "black") {
        background.visible = false;
        app.renderer.background.color = 0x000000;
        return;
      }

      const texture = textureById[mode];
      if (!texture) return;
      fitBackgroundSprite(background, texture);
      background.visible = true;
      app.renderer.background.color = 0x000000;
    }

    // 初始化完成前用户若已点过切换，以当前 UI 状态为准。
    setBackgroundMode(getDesiredBgMode?.() ?? "scene");

    if (apiRef) {
      apiRef.current = {
        setBackgroundMode,
        getBackgroundMode: () => backgroundMode,
      };
    }

    const cells = [];
    /** @type {Bullet[]} */
    const bullets = [];
    /**
     * 每个源细胞各自锁定一个持续发射目标。
     * 没能量时仍保持连线，有 1 点就打 1 发；源变色断链。
     * 单向均可；异色 A↔B 互连允许；同色互连禁止，seq 更大（后连）的保留。
     * @type {Map<import("./cell").Cell, { target: import("./cell").Cell, cooldown: number, color: number, seq: number }>}
     */
    const fireLinks = new Map();
    let fireLinkSeq = 0;
    /**
     * 攻速随体型：小慢大快（与自增同思路）。
     * 射速 ≈ FIRE_RATE_BASE + value * FIRE_RATE_PER_UNIT（发/秒）
     * 例：1→~1.0s，15→~0.48s，50→~0.24s，80→~0.17s
     */
    const FIRE_RATE_BASE = 0.85;
    const FIRE_RATE_PER_UNIT = 0.055;
    const FIRE_INTERVAL_MIN_MS = 110;
    const FIRE_INTERVAL_MAX_MS = 1100;

    /** @param {number} value */
    function fireIntervalMs(value) {
      const v = Math.max(0, value);
      const rate = FIRE_RATE_BASE + v * FIRE_RATE_PER_UNIT;
      const ms = 1000 / Math.max(0.05, rate);
      return Math.min(FIRE_INTERVAL_MAX_MS, Math.max(FIRE_INTERVAL_MIN_MS, ms));
    }
    const DRAG_THRESHOLD = 6;
    const CUT_SAMPLE_MIN = 2;
    /** 刀光只保留最近这一段时间的点（水果忍者式短尾） */
    const BLADE_POINT_LIFE_MS = 140;
    const BLADE_MAX_POINTS = 28;
    let elapsed = 0;

    // —— 两种轨迹手势 ——
    // 1) 瞄准：从源细胞拖到目标 → 锁定连发
    // 2) 切断：在空白处画一刀，轨迹与瞄准线相交 → 停射
    /** @type {import("./cell").Cell | null} */
    let dragSource = null;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let pointerX = 0;
    let pointerY = 0;

    /** 切断刀光：按下跟手，抬手立刻清空 */
    let cutting = false;
    /** @type {{ x: number, y: number, age: number }[]} */
    let bladePoints = [];

    const aimLine = new PIXI.Graphics();
    aimLine.eventMode = "none";
    /** 被瞄准细胞上的旋转圆环 */
    const aimRing = new PIXI.Container();
    aimRing.eventMode = "none";
    aimRing.visible = false;
    const aimRingGfx = new PIXI.Graphics();
    aimRing.addChild(aimRingGfx);
    let aimRingSpin = 0;
    /** @type {import("./cell").Cell | null} */
    let aimRingTarget = null;

    const linkLines = new PIXI.Graphics();
    linkLines.eventMode = "none";
    const cutTrail = new PIXI.Graphics();
    cutTrail.eventMode = "none";

    /** 最近一次有效瞄准方向（鼠标贴近源中心时复用，避免抖动） */
    let lastAimUx = 1;
    let lastAimUy = 0;

    /**
     * 只取鼠标相对源细胞的方向，与距离无关。
     * @param {import("./cell").Cell} source
     * @param {number} px
     * @param {number} py
     */
    function getAimDir(source, px, py) {
      const dx = px - source.container.x;
      const dy = py - source.container.y;
      const len = Math.hypot(dx, dy);
      if (len < 6) return { ux: lastAimUx, uy: lastAimUy };
      lastAimUx = dx / len;
      lastAimUy = dy / len;
      return { ux: lastAimUx, uy: lastAimUy };
    }

    /**
     * 从 source 沿方向 (ux,uy) 发出射线，命中的第一个细胞即为瞄准目标。
     * @param {import("./cell").Cell} source
     * @param {number} ux
     * @param {number} uy
     * @returns {import("./cell").Cell | null}
     */
    function cellAlongRay(source, ux, uy) {
      const x0 = source.container.x;
      const y0 = source.container.y;
      const minT = source.radius * 0.4;

      /** @type {import("./cell").Cell | null} */
      let best = null;
      let bestEntry = Infinity;

      for (const cell of cells) {
        if (cell === source) continue;
        const cx = cell.container.x - x0;
        const cy = cell.container.y - y0;
        const t = cx * ux + cy * uy;
        if (t <= minT) continue;
        const perp2 = cx * cx + cy * cy - t * t;
        const hitR = cell.radius * 0.92;
        if (perp2 > hitR * hitR) continue;
        const entry = t - Math.sqrt(Math.max(0, hitR * hitR - perp2));
        if (entry > minT && entry < bestEntry) {
          bestEntry = entry;
          best = cell;
        }
      }
      return best;
    }

    /**
     * 射线打到画布边界的落点（方向预瞄用）。
     * @param {number} x0
     * @param {number} y0
     * @param {number} ux
     * @param {number} uy
     */
    function rayToBounds(x0, y0, ux, uy) {
      let tMin = Infinity;
      if (ux > 1e-6) tMin = Math.min(tMin, (GAME_WIDTH - x0) / ux);
      if (ux < -1e-6) tMin = Math.min(tMin, (0 - x0) / ux);
      if (uy > 1e-6) tMin = Math.min(tMin, (GAME_HEIGHT - y0) / uy);
      if (uy < -1e-6) tMin = Math.min(tMin, (0 - y0) / uy);
      if (!Number.isFinite(tMin) || tMin <= 0) tMin = 480;
      return { x: x0 + ux * tMin, y: y0 + uy * tMin };
    }

    /** 瞄准环相对细胞壁的外扩（与 drawAimRing 一致） */
    const AIM_RING_PAD = 10;
    /** 预瞄 / 连发虚线统一：短且密 */
    const BEAM_DASH = { dash: 3.2, gap: 2.6 };
    const BEAM_WIDTH = 1.35;

    /**
     * 连发虚线：源细胞壁 → 目标细胞壁。
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
     */
    function linkEndpoints(source, target) {
      return beamEndpoints(source, target, source.radius, target.radius);
    }

    /**
     * 预瞄线：源细胞壁 → 目标瞄准环。
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
     */
    function aimEndpoints(source, target) {
      return beamEndpoints(
        source,
        target,
        source.radius,
        target.radius + AIM_RING_PAD,
      );
    }

    /**
     * 沿两细胞连心线，从源外半径到目标外半径。
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
     * @param {number} rFrom 源侧距离中心
     * @param {number} rTo 目标侧距离中心
     */
    function beamEndpoints(source, target, rFrom, rTo) {
      const sx = source.container.x;
      const sy = source.container.y;
      const tx = target.container.x;
      const ty = target.container.y;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      if (len <= rFrom + rTo + 0.5) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        return { x1: mx, y1: my, x2: mx, y2: my };
      }

      return {
        x1: sx + ux * rFrom,
        y1: sy + uy * rFrom,
        x2: tx - ux * rTo,
        y2: ty - uy * rTo,
      };
    }

    /**
     * 从细胞中心沿单位方向到细胞壁上的点。
     * @param {import("./cell").Cell} cell
     * @param {number} ux
     * @param {number} uy
     */
    function wallPoint(cell, ux, uy) {
      return {
        x: cell.container.x + ux * cell.radius,
        y: cell.container.y + uy * cell.radius,
      };
    }

    /** 两线段是否相交（含端点附近容差） */
    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
      const EPS = 1e-6;
      const abx = bx - ax;
      const aby = by - ay;
      const cdx = dx - cx;
      const cdy = dy - cy;
      const acx = cx - ax;
      const acy = cy - ay;
      const den = abx * cdy - aby * cdx;
      if (Math.abs(den) < EPS) {
        // 近似共线时用点到线段距离兜底
        return (
          pointNearSegment(ax, ay, cx, cy, dx, dy, 6)
          || pointNearSegment(bx, by, cx, cy, dx, dy, 6)
          || pointNearSegment(cx, cy, ax, ay, bx, by, 6)
          || pointNearSegment(dx, dy, ax, ay, bx, by, 6)
        );
      }
      const t = (acx * cdy - acy * cdx) / den;
      const u = (acx * aby - acy * abx) / den;
      return t >= -0.02 && t <= 1.02 && u >= -0.02 && u <= 1.02;
    }

    function pointNearSegment(px, py, ax, ay, bx, by, maxDist) {
      const abx = bx - ax;
      const aby = by - ay;
      const len2 = abx * abx + aby * aby;
      if (len2 < 1e-6) return Math.hypot(px - ax, py - ay) <= maxDist;
      let t = ((px - ax) * abx + (py - ay) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + t * abx;
      const qy = ay + t * aby;
      return Math.hypot(px - qx, py - qy) <= maxDist;
    }

    /**
     * 子弹命中：同色治疗、异色扣血；amount 为浮点（已按飞行距离衰减）。
     * 异色路径：target.changeValue(-amount)，不会作用到进攻方。
     * @param {number} sourceColor
     * @param {import("./cell").Cell} target
     * @param {number} amount
     */
    function applyBulletHit(sourceColor, target, amount) {
      if (!target) return;
      const qty = Number(amount);
      if (!Number.isFinite(qty) || qty <= ENERGY_EPS) return;

      // 同色：治疗（支援）
      if (target.color === sourceColor) {
        target.changeValue(qty);
        return;
      }

      // 异色：已空则直接染色；否则扣血，扣穿再染色
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
      // 开火扣 FIRE_COST；命中伤害 = FIRE_COST × 距离系数 ≤ FIRE_COST
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
        // 只对实际撞到的细胞结算（可能被中间细胞挡住）
        onHit: (hitCell, damage) => applyBulletHit(color, hitCell, damage),
      });
      app.stage.addChild(bullet.container);
      bullets.push(bullet);
      return true;
    }

    /**
     * 是否允许建立连发：单向均可（含同色支援）；禁止自己连自己。
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
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
        // 打出则按体型进冷却；没能量也连着，冷却归零，有点就射
        cooldown: ok ? fireIntervalMs(source.value) : 0,
        seq: ++fireLinkSeq,
      });
      source.setSelected(true);
      // 同色互连时以后连为准切断反向；异色互连保留
      enforceNoSameColorMutual(source);
    }

    /** @param {import("./cell").Cell} source */
    function stopFireLink(source) {
      fireLinks.delete(source);
      source.setSelected(false);
    }

    /**
     * 仅禁止同色互相连接：A↔B 且同色时，只保留较新的一条。
     * 异色互连、任意单向连接均允许。
     * @param {import("./cell").Cell | null} [justLinked] 刚建立的源（优先保留）
     */
    function enforceNoSameColorMutual(justLinked = null) {
      for (const [source, link] of [...fireLinks]) {
        const other = link.target;
        // 异色互连允许
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

    function syncSelection() {
      cells.forEach((c) => c.setSelected(fireLinks.has(c) || c === dragSource));
    }

    /**
     * 唯一虚线绘制入口：预瞄、连发共用同一套宽/dash/gap。
     * @param {PIXI.Graphics} g
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} color
     * @param {number} [alpha]
     */
    function drawDashedBeam(g, x1, y1, x2, y2, color, alpha = 0.9) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len;
      const uy = dy / len;
      const { dash, gap } = BEAM_DASH;
      const width = BEAM_WIDTH;
      let t = 0;
      while (t < len) {
        const a = t;
        const b = Math.min(len, t + dash);
        g.moveTo(x1 + ux * a, y1 + uy * a)
          .lineTo(x1 + ux * b, y1 + uy * b)
          .stroke({ color, width, alpha });
        t += dash + gap;
      }
    }

    /**
     * 在被瞄准细胞上画旋转圆环。
     * @param {import("./cell").Cell} cell
     * @param {number} spin 弧度
     */
    function drawAimRing(cell, spin) {
      if (!dragSource) return;
      const r = cell.radius + AIM_RING_PAD;
      const color = dragSource.color;
      aimRingGfx.clear();

      aimRingGfx.circle(0, 0, r)
        .stroke({ color, width: 1.4, alpha: 0.28 });

      // 每段弧先 moveTo 弧起点，避免 Graphics.arc 从路径原点连出半径线
      const arcs = 3;
      const arcSpan = (Math.PI * 2) / arcs * 0.55;
      const gapSpan = (Math.PI * 2) / arcs - arcSpan;
      for (let i = 0; i < arcs; i += 1) {
        const start = spin + i * (arcSpan + gapSpan);
        const end = start + arcSpan;
        const rIn = r - 3.2;
        const a0 = start + 0.08;
        const a1 = end - 0.08;

        aimRingGfx
          .moveTo(Math.cos(start) * r, Math.sin(start) * r)
          .arc(0, 0, r, start, end)
          .stroke({ color, width: 2.6, alpha: 0.9 });

        aimRingGfx
          .moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn)
          .arc(0, 0, rIn, a0, a1)
          .stroke({ color: 0xffffff, width: 1.1, alpha: 0.45 });
      }

      aimRing.position.set(cell.container.x, cell.container.y);
      aimRing.visible = true;
    }

    function clearAimRing() {
      aimRingTarget = null;
      aimRing.visible = false;
      aimRingGfx.clear();
    }

    function redrawAimLine() {
      aimLine.clear();
      if (!dragSource) {
        clearAimRing();
        return;
      }

      const ox = dragSource.container.x;
      const oy = dragSource.container.y;
      // 只关心方向：射线命中方向上第一个细胞
      const { ux, uy } = getAimDir(dragSource, pointerX, pointerY);
      const target = cellAlongRay(dragSource, ux, uy);

      // 起点：严格在源细胞壁上
      const start = wallPoint(dragSource, ux, uy);

      // 预瞄：锁定目标时换色（单向，含同色支援）
      if (target && canFireLink(dragSource, target)) {
        const ep = aimEndpoints(dragSource, target);
        drawDashedBeam(aimLine, ep.x1, ep.y1, ep.x2, ep.y2, dragSource.color, 0.9);
        aimRingTarget = target;
        drawAimRing(target, aimRingSpin);
      } else {
        const end = rayToBounds(ox, oy, ux, uy);
        drawDashedBeam(aimLine, start.x, start.y, end.x, end.y, 0xffffff, 0.35);
        aimLine.circle(end.x, end.y, 3)
          .fill({ color: 0xffffff, alpha: 0.25 });
        clearAimRing();
      }
    }

    function redrawLinkLines() {
      linkLines.clear();
      for (const [source, link] of fireLinks) {
        const ep = linkEndpoints(source, link.target);
        drawDashedBeam(linkLines, ep.x1, ep.y1, ep.x2, ep.y2, source.color, 0.28);
      }
    }

    /**
     * 水果忍者式刀光：头粗亮、尾细淡，只画当前还“活着”的点。
     * 抬手后 bladePoints 被清空，整条轨迹立刻消失。
     */
    function redrawBladeTrail() {
      cutTrail.clear();
      if (!cutting || bladePoints.length < 2) return;

      const n = bladePoints.length;
      // 外层柔光（从尾到头逐段变亮变粗）
      for (let i = 1; i < n; i += 1) {
        const p0 = bladePoints[i - 1];
        const p1 = bladePoints[i];
        const t = i / (n - 1); // 0=尾 1=头
        const life = 1 - p0.age / BLADE_POINT_LIFE_MS;
        if (life <= 0) continue;
        const fade = life * life;
        cutTrail.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y)
          .stroke({
            color: 0x7ecbff,
            width: 2 + t * 14,
            alpha: 0.12 + fade * t * 0.35,
          });
      }
      // 中层
      for (let i = 1; i < n; i += 1) {
        const p0 = bladePoints[i - 1];
        const p1 = bladePoints[i];
        const t = i / (n - 1);
        const life = 1 - p0.age / BLADE_POINT_LIFE_MS;
        if (life <= 0) continue;
        const fade = life * life;
        cutTrail.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y)
          .stroke({
            color: 0xc8f0ff,
            width: 1.2 + t * 7,
            alpha: 0.18 + fade * t * 0.5,
          });
      }
      // 核心白刃
      for (let i = 1; i < n; i += 1) {
        const p0 = bladePoints[i - 1];
        const p1 = bladePoints[i];
        const t = i / (n - 1);
        const life = 1 - p0.age / BLADE_POINT_LIFE_MS;
        if (life <= 0) continue;
        const fade = Math.max(0, life);
        cutTrail.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y)
          .stroke({
            color: 0xffffff,
            width: 0.8 + t * 3.2,
            alpha: 0.25 + fade * t * 0.75,
          });
      }
      // 刀尖亮点
      const tip = bladePoints[n - 1];
      cutTrail.circle(tip.x, tip.y, 3.2).fill({ color: 0xffffff, alpha: 0.95 });
      cutTrail.circle(tip.x, tip.y, 7).fill({ color: 0x9fdfff, alpha: 0.28 });
    }

    /**
     * 用最近一段切断轨迹检测并切断瞄准线。
     * @param {number} x0
     * @param {number} y0
     * @param {number} x1
     * @param {number} y1
     */
    function tryCutLinks(x0, y0, x1, y1) {
      if (Math.hypot(x1 - x0, y1 - y0) < CUT_SAMPLE_MIN) return;
      for (const [source, link] of [...fireLinks]) {
        const ep = linkEndpoints(source, link.target);
        if (segmentsIntersect(x0, y0, x1, y1, ep.x1, ep.y1, ep.x2, ep.y2)) {
          stopFireLink(source);
        }
      }
    }

    function pushBladePoint(x, y) {
      const prev = bladePoints[bladePoints.length - 1];
      if (prev && Math.hypot(x - prev.x, y - prev.y) < CUT_SAMPLE_MIN) {
        // 仍更新刀尖位置，保证跟手
        prev.x = x;
        prev.y = y;
        prev.age = 0;
        return false;
      }
      if (prev) tryCutLinks(prev.x, prev.y, x, y);
      bladePoints.push({ x, y, age: 0 });
      while (bladePoints.length > BLADE_MAX_POINTS) bladePoints.shift();
      return true;
    }

    function endAimDrag(upX, upY) {
      if (!dragSource) return;
      const source = dragSource;
      // 松手时同样按方向射线锁定目标（与鼠标落在细胞上与否无关）
      const { ux, uy } = getAimDir(source, upX, upY);
      const target = cellAlongRay(source, ux, uy);

      if (dragMoved && canFireLink(source, target)) {
        startFireLink(source, target);
      }

      dragSource = null;
      dragMoved = false;
      aimLine.clear();
      clearAimRing();
      syncSelection();
    }

    /** 抬手：刀光立刻消失 */
    function endCutGesture() {
      cutting = false;
      bladePoints = [];
      cutTrail.clear();
    }

    INITIAL_CELLS.forEach(({ x, y, value, color }) => {
      const cell = new Cell({ x, y, value, color });
      cell.container.on("pointerdown", (event) => {
        event.stopPropagation();
        // 从细胞开始 = 瞄准轨迹，不进入切断
        endCutGesture();

        dragSource = cell;
        dragMoved = false;
        dragStartX = event.global.x;
        dragStartY = event.global.y;
        pointerX = dragStartX;
        pointerY = dragStartY;
        syncSelection();
        redrawAimLine();
      });
      app.stage.addChild(cell.container);
      cells.push(cell);
    });

    // 预瞄线 / 连发虚线画在细胞之下，端点被细胞壁盖住，视觉上贴壁
    const lineLayer = app.stage.getChildIndex(background) + 1;
    app.stage.addChildAt(linkLines, lineLayer);
    app.stage.addChildAt(aimLine, lineLayer + 1);
    // 瞄准环、切断刀光仍在细胞之上
    app.stage.addChild(aimRing);
    app.stage.addChild(cutTrail);

    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    app.stage.on("pointerdown", (event) => {
      // 空白处按下：开始刀光轨迹
      if (dragSource) return;
      const onEmpty = event.target === app.stage || event.target === background;
      if (!onEmpty) return;
      cutting = true;
      bladePoints = [{ x: event.global.x, y: event.global.y, age: 0 }];
      redrawBladeTrail();
    });

    app.stage.on("pointermove", (event) => {
      pointerX = event.global.x;
      pointerY = event.global.y;

      if (dragSource) {
        const dx = pointerX - dragStartX;
        const dy = pointerY - dragStartY;
        if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
          dragMoved = true;
        }
        redrawAimLine();
        return;
      }

      if (cutting) {
        pushBladePoint(pointerX, pointerY);
        redrawBladeTrail();
      }
    });

    app.stage.on("pointerup", (event) => {
      if (dragSource) {
        endAimDrag(event.global.x, event.global.y);
        return;
      }
      if (cutting) endCutGesture();
    });

    app.stage.on("pointerupoutside", (event) => {
      if (dragSource) {
        endAimDrag(event.global.x, event.global.y);
        return;
      }
      if (cutting) endCutGesture();
    });

    onKeyDown = (event) => {
      const focus =
        dragSource
        || [...fireLinks.keys()][0]
        || cells[0];
      if (!focus) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        focus.changeValue(1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        focus.changeValue(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    app.ticker.add((ticker) => {
      elapsed += ticker.deltaTime;
      const dt = ticker.deltaMS;
      cells.forEach((cell, index) => {
        cell.update(dt, elapsed, index);
      });

      // 每帧维护：仅禁止同色互连，后连为准
      enforceNoSameColorMutual();

      for (const [source, link] of [...fireLinks]) {
        if (!fireLinks.has(source)) continue;

        // 源变色（被占领）断链；能量打光不断
        if (source.color !== link.color) {
          stopFireLink(source);
          continue;
        }

        // 没子弹：保持连线，冷却清零，等长到够打一发立刻射
        if (source.value < FIRE_COST - ENERGY_EPS) {
          link.cooldown = 0;
          continue;
        }

        link.cooldown -= dt;
        while (
          fireLinks.has(source)
          && link.cooldown <= 0
          && source.value >= FIRE_COST - ENERGY_EPS
        ) {
          if (source.color !== link.color) {
            stopFireLink(source);
            break;
          }
          if (!fireBullet(source, link.target)) {
            // 暂时没能量：不断链，等下一tick
            link.cooldown = 0;
            break;
          }
          // 每发后按当前体型重算间隔（浮点能量）
          link.cooldown += fireIntervalMs(Math.max(FIRE_COST, source.value));
        }
      }

      // 滑动中：刀光尾迹按年龄消退（短尾跟手）；抬手已在 endCutGesture 清空
      if (cutting && bladePoints.length) {
        for (let i = bladePoints.length - 1; i >= 0; i -= 1) {
          bladePoints[i].age += dt;
          if (bladePoints[i].age >= BLADE_POINT_LIFE_MS && i < bladePoints.length - 1) {
            bladePoints.splice(i, 1);
          }
        }
        redrawBladeTrail();
      }

      // 被瞄准圆环持续旋转；方向变化时同步切换目标
      if (dragSource) {
        if (aimRingTarget) {
          aimRingSpin += dt * 0.0016;
          drawAimRing(aimRingTarget, aimRingSpin);
        }
      }

      redrawLinkLines();

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (!bullets[i].update(dt)) {
          bullets.splice(i, 1);
        }
      }

      // 异色子弹碰撞后互相抵消（同色不挡）
      // 注意：cancel 会 destroy container，抵消后必须立刻跳出，禁止再读 .x
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
            a.cancel();
            b.cancel();
            break; // a 已销毁，结束内层
          }
        }
      }
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (!bullets[i].alive) {
          bullets.splice(i, 1);
        }
      }
    });
  }

  initPixi().catch((err) => {
    console.error("PixiJS 初始化失败", err);
  });

  return () => {
    destroyed = true;
    if (apiRef) apiRef.current = null;
    if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
    try {
      app.destroy(true, { children: true });
    } catch (e) {
      // 初始化尚未完成时，由 initPixi 中的 destroyed 分支负责销毁。
    }
  };
}

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const gameApiRef = useRef(null);
  const [bgMode, setBgMode] = useState(loadBackgroundMode);
  const bgModeRef = useRef(bgMode);
  bgModeRef.current = bgMode;

  useEffect(
    () => mountCellGame(containerRef.current, gameApiRef, () => bgModeRef.current),
    [],
  );

  function switchBackground(mode) {
    bgModeRef.current = mode;
    setBgMode(mode);
    saveBackgroundMode(mode);
    gameApiRef.current?.setBackgroundMode(mode);
  }

  return (
    <GameLayout
      title="细胞"
      icon="🦠"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      contentWidth={GAME_WIDTH}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: GAME_WIDTH,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            射线瞄准连发 · 异色可互连 · 同色互连后连为准 · 划刀切断 · 越大越快 · 同色 +1 · 异色 -1
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>背景</span>
            {BACKGROUNDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={bgMode === item.id ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => switchBackground(item.id)}
                style={{ padding: "6px 10px", fontSize: "12px" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={containerRef}
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "2px solid var(--border-light)",
            background: "#000000",
            boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.9)",
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
          }}
        />
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
