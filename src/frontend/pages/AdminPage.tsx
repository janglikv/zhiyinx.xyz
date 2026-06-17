import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type UserData = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type AdminPageProps = {
  userEmail: string;
  onLogout: () => void;
};

export default function AdminPage({ userEmail, onLogout }: AdminPageProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [toastText, setToastText] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg: string) => {
    setToastText(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setIsSpinning(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("获取用户列表失败");
      }
      const data = await res.json<{ users?: UserData[] }>();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      triggerToast("⚠️ 加载数据失败，请重试");
    } finally {
      setLoadingUsers(false);
      setTimeout(() => setIsSpinning(false), 500);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const submitResetPassword = async () => {
    if (!activeUser) return;
    if (!newPassword || newPassword.length < 8) {
      alert("密码长度不能少于 8 位！");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUser.id, newPassword }),
      });
      const data = await res.json<{ error?: string }>();
      if (!res.ok) {
        throw new Error(data.error || "重置密码失败");
      }

      alert(`密码已重置成功！\n请将新密码告知用户：${newPassword}`);
      setIsResetModalOpen(false);
      setActiveUser(null);
      setNewPassword("");
    } catch (err: any) {
      alert(err.message || "请求出错");
    } finally {
      setResetLoading(false);
    }
  };

  const confirmDeleteUser = async (userId: string, email: string) => {
    const isConfirmed = confirm(
      `⚠️ 警告：您确定要彻底删除用户 ${email} 吗？\n此操作将清空该用户的所有会话，删除其账号且无法撤销！`
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json<{ error?: string }>();
      if (!res.ok) {
        throw new Error(data.error || "删除用户失败");
      }

      triggerToast("用户已成功删除");
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "请求出错");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      triggerToast("已复制到剪贴板");
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr.replace(" ", "T") + "Z");
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const getTodayUsersCount = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return users.filter((u) => u.created_at && u.created_at.startsWith(todayStr)).length;
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="brand">
          <span className="logo-icon">⚡</span>
          <div className="brand-text">
            <h2>Zhiyinx Admin</h2>
            <span className="badge">系统管理员</span>
          </div>
        </div>
        <div className="user-menu">
          <span className="user-email">{userEmail}</span>
          <Link to="/console" className="nav-link">
            控制台
          </Link>
          <button className="logout-sm" onClick={onLogout}>
            退出
          </button>
        </div>
      </header>

      <main className="admin-main">
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon users-icon">👥</div>
            <div className="stat-info">
              <span className="stat-label">用户总数</span>
              <h3>{users.length}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon active-icon">✨</div>
            <div className="stat-info">
              <span className="stat-label">今日新增</span>
              <h3>{getTodayUsersCount()}</h3>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon status-icon">🛡️</div>
            <div className="stat-info">
              <span className="stat-label">系统状态</span>
              <h3 className="status-online">运行中</h3>
            </div>
          </div>
        </section>

        <section className="table-card">
          <div className="table-header">
            <div className="title-area">
              <h3>用户目录</h3>
              <p className="subtitle">管理和查看所有已注册的用户账号</p>
            </div>
            <div className="action-area">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索用户邮箱或 ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className={`btn-refresh ${isSpinning ? "spinning" : ""}`}
                onClick={fetchUsers}
                title="刷新数据"
                disabled={loadingUsers}
              >
                <svg className="refresh-svg" viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 6a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>用户 ID</th>
                  <th>电子邮箱</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      <div className="loading-spinner"></div>
                      <span className="loading-text">正在加载用户数据...</span>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      📭 暂无用户数据
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.role === "admin" || user.email === userEmail;
                    return (
                      <tr key={user.id}>
                        <td>
                          <span className="id-badge" onClick={() => copyToClipboard(user.id)} title="点击复制完整 ID">
                            {user.id.substring(0, 8)}...
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{user.email}</td>
                        <td style={{ color: "#64748b" }}>{formatDate(user.created_at)}</td>
                        <td>
                          <div className="actions-wrapper">
                            {isSelf ? (
                              <span style={{ color: "#64748b", fontSize: "13px" }}>系统内置</span>
                            ) : (
                              <>
                                <button
                                  className="btn-action btn-reset"
                                  onClick={() => {
                                    setActiveUser({ id: user.id, email: user.email });
                                    setNewPassword("");
                                    setIsResetModalOpen(true);
                                  }}
                                >
                                  重置密码
                                </button>
                                <button className="btn-action btn-delete" onClick={() => confirmDeleteUser(user.id, user.email)}>
                                  删除用户
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              显示 {filteredUsers.length} / {users.length} 个用户
            </span>
          </div>
        </section>
      </main>

      <div className={`modal-overlay ${isResetModalOpen ? "show" : ""}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>重置用户密码</h3>
            <button
              className="modal-close"
              onClick={() => {
                setIsResetModalOpen(false);
                setActiveUser(null);
              }}
            >
              &times;
            </button>
          </div>
          <div className="modal-body">
            <p>
              正在为用户 <strong>{activeUser?.email}</strong> 重置密码。
            </p>
            <div className="form-group">
              <label>输入新密码 (最少 8 位)</label>
              <div className="password-input-wrapper">
                <input
                  type="text"
                  placeholder="请输入新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" className="btn-rand" onClick={generateRandomPassword}>
                  生成随机
                </button>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              className="btn-cancel"
              onClick={() => {
                setIsResetModalOpen(false);
                setActiveUser(null);
              }}
            >
              取消
            </button>
            <button className="btn-confirm" onClick={submitResetPassword} disabled={resetLoading}>
              {resetLoading ? "重置中..." : "确认重置"}
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${showToast ? "show" : ""}`}>{toastText}</div>
    </div>
  );
}
