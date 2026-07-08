import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Main from "./pages/main";
import ProfilePage from "./pages/profile";
import CellEaterPage from "./pages/games/cell";
import TetrisPage from "./pages/games/tetris";
import FlappyPage from "./pages/games/flappy";
import TankPage from "./pages/games/tank";
import SnakePage from "./pages/games/snake";
import MinesweeperPage from "./pages/games/minesweeper";
import LoginDialog from "./components/LoginDialog";
import Background from "./components/Background";
const AdminPage = lazy(() => import("./pages/admin"));
function App() {
  const [me, setMe] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const fetchAndSetMe = async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setMe({ authenticated: false, email: null, role: null });
        return;
      }
      const data = await res.json();
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
    }
    setMe({ authenticated: false, email: null, role: null });
  };
  if (!me) {
    return <>
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
    </>;
  }
  const isAdmin = me.authenticated && me.role === "admin";
  return <>
    {isAdmin ? (
      <Suspense fallback={null}>
        <AdminPage userEmail={me.email || ""} onLogout={handleLogout} />
      </Suspense>
    ) : (
      <Routes>
        <Route
          path="/"
          element={
            <Main
              me={me}
              onLogout={handleLogout}
              onOpenLogin={() => setIsLoginOpen(true)}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <ProfilePage
              me={me}
              onLogout={handleLogout}
              onOpenLogin={() => setIsLoginOpen(true)}
            />
          }
        />
        <Route path="/games/cell" element={<CellEaterPage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="/games/tetris" element={<TetrisPage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="/games/flappy" element={<FlappyPage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="/games/tank" element={<TankPage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="/games/snake" element={<SnakePage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="/games/minesweeper" element={<MinesweeperPage me={me} onLogout={handleLogout} onOpenLogin={() => setIsLoginOpen(true)} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )}

    <LoginDialog
      isOpen={isLoginOpen}
      onClose={() => setIsLoginOpen(false)}
      onLogin={() => {
        fetchAndSetMe();
        setIsLoginOpen(false);
      }}
    />
  </>;
}
export {
  App as default
};
