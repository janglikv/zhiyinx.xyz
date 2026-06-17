import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ConsolePage = lazy(() => import("./pages/ConsolePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function LoadingPanel() {
  return (
    <div className="shell">
      <div className="panel" style={{ textAlign: "center" }}>
        <div className="loading-spinner"></div>
        <span className="loading-text">正在检查登录状态...</span>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json<{ authenticated: boolean; email: string | null; role: string | null }>();
          if (data.authenticated && data.email) {
            setUserEmail(data.email);
            setUserRole(data.role);
            if (location.pathname === "/" || location.pathname === "/login") {
              navigate("/console", { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("检查认证状态失败:", err);
      } finally {
        setLoadingMe(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogin = (email: string, role: string | undefined) => {
    setUserEmail(email.trim().toLowerCase());
    setUserRole(role || "user");
    navigate("/console", { replace: true });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("退出请求异常:", err);
    } finally {
      setUserEmail(null);
      setUserRole(null);
      navigate("/login", { replace: true });
    }
  };

  if (loadingMe) {
    return <LoadingPanel />;
  }

  return (
    <Suspense fallback={<LoadingPanel />}>
      <Routes>
        <Route
          path="/login"
          element={userEmail ? <Navigate to="/console" replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/console"
          element={
            userEmail ? (
              <ConsolePage userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            userEmail && userRole === "admin" ? (
              <AdminPage userEmail={userEmail} onLogout={handleLogout} />
            ) : (
              <Navigate to={userEmail ? "/console" : "/login"} replace />
            )
          }
        />
        <Route path="/" element={<Navigate to={userEmail ? "/console" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={userEmail ? "/console" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
}
