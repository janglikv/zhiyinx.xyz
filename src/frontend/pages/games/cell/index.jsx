import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";

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

      const style = new PIXI.TextStyle({
        fontFamily: "Outfit, Arial, sans-serif",
        fontSize: 24,
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: {
          color: "#6366f1",
          width: 4,
        },
        dropShadow: {
          color: "#000000",
          blur: 4,
          angle: Math.PI / 6,
          distance: 6,
        },
      });

      const text = new PIXI.Text({
        text: "细胞吞噬 · PixiJS 渲染引擎已启动 🦠",
        style,
      });
      text.anchor.set(0.5);
      text.x = app.screen.width / 2;
      text.y = app.screen.height / 2;

      app.stage.addChild(text);
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
