import { useNavigate } from "react-router-dom";
import Background from "./Background";
import Header from "./Header";

export default function GameLayout({ children, title, icon, me, onLogout, onOpenLogin, contentWidth = 800 }) {
  const navigate = useNavigate();

  return (
    <>
      <Background />
      <Header me={me} onLogout={onLogout} onOpenLogin={onOpenLogin} />

      <main
        className="game-layout-main"
        style={{
          minHeight: "100dvh",
          position: "relative",
          padding: "24px",
          paddingTop: "80px",
          paddingBottom: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          className="game-layout-panel"
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
            width: "100%",
            maxWidth: `min(100%, ${typeof contentWidth === "number" ? `${contentWidth}px` : contentWidth})`,
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          {/* 游戏面板 Header */}
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              fontFamily: "var(--font-title)",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              {icon && <span style={{ fontSize: "20px", flexShrink: 0 }}>{icon}</span>}
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </h2>
            </div>
            <button
              onClick={() => navigate("/")}
              className="btn btn-ghost"
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "8px",
                flexShrink: 0,
              }}
            >
              返回大厅
            </button>
          </div>

          {/* 游戏内容区：占满可用宽，内部画布再缩放 */}
          <div style={{ width: "100%", minWidth: 0, display: "flex", justifyContent: "center" }}>
            {children}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 720px) {
          .game-layout-main {
            padding: 12px !important;
            padding-top: 72px !important;
            padding-bottom: 20px !important;
            align-items: flex-start !important;
          }
          .game-layout-panel {
            padding: 14px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
