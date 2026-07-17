import { LEVELS } from "../levels";

/**
 * 顶部关卡说明 + 选关 + 调试
 * @param {{
 *   level: import("../levels").LevelDef,
 *   currentLevelIndex: number,
 *   onSelectLevel: (index: number) => void,
 *   onDebugWin: () => void,
 * }} props
 */
export default function LevelHeader({
  level,
  currentLevelIndex,
  onSelectLevel,
  onDebugWin,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "24px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-light)",
        borderRadius: "16px",
        padding: "16px 20px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ flex: "1" }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "600",
            background: "var(--gradient-text)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "8px",
            fontFamily: "var(--font-title)",
          }}
        >
          {level.name}
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "13px",
            lineHeight: "1.6",
            maxWidth: "520px",
          }}
        >
          {level.description}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          选择关卡
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {LEVELS.map((lvl, index) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => onSelectLevel(index)}
              className={`btn ${currentLevelIndex === index ? "btn-primary" : "btn-ghost"}`}
              style={{
                width: "36px",
                height: "36px",
                padding: "0",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {index + 1}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onDebugWin}
            title="调试：触发通关烟花"
            style={{
              marginLeft: "4px",
              height: "36px",
              padding: "0 10px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: "600",
              color: "rgba(255, 200, 80, 0.9)",
              border: "1px dashed rgba(255, 180, 60, 0.45)",
            }}
          >
            通关调试
          </button>
        </div>
      </div>
    </div>
  );
}
