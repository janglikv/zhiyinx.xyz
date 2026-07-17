import { BACKGROUNDS } from "../background";

/**
 * 底部图例 + 背景切换
 * @param {{ bgMode: string, onSwitchBackground: (mode: string) => void }} props
 */
export default function GameFooter({ bgMode, onSwitchBackground }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "12px 20px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}
      >
        <div>🟢 己方</div>
        <div>🔴 敌方</div>
        <div>⚫ 中立</div>
        <div style={{ width: "1px", height: "12px", background: "var(--border-light)" }} />
        <div>拖拽连线发射 · 滑动切断射流</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "12px", marginRight: "4px" }}>
          培养基环境
        </span>
        {BACKGROUNDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={bgMode === item.id ? "btn btn-primary btn-active" : "btn btn-ghost"}
            onClick={() => onSwitchBackground(item.id)}
            style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "10px" }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
