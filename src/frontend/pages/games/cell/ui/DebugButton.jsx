import { uiSfx } from "../audio";

/**
 * 开发调试入口按钮（仅 DEV 挂载）
 * @param {{ onClick: () => void }} props
 */
export default function DebugButton({ onClick }) {
  return (
    <button
      type="button"
      className="cell-fs-btn cell-debug-btn"
      {...uiSfx("tap", () => onClick?.())}
      title="开发调试"
      aria-label="开发调试"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="cell-debug-btn__icon"
      >
        {/* bug：身体 + 触角 + 足 */}
        <rect x="8" y="9" width="8" height="10" rx="4" />
        <path d="M12 9V6" />
        <path d="M9.5 5.5 8 4" />
        <path d="M14.5 5.5 16 4" />
        <path d="M8 13H5" />
        <path d="M19 13h-3" />
        <path d="M8.5 17.5 6 19" />
        <path d="M15.5 17.5 18 19" />
        <path d="M8.5 10.5 6 9" />
        <path d="M15.5 10.5 18 9" />
        <path d="M10 13h4" />
      </svg>
    </button>
  );
}
