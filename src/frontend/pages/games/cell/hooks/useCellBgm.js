import { useEffect } from "react";
import { setBgmScene, stopBgm } from "../audio";

/**
 * BGM 只跟 screen 走：play 内重开/下一关不重切；回 hub 换选关曲。
 * @param {boolean} gameStarted
 * @param {"hub" | "play"} screen
 */
export function useCellBgm(gameStarted, screen) {
  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, []);

  useEffect(() => {
    if (!gameStarted) return;
    setBgmScene(screen);
  }, [gameStarted, screen]);
}
