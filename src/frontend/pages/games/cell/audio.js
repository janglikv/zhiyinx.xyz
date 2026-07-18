import { sound, filters } from "@pixi/sound";
import { COLOR_PLAYER, GAME_WIDTH } from "./constants";
import bulletSoundUrl from "./assets/shoot.mp3";
import fireworkSoundUrl from "./assets/firework.mp3";
import bgmUrl from "./assets/bgm.mp3";

const SHOT_GAP_SECONDS = 0.045;
let lastShotAt = -Infinity;

// 注册音频资源。@pixi/sound 会自动在后台异步加载
sound.add("bullet", bulletSoundUrl);
sound.add("firework", fireworkSoundUrl);
sound.add("bgm", bgmUrl);

// 设置当页面失去焦点时也继续播放音效，禁用自动暂停
sound.disableAutoPause = true;

/** @type {any} */
let bgmInstance = null;
let fadeIntervalId = null;

/**
 * 辅助函数：在指定时间内平滑渐变实例的音量
 * @param {any} instance @pixi/sound 播放实例
 * @param {number} startVol 起始音量
 * @param {number} endVol 目标音量
 * @param {number} duration 渐变时长（毫秒）
 * @param {Function} [onComplete] 渐变结束回调
 */
function fadeInstanceVolume(instance, startVol, endVol, duration, onComplete) {
  if (!instance) {
    if (onComplete) onComplete();
    return;
  }

  // 清除前一次可能的渐变定时器，防止重叠冲突
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }

  const startTime = Date.now();
  instance.volume = startVol;

  const timer = setInterval(() => {
    // 保护：如果实例已经不处于播放状态，且我们要调高音量（淡入），则直接清除以防浪费
    if (typeof instance.isPlaying === "boolean" && !instance.isPlaying && endVol > startVol) {
      clearInterval(timer);
      if (fadeIntervalId === timer) fadeIntervalId = null;
      return;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      clearInterval(timer);
      if (fadeIntervalId === timer) fadeIntervalId = null;
      instance.volume = endVol;
      if (onComplete) onComplete();
    } else {
      const progress = elapsed / duration;
      // 线性平滑插值 volume
      instance.volume = startVol + (endVol - startVol) * progress;
    }
  }, 16); // 约60FPS的高频更新

  fadeIntervalId = timer;
}

/**
 * 播放全局背景音乐 (BGM)，循环播放并防止重叠，支持淡入淡出切换
 * @param {boolean} [forceRestart=false] 是否强制从头重新播放（带淡出淡入过渡）
 */
export function playBgm(forceRestart = false) {
  const targetVolume = 0.35;

  if (forceRestart && bgmInstance) {
    const oldInstance = bgmInstance;
    // 1. 让旧的实例淡出到 0，时长 600ms
    fadeInstanceVolume(oldInstance, oldInstance.volume, 0, 600, () => {
      try {
        oldInstance.stop();
      } catch (e) {
        // 忽略
      }

      // 2. 旧实例淡出停掉后，启动新实例并淡入
      bgmInstance = sound.play("bgm", {
        volume: 0, // 从 0 开始淡入
        loop: true,
        singleInstance: true,
      });

      if (bgmInstance) {
        fadeInstanceVolume(bgmInstance, 0, targetVolume, 600);
      }
    });
    return;
  }

  // 正常首次播放，使用渐入从 0 升到 0.35
  if (!bgmInstance || !bgmInstance.isPlaying) {
    bgmInstance = sound.play("bgm", {
      volume: 0,
      loop: true,
      singleInstance: true,
    });
    if (bgmInstance) {
      fadeInstanceVolume(bgmInstance, 0, targetVolume, 600);
    }
  }
}

/**
 * 停止播放全局背景音乐
 */
export function stopBgm() {
  if (fadeIntervalId) {
    clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }
  sound.stop("bgm");
  bgmInstance = null;
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
