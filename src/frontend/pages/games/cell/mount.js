import * as PIXI from "pixi.js";
import { Cell } from "./cell";
import { GAME_WIDTH, GAME_HEIGHT, COLOR_NEUTRAL, COLOR_ENEMY } from "./constants";
import {
  loadBackgroundTextures,
  createBackgroundController,
} from "./background";
import { createCombat } from "./combat";
import { createAimSystem } from "./aim";
import { createInputSystem } from "./input";
import { createAI } from "./ai";
import { createTutorialController } from "./tutorial";
import {
  evaluateClearStars,
  resolveLevelStarRules,
  startingPlayerEnergy,
} from "./levels";
import { getDebugTimeScale } from "./debugSettings";

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
 * @param {(isWin: boolean, detail?: object) => void} onGameEnd
 * @param {(phase: import("./tutorial/phases").TutorialPhase) => void} onTutorialPhase
 * @param {() => void} onTutorialComplete
 * @param {(hud: {
 *   remainingSec: number,
 *   elapsedSec: number,
 *   timeLimitSec: number,
 *   starTimeSec: number,
 *   urgent: boolean,
 *   clearProgress: number,
 *   timeProgress: number,
 *   energyProgress: number,
 *   clearLit: boolean,
 *   timeLit: boolean,
 *   energyLit: boolean,
 *   playerEnergy: number,
 *   enemyEnergy: number,
 *   energyTarget: number,
 * }) => void} [onBattleHud]
 */
export function mountCellGame(
  container,
  apiRef,
  getDesiredBgMode,
  level,
  onGameEnd,
  onTutorialPhase,
  onTutorialComplete,
  onBattleHud,
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
    /** 失败：整帧冻结；胜利：场景继续动，但停自增 / 停射击 / 停 AI */
    let gamePaused = false;
    let postWinFreeze = false;
    /** 实战用时（ms）；引导未放敌前不累计，避免教学吃掉限时 */
    let battleMs = 0;
    const starRules = resolveLevelStarRules(level);
    const timeLimitMs = starRules.timeLimitSec * 1000;
    const starTimeMs = starRules.starTimeSec * 1000;
    const startEnergy = startingPlayerEnergy(level);
    const energyTarget = Math.max(1e-6, startEnergy * starRules.energyStarRatio);
    const startEnemyEnergy = Math.max(
      0,
      (level.cells || []).reduce((sum, c) => {
        if (c.color === COLOR_ENEMY) return sum + (Number(c.value) || 0);
        return sum;
      }, 0),
    );
    let lastHudSec = -1;
    /** 星进度 HUD 节流键（量化后变化才推 React） */
    let lastStarHudKey = "";

    function clearAllFireLinks() {
      for (const [source] of [...combat.fireLinks]) {
        combat.stopFireLink(source, { force: true });
      }
    }

    /**
     * @param {boolean} isWin
     * @param {"clear" | "wipe" | "timeout"} reason
     */
    function finish(isWin, reason) {
      if (gameEnded) return;
      gameEnded = true;

      if (isWin) {
        // 结算不停帧：细胞闲置动画继续，但不再自增 / 连线开火 / 交互
        postWinFreeze = true;
        gamePaused = false;
        clearAllFireLinks();
        input.setEnabled(false);
        aim.clearAimLine?.();
      } else {
        postWinFreeze = false;
        gamePaused = true;
        clearAllFireLinks();
        input.setEnabled(false);
      }

      const elapsedSec = battleMs / 1000;
      if (!isWin) {
        onGameEnd(false, {
          reason,
          elapsedSec,
          timeLimitSec: starRules.timeLimitSec,
        });
        return;
      }

      let playerEnergy = 0;
      for (const cell of cells) {
        if (cell.isPlayer()) playerEnergy += cell.value || 0;
      }

      const rating = evaluateClearStars({
        elapsedSec,
        playerEnergy,
        startPlayerEnergy: startEnergy,
        starTimeSec: starRules.starTimeSec,
        energyStarRatio: starRules.energyStarRatio,
      });

      onGameEnd(true, {
        reason: "clear",
        stars: rating.stars,
        energyOk: rating.energyOk,
        timeOk: rating.timeOk,
        energyTarget: rating.energyTarget,
        playerEnergy,
        elapsedSec: rating.elapsedSec,
        starTimeSec: rating.starTimeSec,
        timeLimitSec: starRules.timeLimitSec,
      });
    }

    app.ticker.add((ticker) => {
      if (gamePaused) return;
      // DEV 倍速：放大逻辑 dt / 帧序号，音效与真实时间不受影响
      const timeScale = getDebugTimeScale();
      elapsed += ticker.deltaTime * timeScale;
      const dt = ticker.deltaMS * timeScale;

      const freezeGrowth =
        postWinFreeze || (tutorial?.freezeGrowth ?? false);
      cells.forEach((cell, index) => {
        if (freezeGrowth) {
          // 停自增，保留呼吸 / 闲置动画
          const grow = cell.tickGrowth.bind(cell);
          cell.tickGrowth = () => {};
          // 结算期清空溢出，避免任何旁路输出
          if (postWinFreeze) cell.overflowEnergy = 0;
          cell.update(dt, elapsed, index);
          cell.tickGrowth = grow;
        } else {
          cell.update(dt, elapsed, index);
        }
      });

      const enemyUnlocked = tutorial ? tutorial.enemyUnlocked : true;

      if (!postWinFreeze) {
        if (enemyUnlocked) {
          ai.update(dt);
        }
        combat.tickFireLinks(dt);
        input.tickBlade(dt);
        tutorial?.tick();
      }

      aim.tickAimRing(dt);
      aim.redrawLinkLines();
      // 场上已有子弹可飞完消失；结算后不再产生新弹
      combat.tickBullets(dt);

      // 倒计时：教学放敌后才走表；超时判负（防动态平衡）
      if (!gameEnded && enemyUnlocked) {
        battleMs += dt;
        if (battleMs >= timeLimitMs) {
          pushBattleHud(true);
          finish(false, "timeout");
          return;
        }
      }

      if (!gameEnded) {
        pushBattleHud(false);
      }

      if (!gameEnded && enemyUnlocked && elapsed > 8) {
        let hasPlayer = false;
        let hasEnemy = false;
        for (const cell of cells) {
          if (cell.isPlayer()) hasPlayer = true;
          if (cell.isEnemy()) hasEnemy = true;
        }

        if (!hasPlayer) {
          finish(false, "wipe");
        } else if (!hasEnemy) {
          pushBattleHud(true);
          finish(true, "clear");
        }
      }
    });

    /**
     * 推送失败倒计时 + 三星进度（量化后才更新 React，降低重绘）
     * @param {boolean} force
     */
    function pushBattleHud(force) {
      if (!onBattleHud) return;

      let playerEnergy = 0;
      let enemyEnergy = 0;
      let hasEnemy = false;
      for (const cell of cells) {
        const v = cell.value || 0;
        if (cell.isPlayer()) playerEnergy += v;
        if (cell.isEnemy()) {
          hasEnemy = true;
          enemyEnergy += v;
        }
      }

      // ★1 清场：相对开局敌方能量的消灭进度；无开局红巢时有敌=0、无敌=1
      let clearProgress;
      if (startEnemyEnergy > 0) {
        clearProgress = Math.min(
          1,
          Math.max(0, 1 - enemyEnergy / startEnemyEnergy),
        );
        if (!hasEnemy) clearProgress = 1;
      } else {
        clearProgress = hasEnemy ? 0 : 1;
      }

      // ★3 时间星展示为第 2 颗：开局满格，评星时限耗尽后熄灭
      const timeProgress = Math.min(
        1,
        Math.max(0, 1 - battleMs / Math.max(1, starTimeMs)),
      );
      // ★2 能量星展示为第 3 颗
      const energyProgress = Math.min(
        1,
        Math.max(0, playerEnergy / energyTarget),
      );

      const remainingMs = Math.max(0, timeLimitMs - battleMs);
      const remainingSec = Math.ceil(remainingMs / 1000);
      const elapsedSec = battleMs / 1000;

      // 量化：进度 0–40 档 + 秒数，避免每帧 setState
      const qClear = Math.round(clearProgress * 40);
      const qTime = Math.round(timeProgress * 40);
      const qEnergy = Math.round(energyProgress * 40);
      const key = `${remainingSec}|${qClear}|${qTime}|${qEnergy}`;
      if (!force && key === lastStarHudKey) return;
      lastStarHudKey = key;
      lastHudSec = remainingSec;

      onBattleHud({
        remainingSec,
        elapsedSec,
        timeLimitSec: starRules.timeLimitSec,
        starTimeSec: starRules.starTimeSec,
        urgent: remainingSec <= 30,
        clearProgress,
        timeProgress,
        energyProgress,
        clearLit: clearProgress >= 1 - 1e-6,
        timeLit: timeProgress > 1e-6,
        energyLit: energyProgress >= 1 - 1e-6,
        playerEnergy,
        enemyEnergy,
        energyTarget,
      });
    }

    // 开局先推一帧，避免返回键旁星星空白
    pushBattleHud(true);
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
