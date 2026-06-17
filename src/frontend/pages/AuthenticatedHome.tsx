import { useState } from "react";
import type { MeResponse } from "../App";

type AuthenticatedHomeProps = {
  me: MeResponse;
  onLogout: () => Promise<void>;
};

export default function AuthenticatedHome({ me, onLogout }: AuthenticatedHomeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayName = me.email?.split("@")[0] || "访客";
  const roleText = me.role === "admin" ? "管理员" : "普通用户";
  const avatarText = (me.email || "G").trim().slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await onLogout();
    setSettingsOpen(false);
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
              style={{
                width: "100%",
                border: 0,
                borderRadius: "12px",
                padding: "9px 10px",
                background: "rgba(254, 226, 226, 0.9)",
                color: "#b91c1c",
                cursor: "pointer",
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
              {me.email || "暂无"}
            </p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", color: "#64748b", fontSize: "12px" }}>状态</p>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>已登录</p>
          </div>
        </div>
      </section>
    </main>
  );
}
