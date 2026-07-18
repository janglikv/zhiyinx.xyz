import { uiSfx } from "../audio";

/**
 * 首屏开始门（用户手势解锁音频）
 * @param {{ onStart: () => void }} props
 */
export default function StartGate({ onStart }) {
  return (
    <div
      className="cell-scene"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background: "#07110d",
      }}
    >
      <button
        type="button"
        {...uiSfx("confirm", onStart)}
        aria-label="开始游戏"
        style={{
          width: 132,
          height: 132,
          borderRadius: "50%",
          border: "3px solid rgba(184, 255, 106, 0.85)",
          background: "rgba(84, 201, 43, 0.22)",
          color: "#d9ffb8",
          fontSize: 54,
          lineHeight: 1,
          cursor: "pointer",
          padding: "0 0 0 8px",
          boxShadow: "0 0 40px rgba(84, 201, 43, 0.35)",
        }}
      >
        ▶
      </button>
      <div
        style={{
          color: "rgba(217, 255, 184, 0.88)",
          fontSize: 20,
          letterSpacing: 3,
        }}
      >
        点击进入游戏
      </div>
    </div>
  );
}
