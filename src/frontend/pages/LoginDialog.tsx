import { useState } from "react";
import type { MeResponse } from "../App";

type LoginDialogProps = {
  onLogin: (me: MeResponse) => void;
};

export default function LoginDialog({ onLogin }: LoginDialogProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

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
      const data = (await res.json()) as { error?: string; role?: string };
      if (!res.ok) {
        setLoginMessage(data.error || "登录失败，请稍后重试。");
        return;
      }

      onLogin({ authenticated: true, email: loginEmail.trim().toLowerCase(), role: data.role || "user" });
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
      const data = (await res.json()) as { error?: string };
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
    </main>
  );
}
