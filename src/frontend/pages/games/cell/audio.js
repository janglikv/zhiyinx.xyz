import { sound, filters } from "@pixi/sound";
import { COLOR_PLAYER, GAME_WIDTH } from "./constants";
import bulletSoundUrl from "./assets/shoot.mp3";
import fireworkSoundUrl from "./assets/firework.mp3";
import bgmUrl from "./assets/hub-bgm.mp3";
import gameBgmUrl from "./assets/battle-bgm.mp3";

const PLAYER_SHOT_GAP_MS = 55;
const ENEMY_SHOT_GAP_MS = 75;
const lastShotAt = {
  player: -Infinity,
  enemy: -Infinity,
};
const BGM_VOLUME = 0.35;
const CELL_SOUND_ALIASES = ["bullet", "firework", "bgm", "bgm-hub", "bgm-play"];

// 提前加载资源，减少首次播放时的等待。
// Vite 热更新会保留 sound 全局单例，先销毁旧注册，避免遗留音轨叠加。
CELL_SOUND_ALIASES.forEach((alias) => {
  if (sound.exists(alias)) sound.remove(alias);
});
sound.add("bullet", { url: bulletSoundUrl, preload: true });
sound.add("firework", { url: fireworkSoundUrl, preload: true });
function addBgmTrack(alias, url) {
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const track = sound.add(alias, {
    url,
    preload: true,
    singleInstance: true,
    loaded: () => resolveReady(),
  });
  return { track, ready };
}

const bgmTracks = {
  hub: addBgmTrack("bgm-hub", bgmUrl),
  play: addBgmTrack("bgm-play", gameBgmUrl),
};

// 游戏失焦时仍保持音乐和音效播放。
sound.disableAutoPause = true;

let fadeIntervalId = null;
let bgmCommandId = 0;
let currentBgm = bgmTracks.hub;

/**
 * 辅助函数：在指定时间内平滑渐变实例的音量
 * @param {number} targetVolume 目标音量
 * @param {number} duration 渐变时长（毫秒）
 */
function fadeBgmTo(targetVolume, duration) {
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }

  const startTime = Date.now();
  const track = currentBgm.track;
  const startVolume = track.volume;

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      clearInterval(timer);
      if (fadeIntervalId === timer) fadeIntervalId = null;
      track.volume = targetVolume;
    } else {
      const progress = elapsed / duration;
      track.volume = startVolume + (targetVolume - startVolume) * progress;
    }
  }, 16);

  fadeIntervalId = timer;
}

/**
 * 播放当前场景背景音乐。
 */
export async function playBgm(fadeDuration = 600) {
  if (currentBgm.track.isPlaying) return;
  const commandId = ++bgmCommandId;
  await currentBgm.ready;
  if (commandId !== bgmCommandId) return;

  currentBgm.track.volume = 0;
  currentBgm.track.play({ loop: true });
  fadeBgmTo(BGM_VOLUME, fadeDuration);
}

/**
 * 跟随场景变暗阶段淡出音乐。
 */
export function fadeOutBgm(duration = 1000) {
  bgmCommandId += 1;
  if (!currentBgm.track.isPlaying) return;
  fadeBgmTo(0, duration);
}

/**
 * 跟随新场景揭开阶段，从头播放并淡入音乐。
 * @param {"hub" | "play"} scene
 * @param {number} duration
 */
export async function restartBgm(scene, duration = 1000) {
  const commandId = ++bgmCommandId;
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }
  const nextBgm = bgmTracks[scene];
  await nextBgm.ready;
  if (commandId !== bgmCommandId) return;

  // 黑幕期间清空所有播放实例，确保旧场景音乐和残留音效不会跨场景。
  sound.stopAll();
  currentBgm = nextBgm;
  currentBgm.track.volume = 0;
  currentBgm.track.play({ loop: true });
  fadeBgmTo(BGM_VOLUME, duration);
}

/**
 * 停止播放全局背景音乐
 */
export function stopBgm() {
  bgmCommandId += 1;
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }
  sound.stopAll();
}

/**
 * 浏览器要求音频必须在玩家手势中解锁。
 * @pixi/sound 会自动处理用户交互解锁，但显式调用 resume 更加保险。
 */
export function unlockCellAudio() {
  sound.resumeAll();
  playBgm();
}

/**
 * 播放从媒体文件加载的子弹发射音效
 * @param {{ x: number, color: number }} options
 */
export function playBulletShot({ x, color }) {
  const now = Date.now();
  const playerShot = color === COLOR_PLAYER;
  const channel = playerShot ? "player" : "enemy";
  const gap = playerShot ? PLAYER_SHOT_GAP_MS : ENEMY_SHOT_GAP_MS;
  // 两个阵营分别限流，避免敌方密集射击吞掉玩家操作反馈。
  if (now - lastShotAt[channel] < gap) return;
  lastShotAt[channel] = now;

  // 声道偏置定位 [-0.7, 0.7]
  const pan = Math.max(-0.7, Math.min(0.7, (x / GAME_WIDTH) * 1.4 - 0.7));

  sound.play("bullet", {
    // 原素材只有约 0.11s～0.20s 有效，裁去前后静音以同步射击画面。
    start: 0.105,
    end: 0.23,
    volume: playerShot ? 1 : 0.72,
    speed: playerShot ? 1.08 : 0.82,
    filters: [new filters.StereoFilter(pan)],
  });
}

/**
 * 播放单次烟花爆炸音效，支持根据爆炸位置做声道偏置
 * @param {{ x: number, width: number }} options
 */
export function playFirework({ x, width }) {
  const pan = Math.max(-0.7, Math.min(0.7, (x / width) * 1.4 - 0.7));

  sound.play("firework", {
    volume: 0.65,
    start: 0,
    filters: [new filters.StereoFilter(pan)],
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopBgm();
    CELL_SOUND_ALIASES.forEach((alias) => {
      if (sound.exists(alias)) sound.remove(alias);
    });
  });
}
