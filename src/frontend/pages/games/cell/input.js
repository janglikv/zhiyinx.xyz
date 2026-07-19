import * as PIXI from "pixi.js";
import {
  DRAG_THRESHOLD,
  CUT_SAMPLE_MIN,
  BLADE_POINT_LIFE_MS,
  BLADE_MAX_POINTS,
} from "./constants";
import { linkEndpoints } from "./aim";

/** 两线段是否相交（含端点附近容差） */
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const EPS = 1e-6;
  const abx = bx - ax;
  const aby = by - ay;
  const cdx = dx - cx;
  const cdy = dy - cy;
  const acx = cx - ax;
  const acy = cy - ay;
  const den = abx * cdy - aby * cdx;
  if (Math.abs(den) < EPS) {
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

export function pointNearSegment(px, py, ax, ay, bx, by, maxDist) {
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
 * 拖拽瞄准 + 空白切断刀光。
 * @param {object} options
 * @param {import("pixi.js").Application} options.app
 * @param {import("pixi.js").Sprite} options.background
 * @param {import("./cell").Cell[]} options.cells
 * @param {ReturnType<import("./combat").createCombat>} options.combat
 * @param {ReturnType<import("./aim").createAimSystem>} options.aim
 */
export function createInputSystem({ app, background, cells, combat, aim }) {
  /** @type {import("./cell").Cell | null} */
  let dragSource = null;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let pointerX = 0;
  let pointerY = 0;
  /** 结算等场景可关闭交互 */
  let inputEnabled = true;

  let cutting = false;
  /** @type {{ x: number, y: number, age: number }[]} */
  let bladePoints = [];

  const cutTrail = new PIXI.Graphics();
  cutTrail.eventMode = "none";
  app.stage.addChild(cutTrail);

  function getDragSource() {
    return dragSource;
  }

  function getPointer() {
    return { x: pointerX, y: pointerY };
  }

  function syncSelection() {
    // 呼吸光只反馈当前拖拽瞄准，不表示已经建立的持续射流。
    cells.forEach((c) => c.setSelected(c === dragSource));
  }

  /**
   * 水果忍者式刀光：头粗亮、尾细淡。
   */
  function redrawBladeTrail() {
    cutTrail.clear();
    if (!cutting || bladePoints.length < 2) return;

    const n = bladePoints.length;
    for (let i = 1; i < n; i += 1) {
      const p0 = bladePoints[i - 1];
      const p1 = bladePoints[i];
      const t = i / (n - 1);
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
    const tip = bladePoints[n - 1];
    cutTrail.circle(tip.x, tip.y, 3.2).fill({ color: 0xffffff, alpha: 0.95 });
    cutTrail.circle(tip.x, tip.y, 7).fill({ color: 0x9fdfff, alpha: 0.28 });
  }

  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   */
  function tryCutLinks(x0, y0, x1, y1) {
    if (Math.hypot(x1 - x0, y1 - y0) < CUT_SAMPLE_MIN) return;
    for (const [source, link] of [...combat.fireLinks]) {
      const ep = linkEndpoints(source, link.target);
      if (segmentsIntersect(x0, y0, x1, y1, ep.x1, ep.y1, ep.x2, ep.y2)) {
        // 玩家划线切断：允许强制断开用户连线
        combat.stopFireLink(source, { force: true });
      }
    }
  }

  function pushBladePoint(x, y) {
    const prev = bladePoints[bladePoints.length - 1];
    if (prev && Math.hypot(x - prev.x, y - prev.y) < CUT_SAMPLE_MIN) {
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

  function cancelAimDrag() {
    dragSource = null;
    dragMoved = false;
    aim.clearAimLine();
    syncSelection();
  }

  function endAimDrag(upX, upY) {
    if (!dragSource) return;
    const source = dragSource;

    // 瞄准期间可能被敌方占领，不能再以原玩家操作完成发射。
    if (!source.isPlayer()) {
      cancelAimDrag();
      return;
    }

    const target = aim.pickTarget(source, upX, upY);

    if (dragMoved && combat.canFireLink(source, target)) {
      combat.startFireLink(source, target, { user: true });
    }

    cancelAimDrag();
  }

  function endCutGesture() {
    cutting = false;
    bladePoints = [];
    cutTrail.clear();
  }

  /**
   * 细胞 pointerdown：仅玩家阵营（绿色）可拖拽瞄准。
   * 敌/中立仍可被射线选为目标，但不能作为发射源。
   * @param {import("./cell").Cell} cell
   * @param {PIXI.FederatedPointerEvent} event
   */
  /**
   * @param {boolean} enabled
   */
  function setEnabled(enabled) {
    inputEnabled = Boolean(enabled);
    if (!inputEnabled) {
      cancelAimDrag();
      endCutGesture();
    }
  }

  function onCellPointerDown(cell, event) {
    event.stopPropagation();
    endCutGesture();

    if (!inputEnabled) return;
    if (!cell.isPlayer()) return;

    dragSource = cell;
    dragMoved = false;
    dragStartX = event.global.x;
    dragStartY = event.global.y;
    pointerX = dragStartX;
    pointerY = dragStartY;
    syncSelection();
    aim.redrawAimLine();
  }

  /**
   * 刀光尾迹老化。
   * @param {number} dt
   */
  function tickBlade(dt) {
    if (dragSource && !dragSource.isPlayer()) cancelAimDrag();
    if (!cutting || !bladePoints.length) return;
    for (let i = bladePoints.length - 1; i >= 0; i -= 1) {
      bladePoints[i].age += dt;
      if (bladePoints[i].age >= BLADE_POINT_LIFE_MS && i < bladePoints.length - 1) {
        bladePoints.splice(i, 1);
      }
    }
    redrawBladeTrail();
  }

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;

  app.stage.on("pointerdown", (event) => {
    if (!inputEnabled) return;
    if (dragSource) return;
    const onEmpty = event.target === app.stage || event.target === background;
    if (!onEmpty) return;
    cutting = true;
    bladePoints = [{ x: event.global.x, y: event.global.y, age: 0 }];
    redrawBladeTrail();
  });

  app.stage.on("pointermove", (event) => {
    if (!inputEnabled) return;
    pointerX = event.global.x;
    pointerY = event.global.y;

    if (dragSource) {
      const dx = pointerX - dragStartX;
      const dy = pointerY - dragStartY;
      if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
        dragMoved = true;
      }
      aim.redrawAimLine();
      return;
    }

    if (cutting) {
      pushBladePoint(pointerX, pointerY);
      redrawBladeTrail();
    }
  });

  app.stage.on("pointerup", (event) => {
    if (!inputEnabled) {
      cancelAimDrag();
      endCutGesture();
      return;
    }
    if (dragSource) {
      endAimDrag(event.global.x, event.global.y);
      return;
    }
    if (cutting) endCutGesture();
  });

  app.stage.on("pointerupoutside", (event) => {
    if (!inputEnabled) {
      cancelAimDrag();
      endCutGesture();
      return;
    }
    if (dragSource) {
      endAimDrag(event.global.x, event.global.y);
      return;
    }
    if (cutting) endCutGesture();
  });

  return {
    getDragSource,
    getPointer,
    onCellPointerDown,
    tickBlade,
    syncSelection,
    setEnabled,
    cutTrail,
  };
}
