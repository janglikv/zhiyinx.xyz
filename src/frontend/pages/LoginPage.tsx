import { useState } from "react";

type LoginPageProps = {
  onLogin: (email: string, role: string | undefined) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authMsgType, setAuthMsgType] = useState<"error" | "success">("error");

  const handleAuthSubmit = async (action: "login" | "register") => {
    setAuthMessage("");
    if (!authEmail || !authPassword) {
      setAuthMsgType("error");
      setAuthMessage("请填写邮箱和密码。");
      return;
    }
    if (authPassword.length < 8) {
      setAuthMsgType("error");
      setAuthMessage("密码长度不能少于 8 位。");
      return;
    }

    try {
      const endpoint = action === "register" ? "/api/register" : "/api/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json<{ error?: string; ok?: boolean; role?: string }>();

      if (!res.ok) {
        setAuthMsgType("error");
        setAuthMessage(data.error || "请求失败，请稍后重试");
        return;
      }

      if (action === "register") {
        setAuthMsgType("success");
        setAuthMessage("注册成功！请点击登录。");
      } else {
        onLogin(authEmail, data.role);
      }
    } catch {
      setAuthMsgType("error");
      setAuthMessage("网络错误，请求失败。");
    }
  };

  return (
    <main className="shell">
      <section className="panel">
        <div>
          <p className="eyebrow">zhiyinx.xyz</p>
          <h1>登录 / 注册</h1>
          <p className="muted">新用户请先注册账号，注册完成后再使用同一邮箱和密码登录。</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label>
            邮箱
            <input
              type="email"
              autoComplete="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </label>
          <div className="actions">
            <button type="submit" onClick={() => handleAuthSubmit("login")}>
              登录
            </button>
            <button type="submit" className="btn-register" onClick={() => handleAuthSubmit("register")}>
              注册
            </button>
          </div>
          {authMessage && (
            <p className={`message ${authMsgType === "success" ? "success" : ""}`} role="status">
              {authMessage}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
