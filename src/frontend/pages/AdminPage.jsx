import { useEffect, useState } from "react";
import Background from "../components/Background";
function AdminPage({ userEmail, onLogout }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [toastText, setToastText] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeItemUser, setActiveItemUser] = useState(null);
  const [itemLoading, setItemLoading] = useState(false);
  const updateLocalItem = (idx, field, val) => {
    if (!activeItemUser) return;
    const newItems = [...activeItemUser.items];
    const numericVal = val.replace(/[^0-9]/g, "");
    newItems[idx] = { ...newItems[idx], [field]: numericVal };
    setActiveItemUser({ ...activeItemUser, items: newItems });
  };
  const triggerToast = (msg) => {
    setToastText(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2e3);
  };
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setIsSpinning(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("\u83B7\u53D6\u7528\u6237\u5217\u8868\u5931\u8D25");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      triggerToast("\u26A0\uFE0F \u52A0\u8F7D\u6570\u636E\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5");
    } finally {
      setLoadingUsers(false);
      setTimeout(() => setIsSpinning(false), 500);
    }
  };
  useEffect(() => {
    document.title = "\u77E5\u97F3 \xB7 \u540E\u53F0\u7BA1\u7406\u7CFB\u7EDF";
    fetchUsers();
    return () => {
      document.title = "\u77E5\u97F3 ZHIYIN";
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
      alert("\u5BC6\u7801\u957F\u5EA6\u4E0D\u80FD\u5C11\u4E8E 8 \u4F4D\uFF01");
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUser.id, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "\u91CD\u7F6E\u5BC6\u7801\u5931\u8D25");
      }
      alert(`\u5BC6\u7801\u5DF2\u91CD\u7F6E\u6210\u529F\uFF01
\u8BF7\u5C06\u65B0\u5BC6\u7801\u544A\u77E5\u7528\u6237\uFF1A${newPassword}`);
      setIsResetModalOpen(false);
      setActiveUser(null);
      setNewPassword("");
    } catch (err) {
      alert(err.message || "\u8BF7\u6C42\u51FA\u9519");
    } finally {
      setResetLoading(false);
    }
  };
  const handleSaveItem = async (itemId, bottom, left) => {
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
        triggerToast("\u2705 \u7269\u54C1\u4FEE\u6539\u6210\u529F");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "\u4FDD\u5B58\u5931\u8D25");
      }
    } catch {
      alert("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25");
    } finally {
      setItemLoading(false);
    }
  };
  const handleDeleteItem = async (itemId) => {
    if (!confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u7269\u54C1\u5417\uFF1F")) return;
    setItemLoading(true);
    try {
      const res = await fetch("/api/admin/users/delete-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId })
      });
      if (res.ok) {
        triggerToast("\u274C \u7269\u54C1\u5DF2\u5220\u9664");
        if (activeItemUser) {
          setActiveItemUser({
            ...activeItemUser,
            items: activeItemUser.items.filter((i) => i.id !== itemId)
          });
        }
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "\u5220\u9664\u5931\u8D25");
      }
    } catch {
      alert("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25");
    } finally {
      setItemLoading(false);
    }
  };
  const handleAddItem = async (itemType) => {
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
        const data = await res.json();
        triggerToast(`\u2728 \u5DF2\u6210\u529F\u65B0\u589E\u4E00\u4E2A${itemType === "arrow" ? "\u5927\u7BAD\u5934" : "\u6742\u8D27\u94FA"}`);
        setActiveItemUser({
          ...activeItemUser,
          items: [
            ...activeItemUser.items,
            { id: data.itemId, item_type: itemType, bottom: defaultBottom, left: defaultLeft }
          ]
        });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "\u65B0\u589E\u5931\u8D25");
      }
    } catch {
      alert("\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25");
    } finally {
      setItemLoading(false);
    }
  };
  const confirmDeleteUser = async (userId, email) => {
    const isConfirmed = confirm(
      `\u26A0\uFE0F \u8B66\u544A\uFF1A\u60A8\u786E\u5B9A\u8981\u5F7B\u5E95\u5220\u9664\u7528\u6237 ${email} \u5417\uFF1F
\u6B64\u64CD\u4F5C\u5C06\u6E05\u7A7A\u8BE5\u7528\u6237\u7684\u6240\u6709\u4F1A\u8BDD\uFF0C\u5220\u9664\u5176\u8D26\u53F7\u4E14\u65E0\u6CD5\u64A4\u9500\uFF01`
    );
    if (!isConfirmed) return;
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "\u5220\u9664\u7528\u6237\u5931\u8D25");
      }
      triggerToast("\u7528\u6237\u5DF2\u6210\u529F\u5220\u9664");
      fetchUsers();
    } catch (err) {
      alert(err.message || "\u8BF7\u6C42\u51FA\u9519");
    }
  };
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      triggerToast("\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
    });
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = /* @__PURE__ */ new Date(dateStr.replace(" ", "T") + "Z");
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch {
      return dateStr;
    }
  };
  const filteredUsers = users.filter(
    (u) => u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) || u.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );
  const getTodayUsersCount = () => {
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return users.filter((u) => u.created_at && u.created_at.startsWith(todayStr)).length;
  };
  return <div className="admin-layout">
      <Background />

      <header className="header-glass">
        <div className="container header-content">
          <div className="logo-group">
            <span className="logo-text">知音 · 后台管理</span>
          </div>
          <div className="user-nav">
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
        {
    /* 数据面板卡片 */
  }
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

        {
    /* 用户管理主表格卡片 */
  }
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
                {loadingUsers ? <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                      正在加载用户数据...
                    </td>
                  </tr> : filteredUsers.length === 0 ? <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                      📭 暂无匹配的用户
                    </td>
                  </tr> : filteredUsers.map((user) => {
    const isSelf = user.role === "admin" || user.email === userEmail;
    return <tr key={user.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }} className="admin-table-row">
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
                            {isSelf ? <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>系统内置</span> : <>
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
                              </>}
                          </div>
                        </td>
                      </tr>;
  })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", marginTop: "16px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
            <span>显示 {filteredUsers.length} / {users.length} 个用户</span>
          </div>
        </section>
      </main>

      {
    /* 重置密码 Modal */
  }
      {isResetModalOpen && activeUser && <div className={`modal-overlay active`} onClick={() => {
    setIsResetModalOpen(false);
    setActiveUser(null);
  }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => {
    setIsResetModalOpen(false);
    setActiveUser(null);
  }}>
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
    onClick={() => {
      setIsResetModalOpen(false);
      setActiveUser(null);
    }}
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
                {resetLoading ? "\u5904\u7406\u4E2D..." : "\u786E\u8BA4\u91CD\u7F6E"}
              </button>
            </div>
          </div>
        </div>}

      {
    /* 物品管理 Modal */
  }
      {isItemModalOpen && activeItemUser && <div className={`modal-overlay active`} onClick={() => {
    setIsItemModalOpen(false);
    setActiveItemUser(null);
  }}>
          <div className="modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => {
    setIsItemModalOpen(false);
    setActiveItemUser(null);
  }}>
              &times;
            </button>
            <div className="modal-header">
              <h2 className="modal-title">管理用户物品</h2>
              <p className="modal-subtitle">正在配置用户 <strong>{activeItemUser.email}</strong> 的挂件装饰 (可有多个)</p>
            </div>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "20px", paddingRight: "4px" }}>
              {activeItemUser.items.length === 0 ? <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-secondary)" }}>
                  📭 暂无任何物品，点击下方按钮添加。
                </div> : activeItemUser.items.map((item, idx) => <div key={item.id} style={{ display: "flex", flexDirection: "column", paddingBottom: "12px", marginBottom: "12px", borderBottom: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: item.item_type === "arrow" ? "var(--accent-purple)" : "var(--accent-cyan)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{item.item_type === "arrow" ? "\u{1F3F9}" : "\u{1F3EA}"}</span>
                      <span>物品类型：{item.item_type === "arrow" ? "\u624B\u7ED8\u5927\u7BAD\u5934" : "\u6742\u8D27\u94FA"}</span>
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
                  </div>)}
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
    onClick={() => {
      setIsItemModalOpen(false);
      setActiveItemUser(null);
    }}
    style={{ borderRadius: "10px", padding: "8px 16px", fontSize: "12px" }}
  >
                关闭弹窗
              </button>
            </div>
          </div>
        </div>}

      {
    /* Toast 提示 */
  }
      {showToast && <div
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
      zIndex: 1e3,
      backdropFilter: "blur(8px)",
      fontSize: "14px"
    }}
  >
          {toastText}
        </div>}
    </div>;
}
export {
  AdminPage as default
};
