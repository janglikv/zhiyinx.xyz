import { useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import * as PIXI from "pixi.js";
import Background from "../../../components/Background";
import Header from "../../../components/Header";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const navigate = useNavigate();


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
        app.destroy();
        return;
      }

      containerRef.current.appendChild(app.canvas);

      const style = new PIXI.TextStyle({
        fontFamily: "Outfit, Arial, sans-serif",
        fontSize: 24,
        fontWeight: "bold",
        fill: "#ffffff",
        stroke: "#6366f1",
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: "#000000",
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6,
      });

      const text = new PIXI.Text("细胞吞噬 · PixiJS 渲染引擎已启动 🦠", style);
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
      app.destroy(true, {
        children: true,
        texture: true,
        baseTexture: true,
      });
    };
  }, []);

  return (
    <>
      <Background />
      <Header me={me} onLogout={onLogout} onOpenLogin={onOpenLogin} />

      <main
        style={{
          minHeight: "100vh",
          position: "relative",
          padding: "24px",
          paddingTop: "80px",
          paddingBottom: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "24px",
            padding: "24px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "var(--shadow-glow), 0 20px 50px rgba(0, 0, 0, 0.35)",
            animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* 游戏面板 Header 特征 */}
          <div
            style={{
              width: "100%",
              maxWidth: "800px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              fontFamily: "var(--font-title)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🦠</span>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                细胞吞噬
              </h2>
            </div>
            <button
              onClick={() => navigate("/")}
              className="btn btn-ghost"
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "8px",
              }}
            >
              返回大厅
            </button>
          </div>

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
        </div>
      </main>
    </>
  );
}

export default CellEaterPage;
