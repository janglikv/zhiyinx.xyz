import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell } from "./cell";
import { GAME_WIDTH, GAME_HEIGHT, INITIAL_CELLS } from "./constants";
import {
  BACKGROUNDS,
  loadBackgroundMode,
  saveBackgroundMode,
  loadBackgroundTextures,
  createBackgroundController,
} from "./background";
import { createCombat } from "./combat";
import { createAimSystem } from "./aim";
import { createInputSystem } from "./input";

/**
 * 挂载 Pixi 场景：组装系统并固定 ticker 顺序。
 * @param {HTMLElement} container
 * @param {React.MutableRefObject<{ setBackgroundMode: Function, getBackgroundMode: Function } | null>} apiRef
 * @param {() => string} getDesiredBgMode
 */
function mountCellGame(container, apiRef, getDesiredBgMode) {
  const app = new PIXI.Application();
  let destroyed = false;

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

    // —— 背景 ——
    const bg = createBackgroundController(app, textureById, getDesiredBgMode);
    if (apiRef) {
      apiRef.current = {
        setBackgroundMode: bg.setBackgroundMode,
        getBackgroundMode: bg.getBackgroundMode,
      };
    }

    /** @type {import("./cell").Cell[]} */
    const cells = [];
    /** @type {import("./bullet").Bullet[]} */
    const bullets = [];
    let elapsed = 0;

    // —— 战斗（连发 / 子弹） ——
    const combat = createCombat({
      stage: app.stage,
      cells,
      bullets,
    });

    // —— 输入与瞄准互相引用，用惰性 getter 解环 ——
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

    // —— 细胞实体（状态由 Cell 自己维护） ——
    INITIAL_CELLS.forEach(({ x, y, value, color }) => {
      const cell = new Cell({ x, y, value, color });
      cell.container.on("pointerdown", (event) => {
        input.onCellPointerDown(cell, event);
      });
      app.stage.addChild(cell.container);
      cells.push(cell);
    });

    // 细胞后挂载：准星环与刀光需在细胞之上
    app.stage.addChild(aim.aimRing);
    app.stage.addChild(input.cutTrail);

    // —— 固定 ticker 管道 ——
    // 1 cells  2 fireLinks  3 blade  4 aimRing  5 linkLines  6 bullets
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaTime;
      const dt = ticker.deltaMS;

      cells.forEach((cell, index) => {
        cell.update(dt, elapsed, index);
      });

      combat.tickFireLinks(dt);
      input.tickBlade(dt);
      aim.tickAimRing(dt);
      aim.redrawLinkLines();
      combat.tickBullets(dt);
    });
  }

  initPixi().catch((err) => {
    console.error("PixiJS 初始化失败", err);
  });

  return () => {
    destroyed = true;
    if (apiRef) apiRef.current = null;
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
