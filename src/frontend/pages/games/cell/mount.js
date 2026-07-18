import * as PIXI from "pixi.js";
import { Cell } from "./cell";
import { GAME_WIDTH, GAME_HEIGHT, COLOR_NEUTRAL } from "./constants";
import {
  loadBackgroundTextures,
  createBackgroundController,
} from "./background";
import { createCombat } from "./combat";
import { createAimSystem } from "./aim";
import { createInputSystem } from "./input";
import { createAI } from "./ai";
import { createTutorialController } from "./tutorial";

/** 逻辑画布固定；渲染 resolution 随实际显示尺寸 × DPR 变化（全屏更清晰） */
const MIN_RENDER_RESOLUTION = 0.75;
const MAX_RENDER_RESOLUTION = 3;
const RESOLUTION_EPS = 0.04;

/**
 * 按 canvas 宿主在屏幕上的真实 CSS 像素尺寸，计算 Pixi resolution。
 * 全屏时 getBoundingClientRect 会反映放大后的显示尺寸，从而用上用户实际分辨率。
 * @param {HTMLElement} container
 */
function computeDisplayResolution(container) {
  const rect = container.getBoundingClientRect();
  const cssW = rect.width || GAME_WIDTH;
  const displayScale = cssW / GAME_WIDTH;
  const dpr = window.devicePixelRatio || 1;
  const raw = (Number.isFinite(displayScale) && displayScale > 0 ? displayScale : 1) * dpr;
  return Math.min(Math.max(raw, MIN_RENDER_RESOLUTION), MAX_RENDER_RESOLUTION);
}

/**
 * 挂载 Pixi 场景：组装系统并固定 ticker 顺序。
 * @param {HTMLElement} container
 * @param {React.MutableRefObject<{ setBackgroundMode: Function, getBackgroundMode: Function, skipTutorial?: Function } | null>} apiRef
 * @param {() => string} getDesiredBgMode
 * @param {import("./levels").LevelDef} level
 * @param {(isWin: boolean) => void} onGameEnd
 * @param {(phase: import("./tutorial/phases").TutorialPhase) => void} onTutorialPhase
 * @param {() => void} onTutorialComplete
 */
export function mountCellGame(
  container,
  apiRef,
  getDesiredBgMode,
  level,
  onGameEnd,
  onTutorialPhase,
  onTutorialComplete,
) {
  const app = new PIXI.Application();
  let destroyed = false;
  /** @type {ReturnType<typeof createTutorialController> | null} */
  let tutorial = null;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;
  /** @type {(() => void) | null} */
  let detachResize = null;

  /**
   * 同步渲染分辨率到当前实际显示尺寸（窗口缩放 / 全屏 / DPR 变化）。
   * 逻辑坐标始终为 GAME_WIDTH × GAME_HEIGHT，不影响关卡布局与输入。
   */
  function syncRendererToDisplay() {
    if (destroyed || !app.renderer || !container.isConnected) return;
    const next = computeDisplayResolution(container);
    const prev = app.renderer.resolution;
    if (Math.abs(next - prev) < RESOLUTION_EPS) return;
    try {
      app.renderer.resize(GAME_WIDTH, GAME_HEIGHT, next);
    } catch {
      // 渲染器销毁过程中忽略
    }
  }

  async function initPixi() {
    const initialRes = computeDisplayResolution(container);
    await app.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: initialRes,
      autoDensity: true,
    });

    const textureById = await loadBackgroundTextures();

    if (destroyed) {
      detachResize?.();
      detachResize = null;
      try {
        app.destroy(true, { children: true });
      } catch (e) {
        // 静默忽略
      }
      return;
    }

    container.appendChild(app.canvas);
    app.ticker.maxFPS = 60;

    // 全屏 / 视口 / 宿主尺寸变化 → 按实际像素密度重设 resolution
    syncRendererToDisplay();
    const onDisplayChange = () => {
      // 等 CSS transform / 全屏布局 settle 后再量 rect
      requestAnimationFrame(() => {
        requestAnimationFrame(syncRendererToDisplay);
      });
    };
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onDisplayChange);
      resizeObserver.observe(container);
      const stage = container.closest(".cell-stage");
      if (stage) resizeObserver.observe(stage);
    }
    window.addEventListener("resize", onDisplayChange);
    window.addEventListener("orientationchange", onDisplayChange);
    window.visualViewport?.addEventListener("resize", onDisplayChange);
    document.addEventListener("fullscreenchange", onDisplayChange);
    document.addEventListener("webkitfullscreenchange", onDisplayChange);
    detachResize = () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener("resize", onDisplayChange);
      window.removeEventListener("orientationchange", onDisplayChange);
      window.visualViewport?.removeEventListener("resize", onDisplayChange);
      document.removeEventListener("fullscreenchange", onDisplayChange);
      document.removeEventListener("webkitfullscreenchange", onDisplayChange);
    };

    const bg = createBackgroundController(app, textureById, getDesiredBgMode);

    /** @type {import("./cell").Cell[]} */
    const cells = [];
    /** @type {import("./bullet").Bullet[]} */
    const bullets = [];
    let elapsed = 0;

    const combat = createCombat({
      stage: app.stage,
      cells,
      bullets,
    });

    /** @type {ReturnType<typeof createInputSystem> | null} */
    let input = null;

    const lineLayer = app.stage.getChildIndex(bg.background) + 1;
    const aim = createAimSystem({
      stage: app.stage,
      lineLayerIndex: lineLayer,
      getCells: () => cells,
      getDragSource: () => input?.getDragSource() ?? null,
      getPointer: () => input?.getPointer() ?? { x: 0, y: 0 },
      canFireLink: combat.canFireLink,
      getFireLinks: () => combat.fireLinks,
    });

    input = createInputSystem({
      app,
      background: bg.background,
      cells,
      combat,
      aim,
    });

    /** 开局为中立的细胞下标（引导判断占领用） */
    const initialNeutralIdx = new Set();
    level.cells.forEach(({ x, y, value, color }, index) => {
      if (color === COLOR_NEUTRAL) initialNeutralIdx.add(index);
      const cell = new Cell({ x, y, value, color });
      cell.container.on("pointerdown", (event) => {
        input.onCellPointerDown(cell, event);
      });
      app.stage.addChild(cell.container);
      cells.push(cell);
    });

    const ai = createAI({ cells, combat, seed: level.aiSeed });

    if (level.tutorial) {
      tutorial = createTutorialController({
        cells,
        combat,
        aim,
        initialNeutralIdx,
        onPhase: onTutorialPhase,
        onComplete: onTutorialComplete,
      });
    }

    if (destroyed) {
      detachResize?.();
      detachResize = null;
      tutorial?.destroy();
      tutorial = null;
      try {
        app.destroy(true, { children: true });
      } catch {
        // ignore
      }
      return;
    }

    if (apiRef) {
      apiRef.current = {
        setBackgroundMode: bg.setBackgroundMode,
        getBackgroundMode: bg.getBackgroundMode,
        skipTutorial: () => tutorial?.skip(),
      };
    }

    app.stage.addChild(aim.aimRing);
    app.stage.addChild(input.cutTrail);

    let gameEnded = false;
    let gamePaused = false;

    app.ticker.add((ticker) => {
      if (gamePaused) return;
      elapsed += ticker.deltaTime;
      const dt = ticker.deltaMS;

      const freezeGrowth = tutorial?.freezeGrowth ?? false;
      cells.forEach((cell, index) => {
        if (freezeGrowth) {
          const grow = cell.tickGrowth.bind(cell);
          cell.tickGrowth = () => {};
          cell.update(dt, elapsed, index);
          cell.tickGrowth = grow;
        } else {
          cell.update(dt, elapsed, index);
        }
      });

      const enemyUnlocked = tutorial ? tutorial.enemyUnlocked : true;
      if (enemyUnlocked) {
        ai.update(dt);
      }

      combat.tickFireLinks(dt);
      input.tickBlade(dt);
      tutorial?.tick();

      aim.tickAimRing(dt);
      aim.redrawLinkLines();
      combat.tickBullets(dt);

      if (!gameEnded && enemyUnlocked && elapsed > 8) {
        let hasPlayer = false;
        let hasEnemy = false;
        for (const cell of cells) {
          if (cell.isPlayer()) hasPlayer = true;
          if (cell.isEnemy()) hasEnemy = true;
        }

        if (!hasPlayer) {
          gameEnded = true;
          gamePaused = true;
          onGameEnd(false);
        } else if (!hasEnemy) {
          gameEnded = true;
          onGameEnd(true);
        }
      }
    });
  }

  initPixi().catch((err) => {
    console.error("PixiJS 初始化失败", err);
  });

  return () => {
    destroyed = true;
    detachResize?.();
    detachResize = null;
    tutorial?.destroy();
    tutorial = null;
    if (apiRef) apiRef.current = null;
    try {
      app.destroy(true, { children: true });
    } catch (e) {
      // 初始化尚未完成时，由 initPixi 中的 destroyed 分支负责销毁。
    }
  };
}
