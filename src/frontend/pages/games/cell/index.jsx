import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell } from "./cell";
import backgroundImage from "./background.png";

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const INITIAL_CELLS = [
  { x: 312, y: 270, value: 15, color: 0x54c92b },
  { x: 480, y: 270, value: 0, color: 0x737d88 },
  { x: 648, y: 270, value: 15, color: 0xd94343 },
];

function mountCellGame(container) {
  const app = new PIXI.Application();
  let destroyed = false;
  let onKeyDown = null;

  async function initPixi() {
    await app.init({
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: 0x111820,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
    });
    const backgroundTexture = await PIXI.Assets.load(backgroundImage);

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

    const background = new PIXI.Sprite(backgroundTexture);
    const backgroundScale = Math.max(
      GAME_WIDTH / backgroundTexture.width,
      GAME_HEIGHT / backgroundTexture.height,
    );
    background.anchor.set(0.5);
    background.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    background.scale.set(backgroundScale);
    app.stage.addChild(background);

    const cells = [];
    let selectedCell = null;
    let elapsed = 0;

    function selectCell(cell) {
      if (selectedCell) selectedCell.setSelected(false);
      selectedCell = cell;
      if (selectedCell) selectedCell.setSelected(true);
    }

    INITIAL_CELLS.forEach(({ x, y, value, color }) => {
      const cell = new Cell({ x, y, value, color });
      // 选中属于控制逻辑，不写在 Cell 内部。
      cell.container.on("pointerdown", () => selectCell(cell));
      app.stage.addChild(cell.container);
      cells.push(cell);
    });

    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointerdown", (event) => {
      if (event.target === app.stage) selectCell(null);
    });

    onKeyDown = (event) => {
      if (!selectedCell) return;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedCell.changeValue(1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedCell.changeValue(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    app.ticker.add((ticker) => {
      elapsed += ticker.deltaTime;
      cells.forEach((cell, index) => {
        cell.update(ticker.deltaMS, elapsed, index);
      });
    });
  }

  initPixi().catch((err) => {
    console.error("PixiJS 初始化失败", err);
  });

  return () => {
    destroyed = true;
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

  useEffect(() => mountCellGame(containerRef.current), []);

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
        <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          点击选中细胞，↑ / ↓ 调整能量
        </div>
        <div
          ref={containerRef}
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "2px solid var(--border-light)",
            background: "#07080b",
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
