import { useEffect } from "react";
import { setBgmScene, stopBgm } from "../audio";

/**
 * BGM 跟场景与对局会话走：
 * - hub：选关曲
 * - play：对战曲；换关 / 重开时强制从头播放（不接续上一关进度）
 *
 * @param {boolean} gameStarted
 * @param {"hub" | "play"} screen
 * @param {string | number} [playSessionKey] 对局会话键（关卡下标 + gameKey），变化即重置对战 BGM
 */
export function useCellBgm(gameStarted, screen, playSessionKey = 0) {
  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, []);

  useEffect(() => {
    if (!gameStarted) return;
    if (screen === "play") {
      setBgmScene("play", { restart: true });
    } else {
      setBgmScene("hub", { restart: true });
    }
  }, [gameStarted, screen, playSessionKey]);
}
