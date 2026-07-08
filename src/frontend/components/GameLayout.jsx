import { useNavigate } from "react-router-dom";
import Background from "./Background";
import Header from "./Header";

export default function GameLayout({ children, title, icon, me, onLogout, onOpenLogin }) {
  const navigate = useNavigate();

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
          {/* 游戏面板 Header */}
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
              {icon && <span style={{ fontSize: "20px" }}>{icon}</span>}
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
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
              }}
            >
              返回大厅
            </button>
          </div>

          {/* 游戏内容区 */}
          {children}
        </div>
      </main>
    </>
  );
}
