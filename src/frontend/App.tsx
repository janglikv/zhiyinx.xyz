import { useEffect, useState, lazy, Suspense } from "react";
import HomePage from "./pages/HomePage";
import LoginDialog from "./pages/LoginDialog";
import Background from "./components/Background";

export type MeResponse = {
  authenticated: boolean;
  email: string | null;
  role: string | null;
  items?: Array<{
    id: string;
    item_type: string;
    bottom: string;
    left: string;
  }>;
};

// 用 lazy 导入 AdminPage 以优化普通用户的加载耗时
const AdminPage = lazy(() => import("./pages/AdminPage"));

export default function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("zhiyin-theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("zhiyin-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const fetchAndSetMe = async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setMe({ authenticated: false, email: null, role: null });
        return;
      }

      const data = (await res.json()) as MeResponse;
      setMe(data);
    } catch {
      setMe({ authenticated: false, email: null, role: null });
    }
  };

  useEffect(() => {
    fetchAndSetMe();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    setMe({ authenticated: false, email: null, role: null });
  };

  // 在加载用户信息时，显示一个符合知音调性的精美毛玻璃 Loading
  if (!me) {
    return (
      <>
        <Background showBlob3={false} />
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            color: "var(--text-primary)",
            fontFamily: "Outfit, system-ui, sans-serif"
          }}
        >
          <div
            style={{
              padding: "40px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-light)",
              borderRadius: "24px",
              backdropFilter: "blur(20px)",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: "bold",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
                boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)"
              }}
            >
              音
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "1px", marginBottom: "0", color: "var(--text-primary)" }}>
              知音 ZHIYIN
            </h2>
          </div>
        </main>
      </>
    );
  }

  // 关键逻辑：如果已登录并且是 admin，只挂载后台管理页面
  const isAdmin = me.authenticated && me.role === "admin";

  return (
    <>
      {isAdmin ? (
        <Suspense fallback={null}>
          <AdminPage userEmail={me.email || ""} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
        </Suspense>
      ) : (
        <HomePage
          me={me}
          onLogout={handleLogout}
          onOpenLogin={() => setIsLoginOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      
      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={() => {
          fetchAndSetMe();
          setIsLoginOpen(false);
        }}
      />
    </>
  );
}
