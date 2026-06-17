import { Link } from "react-router-dom";

type ConsolePageProps = {
  userEmail: string;
  userRole: string | null;
  onLogout: () => void;
};

export default function ConsolePage({ userEmail, userRole, onLogout }: ConsolePageProps) {
  const isAdmin = userRole === "admin";

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">zhiyinx.xyz</p>
        <h1>控制台</h1>
        <p className="muted">当前登录账号：{userEmail}</p>
        <div className="actions-vertical">
          <button type="button" onClick={onLogout}>
            退出登录
          </button>
          {isAdmin && (
            <Link to="/admin" className="btn-secondary-link">
              管理后台
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
