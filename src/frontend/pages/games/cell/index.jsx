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
import { createAI } from "./ai";
import { LEVELS } from "./levels";

/**
 * 挂载 Pixi 场景：组装系统并固定 ticker 顺序。
 * @param {HTMLElement} container
 * @param {React.MutableRefObject<{ setBackgroundMode: Function, getBackgroundMode: Function } | null>} apiRef
 * @param {() => string} getDesiredBgMode
 * @param {Array<{x:number, y:number, value:number, color:number}>} levelCells
 * @param {number} aiSeed
 * @param {(isWin: boolean) => void} onGameEnd
 * @param {boolean} isTutorial
 * @param {() => void} onTutorialComplete
 */
function mountCellGame(container, apiRef, getDesiredBgMode, levelCells, aiSeed, onGameEnd, isTutorial, onTutorialComplete) {
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
    const cellsToCreate = levelCells || INITIAL_CELLS;
    cellsToCreate.forEach(({ x, y, value, color }) => {
      const cell = new Cell({ x, y, value, color });
      cell.container.on("pointerdown", (event) => {
        input.onCellPointerDown(cell, event);
      });
      app.stage.addChild(cell.container);
      cells.push(cell);
    });

    // —— 敌人 AI（仅红色；与玩家共用 combat） ——
    const ai = createAI({ cells, combat, seed: aiSeed });

    // 细胞后挂载：准星环与刀光需在细胞之上
    app.stage.addChild(aim.aimRing);
    app.stage.addChild(input.cutTrail);

    let gameEnded = false;
    let isGuided = isTutorial;

    // —— 固定 ticker 管道 ——
    // 1 cells  2 ai  3 fireLinks  4 blade  5 aimRing  6 linkLines  7 bullets
    app.ticker.add((ticker) => {
      if (gameEnded) return;
      elapsed += ticker.deltaTime;
      const dt = ticker.deltaMS;

      // 如果处于新手指引模式下，强行将细胞数值重置为初始，冻结时间和变化
      if (isTutorial && isGuided) {
        cells.forEach((cell, index) => {
          const init = levelCells[index];
          if (init) {
            cell.setValue(init.value);
            cell.setColor(init.color);
          }
        });
      }

      cells.forEach((cell, index) => {
        cell.update(dt, elapsed, index);
      });

      // 仅在指引完成后，AI 才开始决策更新
      if (!isGuided) {
        ai.update(dt);
      }
      
      combat.tickFireLinks(dt);
      input.tickBlade(dt);
      aim.tickAimRing(dt);
      aim.redrawLinkLines();
      combat.tickBullets(dt);

      // 检测新手指引是否完成：当玩家细胞成功拉线连接至中立（灰色）细胞
      if (isTutorial && isGuided) {
        for (const [source, link] of combat.fireLinks) {
          if (source.isPlayer() && link.target.isNeutral()) {
            isGuided = false;
            if (onTutorialComplete) {
              onTutorialComplete();
            }
            break;
          }
        }
      }

      // 检测胜负：确保在指引完成并且至少有帧率运行之后开始检测，避免初始误判
      if (!isGuided && elapsed > 8) {
        let hasPlayer = false;
        let hasEnemy = false;
        for (const cell of cells) {
          if (cell.isPlayer()) hasPlayer = true;
          if (cell.isEnemy()) hasEnemy = true;
        }

        if (!hasPlayer) {
          gameEnded = true;
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

  // 关卡状态
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => {
    const saved = localStorage.getItem("cell_game_level");
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < LEVELS.length) {
      return parsed;
    }
    return 0;
  });
  const [gameState, setGameState] = useState("playing"); // 'playing' | 'win' | 'lose'
  const [gameKey, setGameKey] = useState(0);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  const level = LEVELS[currentLevelIndex];

  // 记住关卡选择到本地
  useEffect(() => {
    localStorage.setItem("cell_game_level", currentLevelIndex);
  }, [currentLevelIndex]);

  useEffect(() => {
    setGameState("playing");
    const isLvl1 = level.id === 1;
    setIsTutorialActive(isLvl1);

    const cleanup = mountCellGame(
      containerRef.current,
      gameApiRef,
      () => bgModeRef.current,
      level.cells,
      level.aiSeed,
      (isWin) => {
        setGameState(isWin ? "win" : "lose");
      },
      isLvl1,
      () => {
        setIsTutorialActive(false);
      }
    );
    return cleanup;
  }, [currentLevelIndex, gameKey]);

  function switchBackground(mode) {
    bgModeRef.current = mode;
    setBgMode(mode);
    saveBackgroundMode(mode);
    gameApiRef.current?.setBackgroundMode(mode);
  }

  function handleRestart() {
    setGameKey((prev) => prev + 1);
  }

  function handleNextLevel() {
    if (currentLevelIndex < LEVELS.length - 1) {
      setCurrentLevelIndex((prev) => prev + 1);
    } else {
      setCurrentLevelIndex(0); // 循环回到第一关
    }
  }

  return (
    <GameLayout
      title="细胞分裂战"
      icon="🦠"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      contentWidth={GAME_WIDTH}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* 顶部栏：关卡切换与说明 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "24px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "16px",
            padding: "16px 20px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* 左侧：当前关卡详情 */}
          <div style={{ flex: "1" }}>
            <h2 style={{
              fontSize: "18px",
              fontWeight: "600",
              background: "var(--gradient-text)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
              fontFamily: "var(--font-title)",
            }}>
              {level.name}
            </h2>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: "13px",
              lineHeight: "1.6",
              maxWidth: "520px"
            }}>
              {level.description}
            </p>
          </div>

          {/* 右侧：关卡快速选择 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              选择关卡
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {LEVELS.map((lvl, index) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setCurrentLevelIndex(index)}
                  className={`btn ${currentLevelIndex === index ? "btn-primary" : "btn-ghost"}`}
                  style={{
                    width: "36px",
                    height: "36px",
                    padding: "0",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 核心画布区域，外围加遮罩定位 */}
        <div style={{ position: "relative", width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <div
            ref={containerRef}
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              border: "2px solid var(--border-light)",
              background: "#000000",
              boxShadow: "inset 0 0 35px rgba(0, 0, 0, 0.95), 0 10px 40px rgba(0,0,0,0.5)",
              width: GAME_WIDTH,
              height: GAME_HEIGHT,
            }}
          />

          {/* 新手引导高亮浮层 */}
          {isTutorialActive && (
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "85%",
                maxWidth: "580px",
                background: "rgba(10, 14, 30, 0.85)",
                border: "1px solid rgba(84, 201, 43, 0.35)",
                borderRadius: "14px",
                padding: "16px 20px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 0 30px rgba(84, 201, 43, 0.15), inset 0 0 15px rgba(84, 201, 43, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                animation: "fadeInUp 0.3s ease-out",
                zIndex: 5,
                pointerEvents: "none", // 允许点击事件穿透到下方的游戏画布
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px", animation: "spin 5s linear infinite" }}>🦠</span>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#54c92b", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  新手指导：拉线占领中立细胞
                </h3>
                <span style={{
                  background: "rgba(84, 201, 43, 0.12)",
                  color: "#54c92b",
                  fontSize: "10px",
                  padding: "2px 6px",
                  borderRadius: "6px",
                  marginLeft: "auto",
                  border: "1px solid rgba(84, 201, 43, 0.2)",
                  fontWeight: "600"
                }}>
                  等待操作中
                </span>
              </div>
              <p style={{ color: "var(--text-primary)", fontSize: "12.5px", lineHeight: "1.5", margin: 0 }}>
                按住左侧的 <strong>🟢 绿色己方细胞</strong>，拖拽拉出瞄准线，指向中间的 <strong>⚫ 灰色中立细胞</strong>。
                释放后会持续发射子弹。当灰色细胞的值减少为 0 时即可将其占领！
              </p>
            </div>
          )}

          {/* 通关 / 失败 毛玻璃遮罩层 */}
          {gameState !== "playing" && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "20px",
                backdropFilter: "blur(8px)",
                background: "rgba(5, 7, 15, 0.72)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "24px",
                animation: "fadeInUp 0.4s ease-out",
                zIndex: 10,
              }}
            >
              {gameState === "win" ? (
                <>
                  <div style={{
                    fontSize: "72px",
                    lineHeight: "1",
                    filter: "drop-shadow(0 0 20px rgba(84, 201, 43, 0.4))",
                  }}>
                    🎉
                  </div>
                  <h1 style={{
                    fontSize: "36px",
                    fontWeight: "800",
                    color: "#54c92b",
                    fontFamily: "var(--font-title)",
                    textShadow: "0 0 30px rgba(84, 201, 43, 0.3)",
                    letterSpacing: "2px",
                  }}>
                    挑战成功！
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "-8px" }}>
                    你成功占领了所有的细胞节点。
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleRestart}
                      style={{ padding: "12px 24px", borderRadius: "14px", fontSize: "14px" }}
                    >
                      重新挑战
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleNextLevel}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "14px",
                        fontSize: "14px",
                        background: "linear-gradient(135deg, #54c92b 0%, #3ca01a 100%)",
                        boxShadow: "0 4px 20px rgba(84, 201, 43, 0.3)",
                      }}
                    >
                      {currentLevelIndex === LEVELS.length - 1 ? "重玩第一关" : "下一关卡"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: "72px",
                    lineHeight: "1",
                    filter: "drop-shadow(0 0 20px rgba(217, 67, 67, 0.4))",
                  }}>
                    💀
                  </div>
                  <h1 style={{
                    fontSize: "36px",
                    fontWeight: "800",
                    color: "#d94343",
                    fontFamily: "var(--font-title)",
                    textShadow: "0 0 30px rgba(217, 67, 67, 0.3)",
                    letterSpacing: "2px",
                  }}>
                    细胞湮灭
                  </h1>
                  <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "-8px" }}>
                    你的细胞全部被吞噬了。别灰心，再试一次！
                  </p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleRestart}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "14px",
                        fontSize: "14px",
                        background: "linear-gradient(135deg, #d94343 0%, #b52b2b 100%)",
                        boxShadow: "0 4px 20px rgba(217, 67, 67, 0.3)",
                      }}
                    >
                      重新开始
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 底部：控制说明与背景切换 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "16px",
            padding: "12px 20px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <div>🟢 己方细胞</div>
            <div>🔴 敌方 AI</div>
            <div>⚫ 中立节点</div>
            <div style={{ width: "1px", height: "12px", background: "var(--border-light)" }} />
            <div>操作：按住拖拽连线发射 · 鼠标滑动划断射流</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "12px", marginRight: "4px" }}>培养基环境</span>
            {BACKGROUNDS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={bgMode === item.id ? "btn btn-primary btn-active" : "btn btn-ghost"}
                onClick={() => switchBackground(item.id)}
                style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "10px" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
