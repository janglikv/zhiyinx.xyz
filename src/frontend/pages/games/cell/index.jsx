import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell } from "./cell";
import { Bullet } from "./bullet";
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
     * 没能量时仍保持连线，有 1 点就打 1 发；仅源细胞变色时断链。
     * @type {Map<import("./cell").Cell, { target: import("./cell").Cell, cooldown: number, color: number }>}
     */
    const fireLinks = new Map();
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
    const linkLines = new PIXI.Graphics();
    linkLines.eventMode = "none";
    const cutTrail = new PIXI.Graphics();
    cutTrail.eventMode = "none";

    /**
     * @param {number} x
     * @param {number} y
     * @returns {import("./cell").Cell | null}
     */
    function cellAt(x, y) {
      for (let i = cells.length - 1; i >= 0; i -= 1) {
        const cell = cells[i];
        const dx = x - cell.container.x;
        const dy = y - cell.container.y;
        const hitR = Math.max(20, cell.radius + 6);
        if (dx * dx + dy * dy <= hitR * hitR) return cell;
      }
      return null;
    }

    /**
     * 瞄准线几何：从源边缘到目标边缘（便于切断，不与细胞本体抢手势）。
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
     */
    function linkEndpoints(source, target) {
      const x1 = source.container.x;
      const y1 = source.container.y;
      const x2 = target.container.x;
      const y2 = target.container.y;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const r1 = source.radius * 0.85;
      const r2 = target.radius * 0.85;
      return {
        x1: x1 + ux * r1,
        y1: y1 + uy * r1,
        x2: x2 - ux * r2,
        y2: y2 - uy * r2,
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
     * 子弹命中：同色 +1；异色 -1，归零后被占领。
     * @param {number} sourceColor
     * @param {import("./cell").Cell} target
     */
    function applyBulletHit(sourceColor, target) {
      if (target.color === sourceColor) {
        target.changeValue(1);
        return;
      }
      if (target.value <= 0) {
        target.setColor(sourceColor);
        return;
      }
      target.changeValue(-1);
      if (target.value <= 0) {
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
      if (source.value < 1) return false;

      source.changeValue(-1);
      const color = source.color;
      const bullet = new Bullet({
        x: source.container.x,
        y: source.container.y,
        color,
        source,
        target,
        getCells: () => cells,
        // 命中实际碰到的细胞（可能被中间细胞挡住）
        onHit: (hitCell) => applyBulletHit(color, hitCell),
      });
      app.stage.addChild(bullet.container);
      bullets.push(bullet);
      return true;
    }

    /**
     * @param {import("./cell").Cell} source
     * @param {import("./cell").Cell} target
     */
    function startFireLink(source, target) {
      if (source === target) return;
      const color = source.color;
      const ok = fireBullet(source, target);
      fireLinks.set(source, {
        target,
        color,
        // 打出则按体型进冷却；没能量也连着，冷却归零，有点就射
        cooldown: ok ? fireIntervalMs(source.value) : 0,
      });
      source.setSelected(true);
    }

    /** @param {import("./cell").Cell} source */
    function stopFireLink(source) {
      fireLinks.delete(source);
      source.setSelected(false);
    }

    function syncSelection() {
      cells.forEach((c) => c.setSelected(fireLinks.has(c) || c === dragSource));
    }

    /**
     * @param {PIXI.Graphics} g
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} color
     * @param {number} alpha
     * @param {boolean} dashed
     * @param {number} [width]
     */
    function drawBeam(g, x1, y1, x2, y2, color, alpha, dashed, width = 2.2) {
      if (!dashed) {
        g.moveTo(x1, y1).lineTo(x2, y2)
          .stroke({ color, width, alpha });
        return;
      }
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const ux = dx / len;
      const uy = dy / len;
      const dash = 8;
      const gap = 6;
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

    function redrawAimLine() {
      aimLine.clear();
      if (!dragSource) return;
      const x1 = dragSource.container.x;
      const y1 = dragSource.container.y;
      const hover = cellAt(pointerX, pointerY);
      const valid = !!(hover && hover !== dragSource);
      let x2;
      let y2;
      if (valid) {
        const ep = linkEndpoints(dragSource, hover);
        x2 = ep.x2;
        y2 = ep.y2;
        // 从源边缘出发
        drawBeam(aimLine, ep.x1, ep.y1, x2, y2, dragSource.color, 0.9, false, 2.4);
      } else {
        x2 = pointerX;
        y2 = pointerY;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const sx = x1 + (dx / len) * dragSource.radius * 0.85;
        const sy = y1 + (dy / len) * dragSource.radius * 0.85;
        drawBeam(aimLine, sx, sy, x2, y2, 0xffffff, 0.35, true, 1.8);
      }
      aimLine.circle(x2, y2, valid ? 5 : 3.5)
        .fill({ color: valid ? dragSource.color : 0xffffff, alpha: valid ? 0.55 : 0.3 });
    }

    function redrawLinkLines() {
      linkLines.clear();
      for (const [source, link] of fireLinks) {
        const ep = linkEndpoints(source, link.target);
        drawBeam(
          linkLines,
          ep.x1,
          ep.y1,
          ep.x2,
          ep.y2,
          source.color,
          0.42,
          true,
          2.4,
        );
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
      const target = cellAt(upX, upY);

      // 只有拖到另一个细胞才锁定连发；轻点 / 拖空不改变连发状态
      if (dragMoved && target && target !== source) {
        startFireLink(source, target);
      }

      dragSource = null;
      dragMoved = false;
      aimLine.clear();
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

    app.stage.addChild(linkLines);
    app.stage.addChild(aimLine);
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

      for (const [source, link] of [...fireLinks]) {
        if (!fireLinks.has(source)) continue;

        // 仅源变色（被占领）才断链；能量打光不断
        if (source.color !== link.color) {
          stopFireLink(source);
          continue;
        }

        // 没子弹：保持连线，冷却清零，等长出/补到 1 点立刻打
        if (source.value < 1) {
          link.cooldown = 0;
          continue;
        }

        link.cooldown -= dt;
        while (fireLinks.has(source) && link.cooldown <= 0 && source.value >= 1) {
          // 变色检测放进循环，连发中途被占也会停
          if (source.color !== link.color) {
            stopFireLink(source);
            break;
          }
          if (!fireBullet(source, link.target)) {
            // 暂时没能量：不断链，等下一tick
            link.cooldown = 0;
            break;
          }
          // 每发后按当前体型重算间隔
          link.cooldown += fireIntervalMs(Math.max(1, source.value));
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

      redrawLinkLines();

      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (!bullets[i].update(dt)) {
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
            拖到目标连发 · 划刀切断 · 子弹可挡 · 越大自增/攻速越快 · 同色 +1 · 异色 -1 · 归零占领
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
