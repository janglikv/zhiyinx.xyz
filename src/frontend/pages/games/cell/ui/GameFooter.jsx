/** 底部图例 */
export default function GameFooter() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
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
    </div>
  );
}
