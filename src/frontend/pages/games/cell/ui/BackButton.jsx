import { playUi } from "../audio";

/**
 * 关卡画布内叠加的返回选关按钮
 * @param {{ onClick: () => void, title?: string }} props
 */
export default function BackButton({ onClick, title = "返回选关" }) {
  return (
    <button
      type="button"
      className="cell-back"
      onClick={() => {
        playUi("back");
        onClick?.();
      }}
      title={title}
      aria-label={title}
    >
      <svg
        className="cell-back__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden
      >
        <path
          d="M14.5 5.5L8 12l6.5 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 12h9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
