import { useState } from "react";
import styles from "./index.module.css";
function LoginDialog({ isOpen, onClose, onLogin }) {
  const [authMode, setAuthMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  if (!isOpen) return null;
  const handleLogin = async () => {
    setErrorMessage("");
    if (!loginEmail || !loginPassword) {
      setErrorMessage("\u8BF7\u586B\u5199\u5B8C\u6574\u7684\u90AE\u7BB1\u548C\u5BC6\u7801\u3002");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "\u767B\u5F55\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8D26\u53F7\u5BC6\u7801\u3002");
        return;
      }
      onLogin();
      setLoginPassword("");
      setConfirmPassword("");
      onClose();
    } catch {
      setErrorMessage("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
    } finally {
      setLoading(false);
    }
  };
  const handleRegister = async () => {
    setErrorMessage("");
    if (!loginEmail || !loginPassword || !confirmPassword) {
      setErrorMessage("\u8BF7\u586B\u5199\u5B8C\u6574\u7684\u6CE8\u518C\u4FE1\u606F\u3002");
      return;
    }
    if (loginPassword.length < 8) {
      setErrorMessage("\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 8 \u4F4D\u3002");
      return;
    }
    if (loginPassword !== confirmPassword) {
      setErrorMessage("\u4E24\u6B21\u8F93\u5165\u7684\u5BC6\u7801\u4E0D\u4E00\u81F4\u3002");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "\u6CE8\u518C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002");
        return;
      }
      setAuthMode("login");
      setLoginPassword("");
      setConfirmPassword("");
      setErrorMessage("\u6CE8\u518C\u6210\u529F\uFF0C\u8BF7\u4F7F\u7528\u65B0\u5BC6\u7801\u767B\u5F55\u3002");
    } catch {
      setErrorMessage("\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u6C42\u5931\u8D25\u3002");
    } finally {
      setLoading(false);
    }
  };
  const toggleMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
    setLoginPassword("");
    setConfirmPassword("");
    setErrorMessage("");
  };
  return <div className={`${styles.modalOverlay} ${isOpen ? "active" : ""}`} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="关闭">
          &times;
        </button>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{authMode === "login" ? "\u77E5\u97F3 \xB7 \u767B\u5F55" : "\u77E5\u97F3 \xB7 \u6CE8\u518C"}</h2>
          <p className={styles.modalSubtitle}>
            {authMode === "login" ? "\u767B\u5F55\u4EE5\u7EE7\u7EED\u4F7F\u7528\u4F60\u7684\u8D26\u6237" : "\u521B\u5EFA\u4E00\u4E2A\u8D26\u6237\uFF0C\u5F00\u542F\u4F60\u7684\u77E5\u97F3\u4E4B\u65C5"}
          </p>
        </div>

        {errorMessage && <div className={styles.formError}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>}

        <form
    onSubmit={(e) => {
      e.preventDefault();
      if (authMode === "login") {
        handleLogin();
      } else {
        handleRegister();
      }
    }}
  >
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email-input">
              邮箱地址
            </label>
            <input
    id="email-input"
    type="email"
    className={styles.formInput}
    placeholder="your-name@example.com"
    autoComplete="email"
    value={loginEmail}
    onChange={(e) => setLoginEmail(e.target.value)}
    required
  />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password-input">
              密码
            </label>
            <input
    id="password-input"
    type="password"
    className={styles.formInput}
    placeholder="••••••••"
    autoComplete={authMode === "login" ? "current-password" : "new-password"}
    value={loginPassword}
    onChange={(e) => setLoginPassword(e.target.value)}
    required
  />
          </div>

          {authMode === "register" && <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="confirm-password-input">
                确认密码
              </label>
              <input
    id="confirm-password-input"
    type="password"
    className={styles.formInput}
    placeholder="••••••••"
    autoComplete="new-password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    required
  />
            </div>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px", justifyContent: "center", borderRadius: "10px" }} disabled={loading}>
            {loading ? "\u5904\u7406\u4E2D..." : authMode === "login" ? "\u767B \u5F55" : "\u6CE8 \u518C"}
          </button>
        </form>

        <div className={styles.modalFooterTip}>
          {authMode === "login" ? "\u8FD8\u6CA1\u6709\u77E5\u97F3\u8D26\u53F7\uFF1F" : "\u5DF2\u7ECF\u6709\u8D26\u53F7\u4E86\uFF1F"}
          <span className={styles.modalSwitchLink} onClick={toggleMode}>
            {authMode === "login" ? "\u7ACB\u5373\u6CE8\u518C" : "\u8FD4\u56DE\u767B\u5F55"}
          </span>
        </div>
      </div>
    </div>;
}
export {
  LoginDialog as default
};
