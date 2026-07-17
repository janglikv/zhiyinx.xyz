import { sound, filters } from "@pixi/sound";
import { COLOR_PLAYER, GAME_WIDTH } from "./constants";
import bulletSoundUrl from "./assets/shoot.mp3";

const SHOT_GAP_SECONDS = 0.045;
let lastShotAt = -Infinity;

// 注册子弹音频资源。@pixi/sound 会自动在后台异步加载
sound.add("bullet", bulletSoundUrl);

// 设置当页面失去焦点时也继续播放音效，禁用自动暂停
sound.disableAutoPause = true;

/**
 * 浏览器要求音频必须在玩家手势中解锁。
 * @pixi/sound 会自动处理用户交互解锁，但显式调用 resume 更加保险。
 */
export function unlockCellAudio() {
  sound.resumeAll();
}

/**
 * 播放从媒体文件加载的子弹发射音效
 * @param {{ x: number, color: number }} options
 */
export function playBulletShot({ x, color }) {
  const now = Date.now();
  if ((now - lastShotAt) / 1000 < SHOT_GAP_SECONDS) return;
  lastShotAt = now;

  const playerShot = color === COLOR_PLAYER;
  // 声道偏置定位 [-0.7, 0.7]
  const pan = Math.max(-0.7, Math.min(0.7, (x / GAME_WIDTH) * 1.4 - 0.7));

  sound.play("bullet", {
    volume: 0.9,
    speed: playerShot ? 1.05 : 0.85,
    filters: [new filters.StereoFilter(pan)],
  });
}
