import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell } from "./cell";
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
            点击选中细胞，↑ / ↓ 调整能量
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
