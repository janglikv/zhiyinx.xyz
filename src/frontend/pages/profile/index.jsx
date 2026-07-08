import { useNavigate, Navigate } from "react-router-dom";
import Background from "../../components/Background";
import Header from "../../components/Header";

function ProfilePage({ me, onLogout, onOpenLogin }) {
  const navigate = useNavigate();
  const username = me.email?.split("@")[0] || "用户";

  // 安全保护：如果未登录，重定向回主页
  if (!me.authenticated) {
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
        {/* 个人主页内容卡片 */}
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-light)",
            borderRadius: "24px",
            padding: "40px 32px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "var(--shadow-glow), 0 20px 50px rgba(0, 0, 0, 0.3)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            animation: "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* 顶部饰条 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "var(--gradient-primary)",
            }}
          />

          {/* 大头像 */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "32px",
              margin: "0 auto 20px",
              fontFamily: "var(--font-title)",
              boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)",
              border: "2px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {username[0]?.toUpperCase()}
          </div>

          {/* 昵称与邮箱 */}
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-title)",
              marginBottom: "6px",
            }}
          >
            {username}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginBottom: "24px",
              fontFamily: "var(--font-body)",
            }}
          >
            {me.email}
          </p>

          <div
            style={{
              height: "1px",
              background: "var(--border-light)",
              margin: "0 auto 24px",
              width: "60px",
            }}
          />

          {/* 提示空状态 */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.015)",
              border: "1px solid var(--border-light)",
              borderRadius: "16px",
              padding: "24px 20px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "8px",
                display: "inline-block",
              }}
            >
              🚀
            </div>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              个人首页建设中
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              这里是您的专属空间。未来将为您展示个人动态、喜爱的音乐以及个人设置。
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
            返回主页
          </button>
        </div>
      </main>
    </>
  );
}

export default ProfilePage;
