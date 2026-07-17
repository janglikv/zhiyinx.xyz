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

  async function initPixi() {
    await app.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
    });

    const textureById = await loadBackgroundTextures();

    if (destroyed) {
      try {
        app.destroy(true, { children: true });
      } catch (e) {
        // 静默忽略
      }
      return;
    }

    container.appendChild(app.canvas);
    app.ticker.maxFPS = 60;

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
      tutorial?.destroy();
      tutorial = null;
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
