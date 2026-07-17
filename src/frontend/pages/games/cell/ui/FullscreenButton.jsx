import { useCallback, useEffect, useState } from "react";

const IMMERSIVE_CLASS = "cell-stage--immersive";
const BODY_CLASS = "cell-fs-active";

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

/** 当前环境是否支持对普通元素请求全屏（iOS Safari 基本不支持 div） */
function canNativeFullscreen() {
  if (typeof document === "undefined") return false;
  const el = document.documentElement;
  return !!(
    el.requestFullscreen ||
    /** @type {HTMLElement & { webkitRequestFullscreen?: Function }} */ (el).webkitRequestFullscreen ||
    /** @type {HTMLElement & { webkitRequestFullScreen?: Function }} */ (el).webkitRequestFullScreen
  );
}

/**
 * @param {HTMLElement} el
 * @returns {Promise<boolean>} 是否成功进入原生全屏
 */
async function requestFs(el) {
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return getFsElement() === el;
    }
    const webkit = /** @type {HTMLElement & {
      webkitRequestFullscreen?: () => void;
      webkitRequestFullScreen?: () => void;
    }} */ (el);
    if (webkit.webkitRequestFullscreen) {
      webkit.webkitRequestFullscreen();
      return getFsElement() === el;
    }
    if (webkit.webkitRequestFullScreen) {
      webkit.webkitRequestFullScreen();
      return getFsElement() === el;
    }
  } catch {
    // 用户拒绝或环境不支持
  }
  return false;
}

async function exitFs() {
  try {
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const doc = /** @type {Document & { webkitExitFullscreen?: () => void }} */ (document);
    if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      doc.webkitExitFullscreen();
    }
  } catch {
    // 静默
  }
}

/**
 * @param {HTMLElement} el
 * @param {boolean} on
 */
function setImmersive(el, on) {
  el.classList.toggle(IMMERSIVE_CLASS, on);
  document.body.classList.toggle(BODY_CLASS, on);
  // 尽量把页面滚到可视区，减少地址栏遮挡
  if (on) {
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  }
}

/**
 * 关卡画布内：全屏切换（原生 Fullscreen API + iOS/不支持时的沉浸伪全屏）
 * @param {{ targetRef: React.RefObject<HTMLElement | null> }} props
 */
export default function FullscreenButton({ targetRef }) {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const el = targetRef.current;
    if (!el) {
      setActive(false);
      return;
    }
    const native = getFsElement() === el;
    const immersive = el.classList.contains(IMMERSIVE_CLASS);
    setActive(native || immersive);
    // 原生退出时清掉 body 锁
    if (!native && !immersive) {
      document.body.classList.remove(BODY_CLASS);
    }
  }, [targetRef]);

  useEffect(() => {
    const onChange = () => sync();
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);

    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const el = targetRef.current;
      if (!el?.classList.contains(IMMERSIVE_CLASS)) return;
      setImmersive(el, false);
      sync();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
      // 卸载时退出伪全屏，避免 body 锁残留
      const el = targetRef.current;
      if (el?.classList.contains(IMMERSIVE_CLASS)) {
        setImmersive(el, false);
      }
      document.body.classList.remove(BODY_CLASS);
    };
  }, [sync, targetRef]);

  async function handleClick() {
    const el = targetRef.current;
    if (!el) return;

    const nativeOn = getFsElement() === el;
    const immersiveOn = el.classList.contains(IMMERSIVE_CLASS);

    try {
      if (nativeOn) {
        await exitFs();
      } else if (immersiveOn) {
        setImmersive(el, false);
      } else {
        // 优先原生；失败或明显不可用则走伪全屏（iOS 等）
        let ok = false;
        if (canNativeFullscreen()) {
          ok = await requestFs(el);
        }
        if (!ok) {
          setImmersive(el, true);
        }
      }
    } catch {
      // 兜底伪全屏
      if (!el.classList.contains(IMMERSIVE_CLASS) && getFsElement() !== el) {
        setImmersive(el, true);
      }
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
