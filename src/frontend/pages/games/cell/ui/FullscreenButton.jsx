import { useCallback, useEffect, useState } from "react";

/**
 * @param {HTMLElement | null} el
 */
function getFsElement() {
  return (
    document.fullscreenElement ||
    /** @type {Document & { webkitFullscreenElement?: Element | null }} */ (document)
      .webkitFullscreenElement ||
    null
  );
}

/**
 * @param {HTMLElement} el
 */
async function requestFs(el) {
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  const webkit = /** @type {HTMLElement & { webkitRequestFullscreen?: () => void }} */ (el);
  if (webkit.webkitRequestFullscreen) {
    webkit.webkitRequestFullscreen();
  }
}

async function exitFs() {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  const doc = /** @type {Document & { webkitExitFullscreen?: () => void }} */ (document);
  if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen();
  }
}

/**
 * 关卡画布内：全屏切换（作用于游戏 stage）
 * @param {{ targetRef: React.RefObject<HTMLElement | null> }} props
 */
export default function FullscreenButton({ targetRef }) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const el = targetRef.current;
    const fs = getFsElement();
    setActive(!!el && fs === el);
  }, [targetRef]);

  useEffect(() => {
    const onChange = () => sync();
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [sync]);

  async function handleClick() {
    const el = targetRef.current;
    if (!el) return;
    try {
      if (getFsElement() === el) {
        await exitFs();
      } else {
        await requestFs(el);
      }
    } catch {
      // 用户拒绝或浏览器不支持时静默
    }
    sync();
  }

  return (
    <button
      type="button"
      className={`cell-fs-btn${active ? " cell-fs-btn--on" : ""}`}
      onClick={handleClick}
      title={active ? "退出全屏" : "全屏游戏"}
      aria-label={active ? "退出全屏" : "全屏游戏"}
      aria-pressed={active}
    >
      {active ? (
        /* 退出全屏：四角向内 */
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="cell-fs-btn__icon">
          <path
            d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        /* 进入全屏：四角向外 */
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="cell-fs-btn__icon">
          <path
            d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
