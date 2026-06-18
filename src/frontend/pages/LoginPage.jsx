import { useState } from "react";
function LoginPage({ onLogin }) {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authMsgType, setAuthMsgType] = useState("error");
  const handleAuthSubmit = async (action) => {
    setAuthMessage("");
    if (!authEmail || !authPassword) {
      setAuthMsgType("error");
      setAuthMessage("\u8BF7\u586B\u5199\u90AE\u7BB1\u548C\u5BC6\u7801\u3002");
      return;
    }
    if (authPassword.length < 8) {
      setAuthMsgType("error");
      setAuthMessage("\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 8 \u4F4D\u3002");
      return;
    }
    try {
      const endpoint = action === "register" ? "/api/register" : "/api/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMsgType("error");
        setAuthMessage(data.error || "\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        return;
      }
      if (action === "register") {
        setAuthMsgType("success");
        setAuthMessage("\u6CE8\u518C\u6210\u529F\uFF01\u8BF7\u70B9\u51FB\u767B\u5F55\u3002");
      } else {
        onLogin(authEmail, data.role);
      }
    } catch {
      setAuthMsgType("error");
      setAuthMessage("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u6C42\u5931\u8D25\u3002");
    }
  };
  return <main className="shell">
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
          {authMessage && <p className={`message ${authMsgType === "success" ? "success" : ""}`} role="status">
              {authMessage}
            </p>}
        </form>
      </section>
    </main>;
}
export {
  LoginPage as default
};
