import { useState } from "react";
import type { MeResponse } from "../App";
import styles from "./LoginDialog.module.css";

type LoginDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
};

export default function LoginDialog({ isOpen, onClose, onLogin }: LoginDialogProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setErrorMessage("");
    if (!loginEmail || !loginPassword) {
      setErrorMessage("请填写完整的邮箱和密码。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = (await res.json()) as { error?: string; role?: string };
      if (!res.ok) {
        setErrorMessage(data.error || "登录失败，请检查账号密码。");
        return;
      }

      onLogin();
      setLoginPassword("");
      setConfirmPassword("");
      onClose(); // 登录成功，关闭弹窗
    } catch {
      setErrorMessage("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setErrorMessage("");
    if (!loginEmail || !loginPassword || !confirmPassword) {
      setErrorMessage("请填写完整的注册信息。");
      return;
    }
    if (loginPassword.length < 8) {
      setErrorMessage("密码长度不能少于 8 位。");
      return;
    }
    if (loginPassword !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(data.error || "注册失败，请稍后重试。");
        return;
      }

      setAuthMode("login");
      setLoginPassword("");
      setConfirmPassword("");
      setErrorMessage("注册成功，请使用新密码登录。");
    } catch {
      setErrorMessage("网络错误，请求失败。");
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

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? "active" : ""}`} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="关闭">
          &times;
        </button>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{authMode === "login" ? "知音 · 登录" : "知音 · 注册"}</h2>
          <p className={styles.modalSubtitle}>
            {authMode === "login"
              ? "登录以继续使用你的账户"
              : "创建一个账户，开启你的知音之旅"}
          </p>
        </div>

        {errorMessage && (
          <div className={styles.formError}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

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

          {authMode === "register" && (
            <div className={styles.formGroup}>
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
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px", justifyContent: "center", borderRadius: "10px" }} disabled={loading}>
            {loading ? "处理中..." : authMode === "login" ? "登 录" : "注 册"}
          </button>
        </form>

        <div className={styles.modalFooterTip}>
          {authMode === "login" ? "还没有知音账号？" : "已经有账号了？"}
          <span className={styles.modalSwitchLink} onClick={toggleMode}>
            {authMode === "login" ? "立即注册" : "返回登录"}
          </span>
        </div>
      </div>
    </div>
  );
}
