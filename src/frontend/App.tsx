import { lazy, Suspense, useEffect, useState } from "react";

export type MeResponse = {
  authenticated: boolean;
  email: string | null;
  role: string | null;
};

const AuthenticatedHome = lazy(() => import("./pages/AuthenticatedHome"));
const LoginDialog = lazy(() => import("./pages/LoginDialog"));

export default function App() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setMe({ authenticated: false, email: null, role: null });
        return;
      }

      const data = (await res.json()) as MeResponse;
      setMe(data);
    }

    loadMe().catch(() => {
      setMe({ authenticated: false, email: null, role: null });
    });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setMe({ authenticated: false, email: null, role: null });
  };

  if (!me) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.34), transparent 28%), linear-gradient(135deg, #7c3aed 0%, #2563eb 45%, #06b6d4 100%)",
          color: "#ffffff"
        }}
      >
        加载中...
      </main>
    );
  }

  return (
    <Suspense fallback={null}>
      {me.authenticated ? (
        <AuthenticatedHome me={me} onLogout={handleLogout} />
      ) : (
        <LoginDialog
          onLogin={(nextMe) => {
            setMe(nextMe);
          }}
        />
      )}
    </Suspense>
  );
}
