import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { Cell } from "./Cell";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();
    let destroyed = false;

    async function initPixi() {
      // PixiJS v8 需要异步 init，初始化完成后才能访问 app.canvas。
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x0a0e1e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed || !containerRef.current) {
        app.destroy({
          removeView: true,
          stageOptions: {
            children: true,
          },
        });
        return;
      }

      containerRef.current.appendChild(app.canvas);

      // 创建用于绘制管道连接的 Graphics，放在细胞下方
      const connectionGraphics = new PIXI.Graphics();
      app.stage.addChild(connectionGraphics);

      const cells = [];
      const colors = ["white", "green", "blue", "purple", "orange", "red"];

      colors.forEach((color, index) => {
        const cell = new Cell({
          radius: 12,
          numTentacles: 8,
          tentacleLength: 14,
          color: color,
        });
      // 6个细胞等距水平排开，左右完美留白对称（x: 120 ~ 680）
      cell.x = 120 + index * 112;
      cell.y = app.screen.height / 2;
      app.stage.addChild(cell);
      cells.push(cell);
    });

    // 调整渲染层级：管道在下方，细胞在上方
    app.stage.addChild(connectionGraphics);
    cells.forEach(cell => app.stage.addChild(cell));

    // 绑定交互事件支持按下拖拽衍生鞭毛
    let activeCell = null;
    // 维护持久的连接关系
    const connectedPairs = []; // 元素结构: { cellA, indexA, cellB, indexB }

    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;

    app.stage.on("pointerdown", (event) => {
      const globalPos = event.global;
      // 寻找距离最近的细胞
      let minDistance = Infinity;
      let nearestCell = null;
      cells.forEach((cell) => {
        const dist = Math.hypot(globalPos.x - cell.x, globalPos.y - cell.y);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCell = cell;
        }
      });

      if (nearestCell) {
        // 如果这个细胞已经存在连接，先断开跟它有关的所有连接，以便重新拖拽
        for (let i = connectedPairs.length - 1; i >= 0; i--) {
          const pair = connectedPairs[i];
          if (pair.cellA === nearestCell || pair.cellB === nearestCell) {
            pair.cellA.clearTargetPoint();
            pair.cellB.clearTargetPoint();
            connectedPairs.splice(i, 1);
          }
        }
        activeCell = nearestCell;
        activeCell.isDragging = true;
        activeCell.setTargetPoint({ x: globalPos.x, y: globalPos.y });
      }
    });

    app.stage.on("pointermove", (event) => {
      if (activeCell) {
        activeCell.isDragging = true;
        const globalPos = event.global;
        activeCell.setTargetPoint({ x: globalPos.x, y: globalPos.y });
      }
    });

    const handlePointerUp = () => {
      if (activeCell) {
        activeCell.isDragging = false;
        // 在松开时，检测当前 activeCell 锁定的鞭毛终端是否与另一个细胞的某根鞭毛的末端足够靠近
        const targetIdx = activeCell.targetTentacleIndex;
        if (targetIdx !== undefined && targetIdx !== null) {
          const tipsA = activeCell.getTentacleTipPositions();
          const activeTip = tipsA.find(t => t.index === targetIdx);

          if (activeTip) {
            let nearestMatch = null;
            let minDist = Infinity;
            const connectThreshold = 25; // 缩小检测范围，减少误判定，仅当十分贴近时触发连接

            cells.forEach(otherCell => {
              if (otherCell === activeCell) return;
              const tipsB = otherCell.getTentacleTipPositions();
              tipsB.forEach(tipB => {
                // 计算两根鞭毛左/右终端之间的最小距离
                const distLL = Math.hypot(activeTip.left.x - tipB.left.x, activeTip.left.y - tipB.left.y);
                const distLR = Math.hypot(activeTip.left.x - tipB.right.x, activeTip.left.y - tipB.right.y);
                const distRL = Math.hypot(activeTip.right.x - tipB.left.x, activeTip.right.y - tipB.left.y);
                const distRR = Math.hypot(activeTip.right.x - tipB.right.x, activeTip.right.y - tipB.right.y);

                const currentMin = Math.min(distLL, distLR, distRL, distRR);
                if (currentMin < minDist) {
                  minDist = currentMin;
                  nearestMatch = {
                    cellB: otherCell,
                    indexB: tipB.index
                  };
                }
              });
            });

            // 成功连接！
            if (minDist < connectThreshold && nearestMatch) {
              // 锁定自己鞭毛索引
              activeCell.targetTentacleIndex = targetIdx;

              // 让对方细胞的对应鞭毛萎缩 (我们将该鞭毛的 targetLength 覆盖设定为 0)
              if (nearestMatch.cellB.tentacleStates && nearestMatch.cellB.tentacleStates[nearestMatch.indexB]) {
                nearestMatch.cellB.tentacleStates[nearestMatch.indexB].targetLengthOverride = 0;
              }

              // 将自己这根鞭毛的目标点（原本指向拖拽点）重定向为对方细胞该鞭毛的起点（根部）
              const rootsB = nearestMatch.cellB.getTentacleRoots();
              const rootB = rootsB.find(r => r.index === nearestMatch.indexB);
              
              if (rootB) {
                activeCell.setTargetPoint({ x: rootB.x, y: rootB.y });
              }

              connectedPairs.push({
                cellA: activeCell,
                indexA: targetIdx,
                cellB: nearestMatch.cellB,
                indexB: nearestMatch.indexB,
                colorA: activeCell.theme.strand1 || activeCell.theme.bg,
                colorB: nearestMatch.cellB.theme.strand1 || nearestMatch.cellB.theme.bg,
              });
            } else {
              // 没连上，收回鞭毛
              activeCell.clearTargetPoint();
            }
          } else {
            activeCell.clearTargetPoint();
          }
        } else {
          activeCell.clearTargetPoint();
        }
        activeCell = null;
      }
    };

    app.stage.on("pointerup", handlePointerUp);
    app.stage.on("pointerupoutside", handlePointerUp);

    // 动画时间累加器
    let time = 0;

    app.ticker.add((ticker) => {
      time += ticker.deltaTime * 0.05;
      
      // 更新所有细胞的物理动画与鞭毛拉伸
      cells.forEach((cell) => cell.update(time));

      // 清除上一帧绘制的管道并重绘已合拢的真实平滑管道与相碰点
      connectionGraphics.clear();

      connectedPairs.forEach(pair => {
        // 对方的鞭毛萎缩（设覆盖目标长度为 0）
        if (pair.cellB.tentacleStates && pair.cellB.tentacleStates[pair.indexB]) {
          pair.cellB.tentacleStates[pair.indexB].targetLengthOverride = 0;
        }

        // 动态根据对方细胞实际的鞭毛起点（根部）世界坐标，更新自己这根鞭毛的连接锁定点
        const rootsB = pair.cellB.getTentacleRoots();
        const rootB = rootsB.find(r => r.index === pair.indexB);

        if (rootB) {
          // 锁定到对方的起点上
          pair.cellA.setTargetPoint({ x: rootB.x, y: rootB.y });
        }
      });
    });
  }

    initPixi().catch((err) => {
      console.error("PixiJS 初始化失败", err);
    });

    return () => {
      destroyed = true;
      if (app.renderer) {
        app.destroy({
          removeView: true,
          stageOptions: {
            children: true,
          },
        });
      }
    };
  }, []);

  return (
    <GameLayout title="细胞吞噬" icon="🦠" me={me} onLogout={onLogout} onOpenLogin={onOpenLogin}>
      {/* 800x600 固定非全屏 Canvas 窗口 */}
      <div
        ref={containerRef}
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          border: "2px solid var(--border-light)",
          background: "#0a0e1e",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.8)",
          width: "800px",
          height: "600px",
        }}
      />
    </GameLayout>
  );
}

export default CellEaterPage;
