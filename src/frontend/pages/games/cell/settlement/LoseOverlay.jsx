/**
 * 失败遮罩
 * @param {{ onRestart: () => void }} props
 */
export default function LoseOverlay({ onRestart }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "20px",
        backdropFilter: "blur(8px)",
        background: "rgba(5, 7, 15, 0.72)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        animation: "fadeInUp 0.4s ease-out",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: "72px",
          lineHeight: "1",
          filter: "drop-shadow(0 0 20px rgba(217, 67, 67, 0.4))",
        }}
      >
        💀
      </div>
      <h1
        style={{
          fontSize: "36px",
          fontWeight: "800",
          color: "#d94343",
          fontFamily: "var(--font-title)",
          textShadow: "0 0 30px rgba(217, 67, 67, 0.3)",
          letterSpacing: "2px",
        }}
      >
        细胞湮灭
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "-8px" }}>
        你的细胞全部被吞噬了。别灰心，再试一次！
      </p>
      <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRestart}
          style={{
            padding: "12px 28px",
            borderRadius: "14px",
            fontSize: "14px",
            background: "linear-gradient(135deg, #d94343 0%, #b52b2b 100%)",
            boxShadow: "0 4px 20px rgba(217, 67, 67, 0.3)",
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
}
