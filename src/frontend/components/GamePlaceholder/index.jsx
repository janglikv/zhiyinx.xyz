import { useNavigate, Navigate } from "react-router-dom";
import Background from "../../components/Background";
import Header from "../../components/Header";

// 统一的游戏配置表
export const GAMES_CONFIG = {
  tetris: {
    title: "俄罗斯方块",
    englishTitle: "Tetris",
    emoji: "🧱",
    description: "经典几何消除游戏，拼凑出完整的行以获得积分。",
    color: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    bgGlow: "rgba(245, 158, 11, 0.15)"
  },
  flappy: {
    title: "笨笨鸟",
    englishTitle: "Flappy Bird",
    emoji: "🐤",
    description: "控制小鸟飞行避开重重管道障碍，挑战高分极限。",
    color: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    bgGlow: "rgba(16, 185, 129, 0.15)"
  },
  tank: {
    title: "坦克大战",
    englishTitle: "Tank Battle",
    emoji: "🚜",
    description: "经典防守反击战，消灭敌方坦克并保护己方基地。",
    color: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    bgGlow: "rgba(239, 68, 68, 0.15)"
  },
  cell: {
    title: "细胞吞噬",
    englishTitle: "Cell Eater",
    emoji: "🦠",
    description: "大鱼吃小鱼的细胞微观生存演化，通过吞噬变得更强。",
    color: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
    bgGlow: "rgba(6, 182, 212, 0.15)"
  },
  snake: {
    title: "贪吃蛇",
    englishTitle: "Snake Game",
    emoji: "🐍",
    description: "引导蛇吃下食物变长，小心不要撞到墙壁或自己的身体。",
    color: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    bgGlow: "rgba(59, 130, 246, 0.15)"
  },
  minesweeper: {
    title: "扫雷",
    englishTitle: "Minesweeper",
    emoji: "💣",
    description: "逻辑推理排雷，点开所有非地雷格子以获得胜利。",
    color: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    bgGlow: "rgba(139, 92, 246, 0.15)"
  }
};

function GamePlaceholder({ gameId, me, onLogout, onOpenLogin }) {
  const navigate = useNavigate();
  const game = GAMES_CONFIG[gameId];

  // 安全检查：如果传入了不存在的游戏ID，返回主页
  if (!game) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Background />
      <Header me={me} onLogout={onLogout} onOpenLogin={onOpenLogin} />

      <main
        style={{
          minHeight: "100vh",
          position: "relative",
          padding: "24px",
          paddingTop: "74px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 游戏开发中占位卡片 */}
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "24px",
            padding: "44px 36px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: `0 20px 50px rgba(0, 0, 0, 0.35), 0 0 40px ${game.bgGlow}`,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* 顶端专属渐变饰条 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: game.color,
            }}
          />

          {/* 大图标 */}
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "24px",
              background: game.color,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              margin: "0 auto 24px",
              fontFamily: "var(--font-title)",
              boxShadow: `0 10px 30px ${game.bgGlow}`,
              border: "2px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {game.emoji}
          </div>

          {/* 游戏名称 */}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "2px",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            {game.englishTitle}
          </span>
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--text-primary)",
              fontFamily: "var(--font-title)",
              marginBottom: "8px",
            }}
          >
            {game.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginBottom: "28px",
              lineHeight: "1.6",
            }}
          >
            {game.description}
          </p>

          <div
            style={{
              height: "1px",
              background: "var(--border-light)",
              margin: "0 auto 28px",
              width: "60px",
            }}
          />

          {/* 状态面板 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.012)",
              border: "1px solid var(--border-light)",
              borderRadius: "16px",
              padding: "24px 20px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                marginBottom: "10px",
                display: "inline-block",
                animation: "spin 4s linear infinite",
              }}
            >
              ⚙️
            </div>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              游戏核心引擎构建中
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
              }}
            >
              知音游戏实验室正在为该游戏接入 D1 数据库排行榜，核心逻辑正在优化中，敬请期待！
            </p>
          </div>

          {/* 返回首页 */}
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "14px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            返回游戏大厅
          </button>
        </div>
      </main>
    </>
  );
}

export default GamePlaceholder;
