import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Background from "../../components/Background";
import Header from "../../components/Header";
import { GAMES_CONFIG } from "../games";

function Main({ me, onLogout, onOpenLogin }) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <>
      <Background />
      <Header me={me} onLogout={onLogout} onOpenLogin={onOpenLogin} />

      <main
        style={{
          minHeight: "100vh",
          position: "relative",
          padding: "24px",
          paddingTop: "90px",
          paddingBottom: "60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "var(--font-body)",
        }}
      >

        {/* 游戏卡片网格 */}
        <section
          className="container"
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            animation: "fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
          }}
        >
          {Object.entries(GAMES_CONFIG).map(([id, game]) => {
            const isHovered = hoveredCard === id;
            return (
              <div
                key={id}
                onMouseEnter={() => setHoveredCard(id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => navigate(`/games/${id}`)}
                style={{
                  background: "var(--bg-panel)",
                  border: isHovered
                    ? "1px solid var(--border-hover)"
                    : "1px solid var(--border-light)",
                  borderRadius: "20px",
                  padding: "28px",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  position: "relative",
                  overflow: "hidden",
                  transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                  boxShadow: isHovered
                    ? `0 15px 35px rgba(0, 0, 0, 0.35), 0 0 25px ${game.bgGlow}`
                    : "var(--shadow-glow)",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* 卡片顶端细线条 */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: game.color,
                    opacity: isHovered ? 1 : 0.6,
                    transition: "opacity 0.3s ease",
                  }}
                />

                {/* 游戏大 Emoji 图标 */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: game.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    marginBottom: "20px",
                    boxShadow: isHovered ? `0 8px 20px ${game.bgGlow}` : "none",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    transition: "all 0.4s ease",
                  }}
                >
                  {game.emoji}
                </div>

                {/* 游戏标题 */}
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-title)",
                    marginBottom: "8px",
                  }}
                >
                  {game.title}
                </h3>

                {/* 游戏介绍 */}
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.6",
                    marginBottom: "24px",
                    flex: 1,
                  }}
                >
                  {game.description}
                </p>

                {/* 开始游戏按钮 */}
                <button
                  className="btn"
                  style={{
                    width: "100%",
                    background: isHovered ? game.color : "rgba(255, 255, 255, 0.02)",
                    border: isHovered
                      ? "1px solid rgba(255, 255, 255, 0.15)"
                      : "1px solid var(--border-light)",
                    color: isHovered ? "#ffffff" : "var(--text-secondary)",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "13px",
                    transition: "all 0.3s ease",
                  }}
                >
                  进入游戏 →
                </button>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}

export { Main as default };



