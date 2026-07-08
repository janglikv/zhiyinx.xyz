import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Background from "../../components/Background";

function Main({ me, onLogout, onOpenLogin }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const username = me.email?.split("@")[0] || "用户";

  return (
    <>
      <Background />

      <main
        style={{
          minHeight: "100vh",
          position: "relative",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 右上角的用户栏 */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            display: "inline-block",
            zIndex: 100,
          }}
        >
          {me.authenticated ? (
            <div style={{ position: "relative" }}>
              {/* 头像 + 昵称 Trigger */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "6px 14px",
                  borderRadius: "16px",
                  background: hovered
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.02)",
                  border: hovered
                    ? "1px solid var(--border-hover)"
                    : "1px solid var(--border-light)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  transition: "var(--transition-smooth)",
                }}
              >
                {/* 圆形渐变头像 */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: "var(--font-title)",
                    boxShadow: "0 0 12px rgba(168, 85, 247, 0.25)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                  }}
                >
                  {username[0]?.toUpperCase()}
                </div>
                {/* 昵称 */}
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontWeight: 500,
                    fontFamily: "var(--font-title)",
                  }}
                >
                  {username}
                </span>
                {/* 小箭头 */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    color: "var(--text-secondary)",
                    transform: hovered ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* 下拉菜单 */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  paddingTop: "8px",
                  opacity: hovered ? 1 : 0,
                  transform: hovered
                    ? "translateY(0) scale(1)"
                    : "translateY(-8px) scale(0.95)",
                  pointerEvents: hovered ? "auto" : "none",
                  transition:
                    "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  zIndex: 110,
                }}
              >
                <div
                  style={{
                    width: "180px",
                    background: "rgba(10, 14, 30, 0.85)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "16px",
                    padding: "8px",
                    boxShadow:
                      "0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(99, 102, 241, 0.05)",
                  }}
                >
                  {/* 个人首页 Item */}
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setHovered(false);
                    }}
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      padding: "10px 12px",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      background: "transparent",
                      borderRadius: "10px",
                      border: "none",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.paddingLeft = "16px";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.paddingLeft = "12px";
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "8px" }}
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    个人首页
                  </button>

                  {/* 分割线 */}
                  <div
                    style={{
                      height: "1px",
                      background: "var(--border-light)",
                      margin: "6px 4px",
                    }}
                  />

                  {/* 退出登录 Item */}
                  <button
                    onClick={() => {
                      onLogout();
                      setHovered(false);
                    }}
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      padding: "10px 12px",
                      fontSize: "13px",
                      color: "var(--accent-pink)",
                      background: "transparent",
                      borderRadius: "10px",
                      border: "none",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)";
                      e.currentTarget.style.paddingLeft = "16px";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.paddingLeft = "12px";
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "8px" }}
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenLogin}>
              登录 / 注册
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export { Main as default };

