import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";

type DesktopPageProps = {
  userEmail: string;
  userRole: string | null;
  onLogout: () => void;
};

type WindowState = {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

// 预设壁纸
const WALLPAPERS = [
  {
    id: "aurora",
    name: "极光幽境",
    style: "radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.45), transparent 60%), radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.45), transparent 60%), radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.3), transparent 70%), #080b11"
  },
  {
    id: "sunset",
    name: "落日余晖",
    style: "radial-gradient(circle at 10% 20%, rgba(244, 63, 94, 0.45), transparent 65%), radial-gradient(circle at 90% 80%, rgba(249, 115, 22, 0.45), transparent 65%), #0d0915"
  },
  {
    id: "cosmic",
    name: "深空幽蓝",
    style: "radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.55), transparent 70%), radial-gradient(circle at 80% 90%, rgba(168, 85, 247, 0.45), transparent 70%), #02010a"
  },
  {
    id: "minimal",
    name: "暗黑极简",
    style: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
  }
];

// 用户管理子应用所需类型
type UserData = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export default function DesktopPage({ userEmail, userRole, onLogout }: DesktopPageProps) {
  const isAdmin = userRole === "admin";
  
  // 1. 系统时间与日期状态
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      setDateStr(now.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "short" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. 托盘/控制中心弹出菜单状态
  const [showControlCenter, setShowControlCenter] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 3. 当前选择的壁纸
  const [activeWallpaper, setActiveWallpaper] = useState(() => {
    return localStorage.getItem("zhiyinx_wallpaper") || "aurora";
  });

  const getWallpaperStyle = () => {
    const wp = WALLPAPERS.find((w) => w.id === activeWallpaper);
    return wp ? wp.style : WALLPAPERS[0].style;
  };

  const changeWallpaper = (id: string) => {
    setActiveWallpaper(id);
    localStorage.setItem("zhiyinx_wallpaper", id);
  };

  // 4. 窗口数据列表
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10);

  // 初始化窗口定义
  const windowTemplates = {
    settings: { title: "系统设置", icon: "⚙️", w: 480, h: 420 },
    users: { title: "用户管理", icon: "👥", w: 780, h: 520 },
    monitor: { title: "系统监控", icon: "📊", w: 560, h: 410 },
    terminal: { title: "终端控制", icon: "💻", w: 660, h: 420 },
    notepad: { title: "云记事本", icon: "📝", w: 500, h: 400 }
  };

  // 打开或置顶窗口
  const openWindow = (appId: string) => {
    setShowControlCenter(false);
    setShowUserMenu(false);

    setWindows((prev) => {
      const existing = prev.find((w) => w.id === appId);
      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);

      if (existing) {
        return prev.map((w) => {
          if (w.id === appId) {
            return { ...w, isOpen: true, isMinimized: false, zIndex: newZ };
          }
          return w;
        });
      } else {
        // 创建新窗口，并放置在屏幕中央随机偏移处
        const template = windowTemplates[appId as keyof typeof windowTemplates];
        if (!template) return prev;

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const offset = (prev.length * 25) % 150;
        const initialX = Math.max(40, (screenW - template.w) / 2 + offset);
        const initialY = Math.max(50, (screenH - template.h) / 2 + offset);

        return [
          ...prev,
          {
            id: appId,
            title: template.title,
            icon: template.icon,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            zIndex: newZ,
            x: initialX,
            y: initialY,
            w: template.w,
            h: template.h
          }
        ];
      }
    });
  };

  // 聚焦置顶窗口
  const focusWindow = (id: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w))
    );
  };

  // 关闭窗口
  const closeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w))
    );
  };

  // 最小化窗口
  const minimizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  };

  // 最大化/恢复窗口
  const toggleMaximizeWindow = (id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  // 拖动窗口实现
  const handleDragStart = (id: string, e: React.MouseEvent) => {
    // 阻止非左键点击，或点击控制按钮时的拖动
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".win-ctrl-btn")) return;

    focusWindow(id);
    const win = windows.find((w) => w.id === id);
    if (!win || win.isMaximized) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = win.x;
    const initialY = win.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // 限制不越出屏幕太夸张
      const nextX = initialX + dx;
      const nextY = Math.max(36, initialY + dy); // 不要越过顶栏

      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, x: nextX, y: nextY } : w))
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 4. 模拟控制中心的状态
  const [volume, setVolume] = useState(80);
  const [brightness, setBrightness] = useState(90);
  const [wifiOn, setWifiOn] = useState(true);
  const [bluetoothOn, setBluetoothOn] = useState(true);
  const [dndOn, setDndOn] = useState(false);

  return (
    <div
      className="desktop-env"
      style={{ background: getWallpaperStyle() } as React.CSSProperties}
      onClick={() => {
        setShowControlCenter(false);
        setShowUserMenu(false);
      }}
    >
      {/* 动态流光背景点缀 */}
      <div className="desktop-orb orb-1"></div>
      <div className="desktop-orb orb-2"></div>
      <div className="desktop-orb orb-3"></div>

      {/* 顶部菜单栏 (TopBar) */}
      <header className="desktop-topbar" onClick={(e) => e.stopPropagation()}>
        <div className="topbar-left">
          <div className="topbar-logo" onClick={() => setShowUserMenu(!showUserMenu)}>
            ⚡ <span className="logo-text">Zhiyinx OS</span>
          </div>
          <span className="topbar-divider">|</span>
          <button className="topbar-btn" onClick={() => openWindow("settings")}>
            设置
          </button>
          <button className="topbar-btn" onClick={() => openWindow("monitor")}>
            监控
          </button>
          <button className="topbar-btn" onClick={() => openWindow("terminal")}>
            终端
          </button>
          {isAdmin && (
            <button className="topbar-btn" onClick={() => openWindow("users")}>
              用户
            </button>
          )}
        </div>

        <div className="topbar-center">
          <span className="topbar-clock">{dateStr} {timeStr}</span>
        </div>

        <div className="topbar-right">
          <button className="topbar-status-icon" onClick={() => setWifiOn(!wifiOn)}>
            {wifiOn ? "📶" : "📴"}
          </button>
          <button className="topbar-status-icon" onClick={() => setBluetoothOn(!bluetoothOn)}>
            {bluetoothOn ? "🔹" : "🔸"}
          </button>
          <div className="topbar-control-tray" onClick={() => setShowControlCenter(!showControlCenter)}>
            <span>🔋 100%</span>
            <span>🔊</span>
            <span className="tray-user">{userEmail.split("@")[0]}</span>
          </div>
        </div>

        {/* 顶部左侧弹出用户菜单 */}
        {showUserMenu && (
          <div className="desktop-menu user-dropdown">
            <div className="menu-header">
              <div className="user-avatar">👤</div>
              <div className="user-details">
                <span className="user-name">{userEmail}</span>
                <span className="user-role-tag">{isAdmin ? "系统管理员" : "标准用户"}</span>
              </div>
            </div>
            <div className="menu-divider"></div>
            <button className="menu-item" onClick={() => openWindow("settings")}>
              ⚙️ 系统偏好设置
            </button>
            <button className="menu-item" onClick={() => openWindow("notepad")}>
              📝 打开备忘录
            </button>
            <div className="menu-divider"></div>
            <button className="menu-item text-danger" onClick={onLogout}>
              🚪 退出登录
            </button>
          </div>
        )}

        {/* 顶部右侧控制中心弹窗 */}
        {showControlCenter && (
          <div className="desktop-menu control-center-card">
            <h4>控制中心</h4>
            <div className="quick-settings-grid">
              <button className={`qs-tile ${wifiOn ? "active" : ""}`} onClick={() => setWifiOn(!wifiOn)}>
                <span className="qs-icon">📶</span>
                <span className="qs-label">WLAN</span>
              </button>
              <button className={`qs-tile ${bluetoothOn ? "active" : ""}`} onClick={() => setBluetoothOn(!bluetoothOn)}>
                <span className="qs-icon">🔹</span>
                <span className="qs-label">蓝牙</span>
              </button>
              <button className={`qs-tile ${dndOn ? "active" : ""}`} onClick={() => setDndOn(!dndOn)}>
                <span className="qs-icon">🌙</span>
                <span className="qs-label">勿扰模式</span>
              </button>
              <button className="qs-tile active" onClick={() => openWindow("monitor")}>
                <span className="qs-icon">📊</span>
                <span className="qs-label">监控</span>
              </button>
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>亮度</span>
                <span>{brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-label">
                <span>音量</span>
                <span>{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </div>

            <div className="system-info-compact">
              <span className="uptime">系统节点: Cloudflare Edge</span>
              <button className="btn-logout-cc" onClick={onLogout}>注销账号</button>
            </div>
          </div>
        )}
      </header>

      {/* 桌面主要空间 (Icons & Windows) */}
      <main className="desktop-space" onClick={() => {
        setShowControlCenter(false);
        setShowUserMenu(false);
      }}>
        {/* 桌面图标网格 */}
        <div className="desktop-icons">
          <button className="desktop-icon-btn" onDoubleClick={() => openWindow("settings")}>
            <span className="icon-graphic gradient-orange">⚙️</span>
            <span className="icon-label">系统设置</span>
          </button>

          <button className="desktop-icon-btn" onDoubleClick={() => openWindow("monitor")}>
            <span className="icon-graphic gradient-purple">📊</span>
            <span className="icon-label">系统监控</span>
          </button>

          <button className="desktop-icon-btn" onDoubleClick={() => openWindow("terminal")}>
            <span className="icon-graphic gradient-dark">💻</span>
            <span className="icon-label">命令终端</span>
          </button>

          <button className="desktop-icon-btn" onDoubleClick={() => openWindow("notepad")}>
            <span className="icon-graphic gradient-green">📝</span>
            <span className="icon-label">云记事本</span>
          </button>

          {isAdmin && (
            <button className="desktop-icon-btn" onDoubleClick={() => openWindow("users")}>
              <span className="icon-graphic gradient-blue">👥</span>
              <span className="icon-label">用户管理</span>
            </button>
          )}
        </div>

        {/* 渲染桌面窗口 */}
        {windows
          .filter((w) => w.isOpen)
          .map((win) => {
            const isFocused = win.zIndex === maxZIndex;
            return (
              <div
                key={win.id}
                className={`desktop-window ${isFocused ? "focused" : ""} ${win.isMinimized ? "minimized" : ""} ${win.isMaximized ? "maximized" : ""}`}
                style={{
                  zIndex: win.zIndex,
                  left: win.isMaximized ? 0 : `${win.x}px`,
                  top: win.isMaximized ? "36px" : `${win.y}px`,
                  width: win.isMaximized ? "100%" : `${win.w}px`,
                  height: win.isMaximized ? "calc(100% - 36px - 80px)" : `${win.h}px`
                } as React.CSSProperties}
                onMouseDown={() => focusWindow(win.id)}
              >
                {/* 窗口头部 (标题栏) */}
                <div
                  className="window-header"
                  onMouseDown={(e) => handleDragStart(win.id, e)}
                  onDoubleClick={() => toggleMaximizeWindow(win.id)}
                >
                  <div className="window-controls">
                    <button
                      className="win-ctrl-btn ctrl-close"
                      onClick={() => closeWindow(win.id)}
                      title="关闭"
                    ></button>
                    <button
                      className="win-ctrl-btn ctrl-min"
                      onClick={() => minimizeWindow(win.id)}
                      title="最小化"
                    ></button>
                    <button
                      className="win-ctrl-btn ctrl-max"
                      onClick={() => toggleMaximizeWindow(win.id)}
                      title={win.isMaximized ? "还原" : "最大化"}
                    ></button>
                  </div>
                  <span className="window-title">
                    <span className="window-title-icon">{win.icon}</span> {win.title}
                  </span>
                  <div className="window-header-spacer"></div>
                </div>

                {/* 窗口内容 */}
                <div className="window-body">
                  {win.id === "settings" && (
                    <SettingsApp
                      userEmail={userEmail}
                      userRole={userRole}
                      activeWallpaper={activeWallpaper}
                      changeWallpaper={changeWallpaper}
                      onLogout={onLogout}
                    />
                  )}
                  {win.id === "users" && isAdmin && (
                    <UsersManagementApp userEmail={userEmail} />
                  )}
                  {win.id === "monitor" && (
                    <SystemMonitorApp />
                  )}
                  {win.id === "terminal" && (
                    <TerminalApp isAdmin={isAdmin} userEmail={userEmail} />
                  )}
                  {win.id === "notepad" && (
                    <NotepadApp />
                  )}
                </div>
              </div>
            );
          })}
      </main>

      {/* 底部 Dock 栏 */}
      <div className="desktop-dock-container">
        <nav className="desktop-dock">
          <button
            className={`dock-item ${windows.find(w => w.id === "settings" && w.isOpen) ? "running" : ""}`}
            onClick={() => openWindow("settings")}
            title="系统设置"
          >
            <span className="dock-icon">⚙️</span>
            <span className="dock-dot"></span>
          </button>
          <button
            className={`dock-item ${windows.find(w => w.id === "monitor" && w.isOpen) ? "running" : ""}`}
            onClick={() => openWindow("monitor")}
            title="系统监控"
          >
            <span className="dock-icon">📊</span>
            <span className="dock-dot"></span>
          </button>
          <button
            className={`dock-item ${windows.find(w => w.id === "terminal" && w.isOpen) ? "running" : ""}`}
            onClick={() => openWindow("terminal")}
            title="黑客终端"
          >
            <span className="dock-icon">💻</span>
            <span className="dock-dot"></span>
          </button>
          <button
            className={`dock-item ${windows.find(w => w.id === "notepad" && w.isOpen) ? "running" : ""}`}
            onClick={() => openWindow("notepad")}
            title="云记事本"
          >
            <span className="dock-icon">📝</span>
            <span className="dock-dot"></span>
          </button>
          {isAdmin && (
            <button
              className={`dock-item ${windows.find(w => w.id === "users" && w.isOpen) ? "running" : ""}`}
              onClick={() => openWindow("users")}
              title="用户管理"
            >
              <span className="dock-icon">👥</span>
              <span className="dock-dot"></span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

/* ==========================================================================
   1. 系统设置子应用 (SettingsApp)
   ========================================================================== */
type SettingsAppProps = {
  userEmail: string;
  userRole: string | null;
  activeWallpaper: string;
  changeWallpaper: (id: string) => void;
  onLogout: () => void;
};
function SettingsApp({ userEmail, userRole, activeWallpaper, changeWallpaper, onLogout }: SettingsAppProps) {
  return (
    <div className="app-settings">
      <section className="settings-section">
        <h5>👤 个人账户</h5>
        <div className="settings-card">
          <div className="settings-row">
            <span className="lbl">当前账户</span>
            <span className="val bold">{userEmail}</span>
          </div>
          <div className="settings-row">
            <span className="lbl">账户类型</span>
            <span className="val badge-role">{userRole === "admin" ? "系统管理员" : "标准用户"}</span>
          </div>
          <div className="settings-row action-row">
            <button className="btn-app-logout text-danger" onClick={onLogout}>退出登录</button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h5>🌄 壁纸与外观</h5>
        <div className="wallpaper-grid">
          {WALLPAPERS.map((wp) => (
            <button
              key={wp.id}
              className={`wallpaper-card ${activeWallpaper === wp.id ? "active" : ""}`}
              onClick={() => changeWallpaper(wp.id)}
            >
              <div className="wp-preview" style={{ background: wp.style } as React.CSSProperties}></div>
              <span className="wp-name">{wp.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h5>🖥️ 关于 Zhiyinx OS</h5>
        <div className="settings-card info-card">
          <p><strong>版本:</strong> v1.2.0-Alpha</p>
          <p><strong>内核:</strong> React v18 + Vite Engine</p>
          <p><strong>计算平台:</strong> Cloudflare Pages & Workers D1</p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "12px" }}>
            Zhiyinx OS 是基于边缘计算构建的轻量级、响应式云端桌面工作区，提供快速的数据交互和极简的管理逻辑。
          </p>
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   2. 用户管理子应用 (UsersManagementApp) - 仅限 Admin
   ========================================================================== */
function UsersManagementApp({ userEmail }: { userEmail: string }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json<{ users?: UserData[] }>();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("加载用户失败", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGenPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let p = "";
    for (let i = 0; i < 12; i++) {
      p += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(p);
  };

  const handleResetPassword = async () => {
    if (!targetUser) return;
    if (newPassword.length < 8) {
      alert("密码不能短于 8 位！");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser.id, newPassword })
      });
      if (res.ok) {
        alert(`重置成功！新密码为：${newPassword}\n请复制并告知用户。`);
        setIsModalOpen(false);
        setTargetUser(null);
        setNewPassword("");
      } else {
        const data = await res.json<{ error?: string }>();
        alert(`失败: ${data.error || "请求异常"}`);
      }
    } catch {
      alert("密码重置请求失败，网络异常");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`⚠️ 警告：您确定要彻底删除用户 [${email}] 吗？`)) return;
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        alert("用户已删除！");
        fetchUsers();
      } else {
        const data = await res.json<{ error?: string }>();
        alert(`删除失败: ${data.error || "请求异常"}`);
      }
    } catch {
      alert("请求异常");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="app-users">
      <div className="users-toolbar">
        <input
          type="text"
          className="search-input-sm"
          placeholder="搜索邮箱或ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn-primary-sm" onClick={fetchUsers} disabled={loading}>
          🔄 {loading ? "刷新中" : "刷新列表"}
        </button>
      </div>

      <div className="users-table-container">
        <table className="mini-user-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="cell-center text-muted">加载中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="cell-center text-muted">暂无数据</td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isSelf = u.email === userEmail || u.role === "admin";
                return (
                  <tr key={u.id}>
                    <td className="bold">{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td className="text-muted">{new Date(u.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
                    <td>
                      {isSelf ? (
                        <span className="text-muted text-xs">内置/当前</span>
                      ) : (
                        <div className="tbl-actions">
                          <button
                            className="btn-tbl btn-tbl-reset"
                            onClick={() => {
                              setTargetUser({ id: u.id, email: u.email });
                              setNewPassword("");
                              setIsModalOpen(true);
                            }}
                          >
                            密码
                          </button>
                          <button
                            className="btn-tbl btn-tbl-del"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && targetUser && (
        <div className="app-modal-overlay">
          <div className="app-modal">
            <h6>🔒 重置用户密码</h6>
            <p className="text-xs text-muted" style={{ marginBottom: "12px" }}>
              账号: <strong>{targetUser.email}</strong>
            </p>
            <div className="app-form-group">
              <input
                type="text"
                className="input-password-sm"
                placeholder="在此输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button className="btn-rand-password" onClick={handleGenPassword}>
                生成随机
              </button>
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>取消</button>
              <button className="btn-confirm-sm" onClick={handleResetPassword} disabled={saving}>
                {saving ? "提交中..." : "确认重置"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   3. 系统监控子应用 (SystemMonitorApp)
   ========================================================================== */
function SystemMonitorApp() {
  const [metrics, setMetrics] = useState({
    cpu: 24,
    memory: 42,
    netDelay: 12,
    disk: 15
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        // 让数据随机小幅波动，更有真实感
        const change = (val: number, min: number, max: number) => {
          const delta = Math.floor(Math.random() * 9) - 4; // -4 到 4
          return Math.max(min, Math.min(max, val + delta));
        };
        return {
          cpu: change(prev.cpu, 5, 95),
          memory: change(prev.memory, 30, 85),
          netDelay: change(prev.netDelay, 5, 45),
          disk: prev.disk
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-monitor">
      <div className="monitor-cards-grid">
        <div className="monitor-card-item">
          <div className="card-lbl">CPU 使用率</div>
          <div className="card-val">{metrics.cpu}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill fill-cpu" style={{ width: `${metrics.cpu}%` }}></div>
          </div>
          <span className="text-xs text-muted">双核虚拟处理器</span>
        </div>

        <div className="monitor-card-item">
          <div className="card-lbl">内存占用</div>
          <div className="card-val">{metrics.memory}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill fill-mem" style={{ width: `${metrics.memory}%` }}></div>
          </div>
          <span className="text-xs text-muted">已用 430MB / 1024MB</span>
        </div>

        <div className="monitor-card-item">
          <div className="card-lbl">磁盘使用空间</div>
          <div className="card-val">{metrics.disk}%</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill fill-disk" style={{ width: `${metrics.disk}%` }}></div>
          </div>
          <span className="text-xs text-muted">已用 3.1GB / 20GB</span>
        </div>

        <div className="monitor-card-item">
          <div className="card-lbl">网络延迟</div>
          <div className="card-val">{metrics.netDelay} ms</div>
          <div className="net-status-dot"></div>
          <span className="text-xs text-muted">Cloudflare Network: 良好</span>
        </div>
      </div>

      <div className="monitor-details-panel">
        <h6>📈 节点资源监控详情</h6>
        <div className="details-list">
          <div className="details-row"><span>WebOS 环境:</span> <span>production / edge</span></div>
          <div className="details-row"><span>API 连接通道:</span> <span className="text-success">HTTPS / Keep-Alive</span></div>
          <div className="details-row"><span>D1 存储适配器:</span> <span className="text-success">Connected</span></div>
          <div className="details-row"><span>系统正常运行时间:</span> <span>3h 48m 22s</span></div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. 命令终端子应用 (TerminalApp)
   ========================================================================== */
type TerminalLine = {
  text: string;
  type: "input" | "output" | "error" | "system";
};

type TerminalAppProps = {
  isAdmin: boolean;
  userEmail: string;
};

function TerminalApp({ isAdmin, userEmail }: TerminalAppProps) {
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: "Welcome to Zhiyinx OS command center. Type 'help' for options.", type: "system" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newLines: TerminalLine[] = [
      { text: `$ ${trimmed}`, type: "input" }
    ];

    const args = trimmed.split(/\s+/);
    const primary = args[0].toLowerCase();

    switch (primary) {
      case "help":
        newLines.push({
          text: `可用指令列表:\n  help        - 显示此帮助信息\n  clear       - 清空屏幕缓存\n  neofetch    - 显示系统及节点配置摘要\n  whoami      - 打印当前登录账号\n  uptime      - 获取边缘节点运行时间\n  joke        - 讲个笑话\n  date        - 获取当前系统时间`,
          type: "output"
        });
        break;
      case "clear":
        setHistory([]);
        return;
      case "whoami":
        newLines.push({ text: `登录账号: ${userEmail}\n用户组: ${isAdmin ? "admin" : "user"}`, type: "output" });
        break;
      case "date":
        newLines.push({ text: new Date().toString(), type: "output" });
        break;
      case "uptime":
        newLines.push({ text: "系统运行时间: 3小时 48分钟 25秒 (Cloudflare Pages Worker)", type: "output" });
        break;
      case "joke":
        const jokes = [
          "问：为什么程序员戴眼镜？ 答：因为他们看不清 C++。",
          "写代码十小时，修 Bug 两天，程序员的一天就是这么充实而欣慰。",
          "世界上有 10 种人，一种懂二进制，另一种不懂。"
        ];
        newLines.push({ text: jokes[Math.floor(Math.random() * jokes.length)], type: "output" });
        break;
      case "neofetch":
        newLines.push({
          text: `
    .ssssssssssssssssssss.       zhiyinx@zhiyinx.xyz
  .sSSSSSSSSSSSSSSSSSSSSs.       -------------------
  sSSs'              'sSSs       OS: Zhiyinx Cloud OS v1.2
  sSSs    ⚡⚡⚡⚡     sSSs       Kernel: React Client-Shell
  sSSs    ⚡⚡⚡⚡     sSSs       Uptime: 3h 48m
  sSSs'              'sSSs       Vite Mode: production-preview
  'sSSSSSSSSSSSSSSSSSSSSs'       Memory: 430MB / 1024MB (D1 Engine)
    'ssssssssssssssssssss'       HostNode: Cloudflare Edge Worker
`,
          type: "output"
        });
        break;
      default:
        newLines.push({ text: `指令未找到: '${primary}'。请输入 'help' 获得提示。`, type: "error" });
    }

    setHistory((prev) => [...prev, ...newLines]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="app-terminal">
      <div className="terminal-body" ref={bodyRef}>
        {history.map((line, idx) => (
          <pre key={idx} className={`terminal-line line-${line.type}`}>
            {line.text}
          </pre>
        ))}
      </div>
      <div className="terminal-input-row">
        <span className="terminal-prompt">$</span>
        <input
          type="text"
          className="terminal-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    </div>
  );
}

/* ==========================================================================
   5. 云记事本子应用 (NotepadApp)
   ========================================================================== */
function NotepadApp() {
  const [content, setContent] = useState(() => {
    return localStorage.getItem("zhiyinx_notepad_content") || "📝 云记事本\n--------------\n\n您可以在此输入任意备忘录或剪贴板文本，它会即时自动保存到浏览器本地缓存中。\n即使在刷新或下次登录后，内容也不会丢失。\n\n[待办清单]\n- [ ] 优化 WebOS 桌面的毛玻璃渲染性能\n- [ ] 与后端集成实现云数据库存储";
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    localStorage.setItem("zhiyinx_notepad_content", val);
  };

  return (
    <div className="app-notepad">
      <textarea
        className="notepad-textarea"
        value={content}
        onChange={handleTextChange}
        placeholder="写点什么吧..."
      ></textarea>
    </div>
  );
}
