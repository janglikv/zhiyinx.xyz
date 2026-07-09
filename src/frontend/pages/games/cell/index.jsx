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

      // 动画时间累加器
      let time = 0;

      app.ticker.add((ticker) => {
        time += ticker.deltaTime * 0.05;
        cells.forEach((cell) => cell.update(time));
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
