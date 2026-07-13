import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();
    let destroyed = false;

    async function initPixi() {
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x07080b,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed || !containerRef.current) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
        return;
      }

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);

      // 绘制背景网格
      const bgGraphics = new PIXI.Graphics();
      bgGraphics.stroke({ color: 0x111622, width: 1.5 });
      for (let x = 0; x < 800; x += 50) {
        bgGraphics.moveTo(x, 0);
        bgGraphics.lineTo(x, 600);
      }
      for (let y = 0; y < 600; y += 50) {
        bgGraphics.moveTo(0, y);
        bgGraphics.lineTo(800, y);
      }
      app.stage.addChild(bgGraphics);
    }

    initPixi().catch((err) => {
      console.error("PixiJS 初始化失败", err);
    });

    return () => {
      destroyed = true;
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
        appRef.current = null;
      } else {
        // 如果 init 还没有完成就退出了，用 app 实例直接尝试安全销毁
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
      }
    };
  }, []);

  return (
    <GameLayout title="细胞扩张战争" icon="🦠" me={me} onLogout={onLogout} onOpenLogin={onOpenLogin}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ position: "relative", width: "800px", height: "600px" }}>
          <div
            ref={containerRef}
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid var(--border-light)",
              background: "#07080b",
              boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.9)",
              width: "800px",
              height: "600px",
            }}
          />
        </div>
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
