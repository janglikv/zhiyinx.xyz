import { useEffect, useState } from "react";
import Background from "../components/Background";

type UserData = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  items?: Array<{
    id: string;
    item_type: string;
    bottom: string;
    left: string;
  }>;
};

type AdminPageProps = {
  userEmail: string;
  onLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
};

export default function AdminPage({ userEmail, onLogout, theme, onToggleTheme }: AdminPageProps) {
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

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeItemUser, setActiveItemUser] = useState<{
    id: string;
    email: string;
    items: Array<{ id: string; item_type: string; bottom: string; left: string }>;
  } | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  const updateLocalItem = (idx: number, field: "bottom" | "left", val: string) => {
    if (!activeItemUser) return;
    const newItems = [...activeItemUser.items];
    const numericVal = val.replace(/[^0-9]/g, "");
    newItems[idx] = { ...newItems[idx], [field]: numericVal };
    setActiveItemUser({ ...activeItemUser, items: newItems });
  };

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
      const data = await res.json() as { users?: UserData[] };
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
    document.title = "知音 · 后台管理系统";
    fetchUsers();
    return () => {
      document.title = "知音 ZHIYIN";
    };
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
      const data = await res.json() as { error?: string };
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

  const handleSaveItem = async (itemId: string, bottom: string, left: string) => {
    setItemLoading(true);
    try {
      const res = await fetch("/api/admin/users/update-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          bottom: `${bottom}px`,
          left: `${left}px`
        })
      });
      if (res.ok) {
        triggerToast("✅ 物品修改成功");
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "保存失败");
      }
    } catch {
      alert("网络请求失败");
    } finally {
      setItemLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("确定要删除这个物品吗？")) return;
    setItemLoading(true);
    try {
      const res = await fetch("/api/admin/users/delete-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId })
      });
      if (res.ok) {
        triggerToast("❌ 物品已删除");
        if (activeItemUser) {
          setActiveItemUser({
            ...activeItemUser,
            items: activeItemUser.items.filter((i) => i.id !== itemId)
          });
        }
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "删除失败");
      }
    } catch {
      alert("网络请求失败");
    } finally {
      setItemLoading(false);
    }
  };

  const handleAddItem = async (itemType: "arrow" | "grocery") => {
    if (!activeItemUser) return;
    setItemLoading(true);
    const defaultBottom = itemType === "arrow" ? "80" : "160";
    const defaultLeft = itemType === "arrow" ? "600" : "360";
    try {
      const res = await fetch("/api/admin/users/add-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeItemUser.id,
          itemType,
          bottom: `${defaultBottom}px`,
          left: `${defaultLeft}px`
        })
      });
      if (res.ok) {
        const data = await res.json() as { itemId: string };
        triggerToast(`✨ 已成功新增一个${itemType === "arrow" ? "大箭头" : "杂货铺"}`);
        setActiveItemUser({
          ...activeItemUser,
          items: [
            ...activeItemUser.items,
            { id: data.itemId, item_type: itemType, bottom: defaultBottom, left: defaultLeft }
          ]
        });
        fetchUsers();
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error || "新增失败");
      }
    } catch {
      alert("网络请求失败");
    } finally {
      setItemLoading(false);
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
      const data = await res.json() as { error?: string };
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
    <div className="admin-layout">
      <Background />

      <header className="header-glass">
        <div className="container header-content">
          <div className="logo-group">
            <span className="logo-text">知音 · 后台管理</span>
          </div>
          <div className="user-nav">
            <button
              className="btn-theme-toggle"
              onClick={onToggleTheme}
              title={theme === "light" ? "切换至暗色模式" : "切换至亮色模式"}
              aria-label="切换主题"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <div className="avatar-badge">
              <div className="avatar" style={{ background: "var(--accent-purple)" }}>A</div>
              <span className="avatar-email">{userEmail}</span>
            </div>
            <button className="btn btn-ghost" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {/* 数据面板卡片 */}
        <section className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          <div className="post-card" style={{ flexDirection: "row", alignItems: "center", gap: "20px", padding: "24px" }}>
            <div style={{ fontSize: "36px" }}>👥</div>
            <div>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block" }}>用户总数</span>
              <h3 style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>{users.length}</h3>
            </div>
          </div>
          <div className="post-card" style={{ flexDirection: "row", alignItems: "center", gap: "20px", padding: "24px" }}>
            <div style={{ fontSize: "36px" }}>✨</div>
            <div>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block" }}>今日新增</span>
              <h3 style={{ fontSize: "28px", fontWeight: 700, marginTop: "4px" }}>{getTodayUsersCount()}</h3>
            </div>
          </div>

        </section>

        {/* 用户管理主表格卡片 */}
        <section className="post-card" style={{ display: "block", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px", borderBottom: "1px solid var(--border-light)", paddingBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>用户目录</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>管理和维护已注册的知音用户账号</p>
            </div>
            
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                placeholder="搜索用户邮箱或 ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "240px", padding: "8px 14px", borderRadius: "8px" }}
              />
              <button
                className={`btn btn-ghost ${isSpinning ? "btn-active" : ""}`}
                onClick={fetchUsers}
                title="刷新数据"
                disabled={loadingUsers}
                style={{ padding: "8px 12px", borderRadius: "8px" }}
              >
                🔄
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 8px" }}>用户 ID</th>
                  <th style={{ padding: "12px 8px" }}>电子邮箱</th>
                  <th style={{ padding: "12px 8px" }}>注册时间</th>
                  <th style={{ padding: "12px 8px", textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                      正在加载用户数据...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                      📭 暂无匹配的用户
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.role === "admin" || user.email === userEmail;
                    return (
                      <tr key={user.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }} className="admin-table-row">
                        <td style={{ padding: "12px 8px" }}>
                          <span
                            onClick={() => copyToClipboard(user.id)}
                            title="点击复制完整 ID"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontFamily: "monospace",
                              cursor: "pointer",
                              fontSize: "12px"
                            }}
                          >
                            {user.id.substring(0, 8)}...
                          </span>
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 500 }}>{user.email}</td>
                        <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{formatDate(user.created_at)}</td>
                        <td style={{ padding: "12px 8px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {isSelf ? (
                              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>系统内置</span>
                            ) : (
                              <>
                                <button
                                  className="btn btn-ghost"
                                  onClick={() => {
                                    setActiveUser({ id: user.id, email: user.email });
                                    setNewPassword("");
                                    setIsResetModalOpen(true);
                                  }}
                                  style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}
                                >
                                  重置密码
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  onClick={() => {
                                    setActiveItemUser({
                                      id: user.id,
                                      email: user.email,
                                      items: (user.items || []).map((item) => ({
                                        ...item,
                                        bottom: item.bottom.replace(/[^0-9]/g, ""),
                                        left: item.left.replace(/[^0-9]/g, "")
                                      }))
                                    });
                                    setIsItemModalOpen(true);
                                  }}
                                  style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px" }}
                                >
                                  管理物品
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  onClick={() => confirmDeleteUser(user.id, user.email)}
                                  style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "6px", color: "var(--accent-pink)", borderColor: "rgba(236, 72, 153, 0.2)" }}
                                >
                                  删除
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

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", marginTop: "16px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
            <span>显示 {filteredUsers.length} / {users.length} 个用户</span>
          </div>
        </section>
      </main>

      {/* 重置密码 Modal */}
      {isResetModalOpen && activeUser && (
        <div className={`modal-overlay active`} onClick={() => { setIsResetModalOpen(false); setActiveUser(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setIsResetModalOpen(false); setActiveUser(null); }}>
              &times;
            </button>
            <div className="modal-header">
              <h2 className="modal-title">重置用户密码</h2>
              <p className="modal-subtitle">正在为用户 <strong>{activeUser.email}</strong> 设置新密码</p>
            </div>
            
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label">输入新密码 (最少 8 位)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="请输入新密码"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-ghost" onClick={generateRandomPassword} style={{ borderRadius: "10px" }}>
                  生成随机
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setIsResetModalOpen(false); setActiveUser(null); }}
                style={{ borderRadius: "10px" }}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={submitResetPassword}
                disabled={resetLoading}
                style={{ borderRadius: "10px" }}
              >
                {resetLoading ? "处理中..." : "确认重置"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 物品管理 Modal */}
      {isItemModalOpen && activeItemUser && (
        <div className={`modal-overlay active`} onClick={() => { setIsItemModalOpen(false); setActiveItemUser(null); }}>
          <div className="modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setIsItemModalOpen(false); setActiveItemUser(null); }}>
              &times;
            </button>
            <div className="modal-header">
              <h2 className="modal-title">管理用户物品</h2>
              <p className="modal-subtitle">正在配置用户 <strong>{activeItemUser.email}</strong> 的挂件装饰 (可有多个)</p>
            </div>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "20px", paddingRight: "4px" }}>
              {activeItemUser.items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-secondary)" }}>
                  📭 暂无任何物品，点击下方按钮添加。
                </div>
              ) : (
                activeItemUser.items.map((item, idx) => (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", paddingBottom: "12px", marginBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: item.item_type === "arrow" ? "var(--accent-purple)" : "var(--accent-cyan)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{item.item_type === "arrow" ? "🏹" : "🏪"}</span>
                      <span>物品类型：{item.item_type === "arrow" ? "手绘大箭头" : "杂货铺"}</span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px", display: "block" }}>Bottom</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="例如 80px"
                          value={item.bottom}
                          onChange={(e) => updateLocalItem(idx, "bottom", e.target.value)}
                          style={{ padding: "8px 12px", fontSize: "13px" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: "11px", marginBottom: "4px", display: "block" }}>Left</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="例如 50%"
                          value={item.left}
                          onChange={(e) => updateLocalItem(idx, "left", e.target.value)}
                          style={{ padding: "8px 12px", fontSize: "13px" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleSaveItem(item.id, item.bottom, item.left)}
                          disabled={itemLoading}
                          style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", height: "38px" }}
                        >
                          保存
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={itemLoading}
                          style={{ padding: "8px 14px", borderRadius: "8px", fontSize: "12px", height: "38px", color: "var(--accent-pink)", borderColor: "rgba(236, 72, 153, 0.2)" }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleAddItem("arrow")}
                  disabled={itemLoading}
                  style={{ borderRadius: "10px", borderColor: "var(--accent-purple)", color: "var(--accent-purple)", padding: "8px 12px", fontSize: "12px" }}
                >
                  + 新增手绘大箭头
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleAddItem("grocery")}
                  disabled={itemLoading}
                  style={{ borderRadius: "10px", borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)", padding: "8px 12px", fontSize: "12px" }}
                >
                  + 新增杂货铺
                </button>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => { setIsItemModalOpen(false); setActiveItemUser(null); }}
                style={{ borderRadius: "10px", padding: "8px 16px", fontSize: "12px" }}
              >
                关闭弹窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10, 13, 28, 0.9)",
            border: "1px solid var(--border-hover)",
            color: "var(--text-primary)",
            padding: "10px 20px",
            borderRadius: "99px",
            boxShadow: "var(--glow-shadow)",
            zIndex: 1000,
            backdropFilter: "blur(8px)",
            fontSize: "14px"
          }}
        >
          {toastText}
        </div>
      )}
    </div>
  );
}
