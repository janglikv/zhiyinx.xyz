import { useEffect, useState } from "react";

type MeResponse = {
  authenticated: boolean;
  email: string | null;
  role: string | null;
};

export default function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setMe({ authenticated: false, email: null, role: null });
        return;
      }

      setMe(await res.json<MeResponse>());
    }

    loadMe().catch(() => {
      setMe({ authenticated: false, email: null, role: null });
    });
  }, []);

  const displayName = me?.email?.split("@")[0] || "访客";
  const roleText = me?.role === "admin" ? "管理员" : me?.authenticated ? "普通用户" : "未登录";
  const avatarText = (me?.email || "G").trim().slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setMe({ authenticated: false, email: null, role: null });
    setSettingsOpen(false);
  };

  const handleLogin = async () => {
    setLoginMessage("");
    if (!loginEmail || !loginPassword) {
      setLoginMessage("请填写邮箱和密码。");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json<{ error?: string; role?: string }>();
      if (!res.ok) {
        setLoginMessage(data.error || "登录失败，请稍后重试。");
        return;
      }

      setMe({ authenticated: true, email: loginEmail.trim().toLowerCase(), role: data.role || "user" });
      setLoginPassword("");
    } catch {
      setLoginMessage("网络错误，请求失败。");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoginMessage("");
    if (!loginEmail || !loginPassword) {
      setLoginMessage("请填写邮箱和密码。");
      return;
    }
    if (loginPassword.length < 8) {
      setLoginMessage("密码长度不能少于 8 位。");
      return;
    }
    if (loginPassword !== confirmPassword) {
      setLoginMessage("两次输入的密码不一致。");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json<{ error?: string }>();
      if (!res.ok) {
        setLoginMessage(data.error || "注册失败，请稍后重试。");
        return;
      }

      setAuthMode("login");
      setLoginPassword("");
      setConfirmPassword("");
      setLoginMessage("注册成功，请登录。");
    } catch {
      setLoginMessage("网络错误，请求失败。");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background:
          "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.34), transparent 28%), linear-gradient(135deg, #7c3aed 0%, #2563eb 45%, #06b6d4 100%)"
      }}
    >
      <section
        style={{
          width: "min(calc(100vw - 64px), 227px)",
          aspectRatio: "1 / 1",
          border: "1px solid rgba(255, 255, 255, 0.42)",
          borderRadius: "22px",
          padding: "16px",
          background: "rgba(255, 255, 255, 0.72)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          color: "#111827",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative"
        }}
      >
        <button
          type="button"
          aria-label="设置"
          onClick={() => setSettingsOpen((open) => !open)}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "30px",
            height: "30px",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            borderRadius: "999px",
            padding: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(255, 255, 255, 0.58)",
            color: "#334155",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.1)"
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>⚙</span>
        </button>

        {settingsOpen && (
          <div
            style={{
              position: "absolute",
              top: "48px",
              right: "12px",
              width: "132px",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              borderRadius: "16px",
              padding: "8px",
              background: "rgba(255, 255, 255, 0.82)",
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)"
            }}
          >
            <button
              type="button"
              onClick={handleLogout}
              disabled={!me?.authenticated}
              style={{
                width: "100%",
                border: 0,
                borderRadius: "12px",
                padding: "9px 10px",
                background: me?.authenticated ? "rgba(254, 226, 226, 0.9)" : "rgba(226, 232, 240, 0.72)",
                color: me?.authenticated ? "#b91c1c" : "#94a3b8",
                cursor: me?.authenticated ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontWeight: 700
              }}
            >
              退出登录
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingRight: "34px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "15px",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #111827, #475569)",
              color: "#ffffff",
              fontSize: "19px",
              fontWeight: 700,
              flex: "0 0 auto"
            }}
          >
            {avatarText}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "18px", lineHeight: 1.2, overflowWrap: "anywhere" }}>{displayName}</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>{roleText}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          <div>
            <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "12px" }}>邮箱</p>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, overflowWrap: "anywhere" }}>
              {me?.email || "暂无"}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "12px" }}>状态</p>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>
              {me ? (me.authenticated ? "已登录" : "未登录") : "加载中"}
            </p>
          </div>
        </div>
      </section>

      {me && !me.authenticated && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(15, 23, 42, 0.32)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)"
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={authMode === "login" ? "登录" : "注册"}
            style={{
              width: "min(100%, 340px)",
              border: "1px solid rgba(255, 255, 255, 0.52)",
              borderRadius: "24px",
              padding: "22px",
              background: "rgba(255, 255, 255, 0.86)",
              boxShadow: "0 30px 80px rgba(15, 23, 42, 0.28)",
              color: "#111827"
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px", lineHeight: 1.2 }}>
              {authMode === "login" ? "登录" : "注册"}
            </h2>
            <p style={{ margin: "8px 0 18px", color: "#64748b", fontSize: "14px" }}>
              {authMode === "login" ? "登录后查看用户信息。" : "创建账号后即可返回登录。"}
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (authMode === "login") {
                  handleLogin();
                } else {
                  handleRegister();
                }
              }}
              style={{ display: "grid", gap: "12px" }}
            >
              <label style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "13px", fontWeight: 700 }}>
                邮箱
                <input
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(148, 163, 184, 0.55)",
                    borderRadius: "14px",
                    padding: "12px 13px",
                    background: "rgba(255, 255, 255, 0.72)",
                    color: "#111827",
                    font: "inherit"
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "13px", fontWeight: 700 }}>
                密码
                <input
                  type="password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(148, 163, 184, 0.55)",
                    borderRadius: "14px",
                    padding: "12px 13px",
                    background: "rgba(255, 255, 255, 0.72)",
                    color: "#111827",
                    font: "inherit"
                  }}
                />
              </label>
              {authMode === "register" && (
                <label style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "13px", fontWeight: 700 }}>
                  确认密码
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(148, 163, 184, 0.55)",
                      borderRadius: "14px",
                      padding: "12px 13px",
                      background: "rgba(255, 255, 255, 0.72)",
                      color: "#111827",
                      font: "inherit"
                    }}
                  />
                </label>
              )}
              <p
                style={{
                  minHeight: "18px",
                  margin: 0,
                  color: "#b91c1c",
                  fontSize: "13px",
                  lineHeight: "18px",
                  opacity: loginMessage ? 1 : 0
                }}
              >
                {loginMessage || "占位"}
              </p>
              <div style={{ display: "grid", gap: "6px" }}>
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    border: 0,
                    borderRadius: "14px",
                    padding: "12px 14px",
                    background: loginLoading ? "#64748b" : "#111827",
                    color: "#ffffff",
                    cursor: loginLoading ? "wait" : "pointer",
                    font: "inherit",
                    fontWeight: 700
                  }}
                >
                  {loginLoading ? (authMode === "login" ? "登录中..." : "注册中...") : authMode === "login" ? "登录" : "注册"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setConfirmPassword("");
                    setLoginMessage("");
                  }}
                  style={{
                    justifySelf: "end",
                    border: 0,
                    padding: 0,
                    background: "transparent",
                    color: "#64748b",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  {authMode === "login" ? "注册账号" : "返回登录"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
