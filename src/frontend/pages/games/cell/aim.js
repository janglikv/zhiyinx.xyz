import * as PIXI from "pixi.js";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  AIM_RING_PAD,
  BEAM_DASH,
  BEAM_WIDTH,
} from "./constants";

/**
 * 只取鼠标相对源细胞的方向；贴近中心时复用上次方向。
 * @param {import("./cell").Cell} source
 * @param {number} px
 * @param {number} py
 * @param {{ ux: number, uy: number }} lastAim
 */
export function getAimDir(source, px, py, lastAim) {
  const dx = px - source.container.x;
  const dy = py - source.container.y;
  const len = Math.hypot(dx, dy);
  if (len < 6) return { ux: lastAim.ux, uy: lastAim.uy };
  lastAim.ux = dx / len;
  lastAim.uy = dy / len;
  return { ux: lastAim.ux, uy: lastAim.uy };
}

/**
 * 从 source 沿方向发出射线，命中的第一个细胞即为瞄准目标。
 * @param {import("./cell").Cell} source
 * @param {number} ux
 * @param {number} uy
 * @param {import("./cell").Cell[]} cells
 * @returns {import("./cell").Cell | null}
 */
export function cellAlongRay(source, ux, uy, cells) {
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
 * 射线打到画布边界的落点。
 * @param {number} x0
 * @param {number} y0
 * @param {number} ux
 * @param {number} uy
 */
export function rayToBounds(x0, y0, ux, uy) {
  let tMin = Infinity;
  if (ux > 1e-6) tMin = Math.min(tMin, (GAME_WIDTH - x0) / ux);
  if (ux < -1e-6) tMin = Math.min(tMin, (0 - x0) / ux);
  if (uy > 1e-6) tMin = Math.min(tMin, (GAME_HEIGHT - y0) / uy);
  if (uy < -1e-6) tMin = Math.min(tMin, (0 - y0) / uy);
  if (!Number.isFinite(tMin) || tMin <= 0) tMin = 480;
  return { x: x0 + ux * tMin, y: y0 + uy * tMin };
}

/**
 * 沿两细胞连心线，从源外半径到目标外半径。
 * @param {import("./cell").Cell} source
 * @param {import("./cell").Cell} target
 * @param {number} rFrom
 * @param {number} rTo
 */
export function beamEndpoints(source, target, rFrom, rTo) {
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

/** @param {import("./cell").Cell} source @param {import("./cell").Cell} target */
export function linkEndpoints(source, target) {
  return beamEndpoints(source, target, source.radius, target.radius);
}

/** @param {import("./cell").Cell} source @param {import("./cell").Cell} target */
export function aimEndpoints(source, target) {
  return beamEndpoints(
    source,
    target,
    source.radius,
    target.radius + AIM_RING_PAD,
  );
}

/**
 * 从细胞中心沿单位方向到细胞壁上的点。
 * @param {import("./cell").Cell} cell
 * @param {number} ux
 * @param {number} uy
 */
export function wallPoint(cell, ux, uy) {
  return {
    x: cell.container.x + ux * cell.radius,
    y: cell.container.y + uy * cell.radius,
  };
}

/**
 * 唯一虚线绘制入口：预瞄、连发共用。
 * @param {PIXI.Graphics} g
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} color
 * @param {number} [alpha]
 */
export function drawDashedBeam(g, x1, y1, x2, y2, color, alpha = 0.9) {
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
 * 瞄准线 / 连发线 / 旋转准星环。
 * @param {object} options
 * @param {PIXI.Container} options.stage
 * @param {number} options.lineLayerIndex - 背景之上、细胞之下的插入索引
 * @param {() => import("./cell").Cell[]} options.getCells
 * @param {() => import("./cell").Cell | null} options.getDragSource
 * @param {() => { x: number, y: number }} options.getPointer
 * @param {(source: import("./cell").Cell, target: import("./cell").Cell | null) => boolean} options.canFireLink
 * @param {() => Iterable<[import("./cell").Cell, { target: import("./cell").Cell }]>} options.getFireLinks
 */
export function createAimSystem({
  stage,
  lineLayerIndex,
  getCells,
  getDragSource,
  getPointer,
  canFireLink,
  getFireLinks,
}) {
  const aimLine = new PIXI.Graphics();
  aimLine.eventMode = "none";

  const aimRing = new PIXI.Container();
  aimRing.eventMode = "none";
  aimRing.visible = false;
  const aimRingGfx = new PIXI.Graphics();
  aimRing.addChild(aimRingGfx);
  let aimRingSpin = 0;
  /** @type {import("./cell").Cell | null} */
  let aimRingTarget = null;
  /** 新手引导：连线目标（橙色瞄准环） */
  /** @type {import("./cell").Cell | null} */
  let tutorialGuideTarget = null;

  /** 引导连线目标色（橙色） */
  const TUTORIAL_AIM_COLOR = 0xff8c2a;

  const linkLines = new PIXI.Graphics();
  linkLines.eventMode = "none";

  // 预瞄 / 连发虚线在细胞之下
  stage.addChildAt(linkLines, lineLayerIndex);
  stage.addChildAt(aimLine, lineLayerIndex + 1);
  // 瞄准环在细胞之上（由调用方再 addChild 也可；这里先挂 stage 末尾）
  stage.addChild(aimRing);

  const lastAim = { ux: 1, uy: 0 };

  /**
   * @param {import("./cell").Cell} cell
   * @param {number} spin
   * @param {number} color
   */
  function drawAimRing(cell, spin, color) {
    const r = cell.radius + AIM_RING_PAD;
    aimRingGfx.clear();

    aimRingGfx.circle(0, 0, r)
      .stroke({ color, width: 1.4, alpha: 0.28 });

    const arcs = 3;
    const arcSpan = ((Math.PI * 2) / arcs) * 0.55;
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

  /**
   * 新手引导：在连线目标上显示橙色瞄准环（与拖拽准星同款样式）。
   * @param {import("./cell").Cell | null} cell
   */
  function setTutorialGuideTarget(cell) {
    tutorialGuideTarget = cell || null;
  }

  /** 按优先级绘制准星：拖拽瞄准 > 引导目标 */
  function refreshAimRing() {
    const dragSource = getDragSource();
    if (dragSource && aimRingTarget) {
      drawAimRing(aimRingTarget, aimRingSpin, dragSource.color);
      return;
    }
    if (tutorialGuideTarget) {
      drawAimRing(tutorialGuideTarget, aimRingSpin, TUTORIAL_AIM_COLOR);
      return;
    }
    aimRing.visible = false;
    aimRingGfx.clear();
  }

  function redrawAimLine() {
    aimLine.clear();
    const dragSource = getDragSource();
    if (!dragSource) {
      aimRingTarget = null;
      refreshAimRing();
      return;
    }

    const pointer = getPointer();
    const ox = dragSource.container.x;
    const oy = dragSource.container.y;
    const { ux, uy } = getAimDir(dragSource, pointer.x, pointer.y, lastAim);
    const target = cellAlongRay(dragSource, ux, uy, getCells());
    const start = wallPoint(dragSource, ux, uy);

    if (target && canFireLink(dragSource, target)) {
      const ep = aimEndpoints(dragSource, target);
      drawDashedBeam(aimLine, ep.x1, ep.y1, ep.x2, ep.y2, dragSource.color, 0.9);
      aimRingTarget = target;
      refreshAimRing();
    } else {
      const end = rayToBounds(ox, oy, ux, uy);
      drawDashedBeam(aimLine, start.x, start.y, end.x, end.y, 0xffffff, 0.35);
      aimLine.circle(end.x, end.y, 3)
        .fill({ color: 0xffffff, alpha: 0.25 });
      aimRingTarget = null;
      refreshAimRing();
    }
  }

  function redrawLinkLines() {
    linkLines.clear();
    const fireLinks = getFireLinks();
    for (const [source, link] of fireLinks) {
      const target = link.target;
      if (!target) continue;

      // 玩家连线始终显示；红方仅显示「同色输送」补给线（断流可读/可切），进攻线仍隐藏以免糊屏
      if (source.isPlayer()) {
        const ep = linkEndpoints(source, target);
        drawDashedBeam(linkLines, ep.x1, ep.y1, ep.x2, ep.y2, source.color, 0.28);
        continue;
      }
      if (source.isEnemy() && target.isEnemy()) {
        const ep = linkEndpoints(source, target);
        drawDashedBeam(linkLines, ep.x1, ep.y1, ep.x2, ep.y2, source.color, 0.4);
      }
    }
  }

  function clearAimLine() {
    aimLine.clear();
    aimRingTarget = null;
    refreshAimRing();
  }

  /**
   * 旋转准星环（拖拽瞄准或引导目标）。
   * @param {number} dt
   */
  function tickAimRing(dt) {
    const active = (getDragSource() && aimRingTarget) || tutorialGuideTarget;
    if (!active) {
      if (aimRing.visible) {
        aimRing.visible = false;
        aimRingGfx.clear();
      }
      return;
    }
    aimRingSpin += dt * 0.0016;
    refreshAimRing();
  }

  /**
   * 松手时按方向射线取目标。
   * @param {import("./cell").Cell} source
   * @param {number} upX
   * @param {number} upY
   */
  function pickTarget(source, upX, upY) {
    const { ux, uy } = getAimDir(source, upX, upY, lastAim);
    return cellAlongRay(source, ux, uy, getCells());
  }

  return {
    aimLine,
    aimRing,
    linkLines,
    redrawAimLine,
    redrawLinkLines,
    clearAimLine,
    tickAimRing,
    setTutorialGuideTarget,
    pickTarget,
    linkEndpoints,
  };
}
