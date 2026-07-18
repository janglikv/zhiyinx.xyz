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

// ---------------------------------------------------------------------------
// 场景 BGM：不用 @pixi/sound（其 WebAudio 实例在 stop 后仍可能孤儿播放）。
// 改用原生 HTMLAudioElement：pause/currentTime 行为可预期，与「一场景一轨」一致。
// Chrome 实测：进关后 hub 的 AudioBufferSourceNode 未 stop，导致与 battle 叠播。
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @returns {HTMLAudioElement}
 */
function createBgmAudio(url) {
  const el = new Audio(url);
  el.preload = "auto";
  el.loop = true;
  el.volume = BGM_VOLUME;
  // 不挂到 DOM；play() 需在用户手势解锁后调用
  return el;
}

const bgmAudio = {
  hub: createBgmAudio(bgmUrl),
  play: createBgmAudio(gameBgmUrl),
};

// 射击等 SFX 仍走 pixi；失焦不自动停
sound.disableAutoPause = true;

/** @type {"hub" | "play" | null} */
let activeBgmScene = null;

function pauseBgmEl(el) {
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
}

function stopAllBgm() {
  pauseBgmEl(bgmAudio.hub);
  pauseBgmEl(bgmAudio.play);
}

/**
 * 设置当前场景 BGM。
 * 对战内重开 / 下一关 screen 仍是 "play" → 不重切，保持对战曲连续。
 * @param {"hub" | "play"} scene
 */
export function setBgmScene(scene) {
  if (scene !== "hub" && scene !== "play") return;

  const next = bgmAudio[scene];
  // 同场景且未暂停：不打断（对战曲逻辑）
  if (activeBgmScene === scene && next && !next.paused && !next.ended) {
    return;
  }

  // 先停干净两条轨，再只播目标
  stopAllBgm();
  activeBgmScene = scene;
  next.volume = BGM_VOLUME;
  const playPromise = next.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // 自动播放策略拦截时保持 scene 标记，下次手势/unlock 可再试
    });
  }
}

/** @deprecated 兼容旧名 */
export function playBgm(scene = "hub") {
  setBgmScene(scene);
}

/** @deprecated 转场不再淡出 BGM */
export function fadeOutBgm() {
  /* no-op */
}

/** @deprecated 等同 setBgmScene */
export function restartBgm(scene) {
  setBgmScene(scene);
}

/** 离开页面时停 BGM */
export function stopBgm() {
  stopAllBgm();
  activeBgmScene = null;
}

/**
 * 浏览器要求音频必须在玩家手势中解锁。
 */
export function unlockCellAudio() {
  sound.resumeAll();
  getAudioCtx();
  // 若已选定场景但被 autoplay 挡住，在手势里补一次 play
  if (activeBgmScene && bgmAudio[activeBgmScene]?.paused) {
    bgmAudio[activeBgmScene].play().catch(() => {});
  }
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

// ---------------------------------------------------------------------------
// 程序合成交互音效（Web Audio）：P0 hit / hurt / die / UI
// ---------------------------------------------------------------------------

/** @type {AudioContext | null} */
let audioCtx = null;
const SFX_MASTER = 1;
const lastSynthAt = {
  hit: -Infinity,
  hurt: -Infinity,
  die: -Infinity,
  ui: -Infinity,
  uiHover: -Infinity,
};
const HIT_GAP_MS = 42;
const HURT_GAP_MS = 70;
const DIE_GAP_MS = 90;
const UI_GAP_MS = 40;
const UI_HOVER_GAP_MS = 55;

function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * @param {number} x
 * @param {number} [width]
 */
function panFromX(x, width = GAME_WIDTH) {
  const w = width > 0 ? width : GAME_WIDTH;
  return Math.max(-0.75, Math.min(0.75, (x / w) * 1.5 - 0.75));
}

/**
 * @param {AudioContext} ctx
 * @param {number} pan
 * @param {number} when
 * @returns {AudioNode}
 */
function makePanner(ctx, pan, when) {
  if (typeof ctx.createStereoPanner === "function") {
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(pan, when);
    return p;
  }
  // 旧环境退回等功率 pan
  const g = ctx.createGain();
  return g;
}

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} node
 * @param {number} pan
 * @param {number} when
 */
function connectOut(ctx, node, pan, when) {
  const panner = makePanner(ctx, pan, when);
  const master = ctx.createGain();
  master.gain.setValueAtTime(SFX_MASTER, when);
  node.connect(panner);
  panner.connect(master);
  master.connect(ctx.destination);
  return master;
}

/**
 * 噪声缓冲（复用，避免每次分配）
 * @type {AudioBuffer | null}
 */
let noiseBuffer = null;

/** @param {AudioContext} ctx */
function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/**
 * 命中：短促高通噪声 + 轻脆 click
 * @param {{ x?: number, width?: number, strength?: number }} [opts]
 */
export function playHit(opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  if (nowMs - lastSynthAt.hit < HIT_GAP_MS) return;
  lastSynthAt.hit = nowMs;

  const t0 = ctx.currentTime;
  const strength = Math.max(0.35, Math.min(1.2, opts.strength ?? 0.7));
  const pan = panFromX(opts.x ?? GAME_WIDTH * 0.5, opts.width);
  const pitch = 1 + (Math.random() - 0.5) * 0.18;

  // 噪声爆
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1800 * pitch, t0);
  const ng = ctx.createGain();
  const peak = 0.55 * strength;
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055 + strength * 0.02);
  noise.connect(hp);
  hp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.09);

  // 金属感 click
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(920 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(280 * pitch, t0 + 0.05);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.32 * strength, t0 + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  osc.connect(og);
  connectOut(ctx, og, pan, t0);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}

/**
 * 己方受伤：偏低闷击
 * @param {{ x?: number, width?: number, strength?: number }} [opts]
 */
export function playHurt(opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  if (nowMs - lastSynthAt.hurt < HURT_GAP_MS) return;
  lastSynthAt.hurt = nowMs;

  const t0 = ctx.currentTime;
  const strength = Math.max(0.4, Math.min(1.3, opts.strength ?? 0.8));
  const pan = panFromX(opts.x ?? GAME_WIDTH * 0.5, opts.width);
  const pitch = 1 + (Math.random() - 0.5) * 0.12;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(90 * pitch, t0 + 0.12);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.7 * strength, t0 + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  osc.connect(og);
  connectOut(ctx, og, pan, t0);
  osc.start(t0);
  osc.stop(t0 + 0.18);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(700, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.45 * strength, t0 + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  noise.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.12);
}

/**
 * 细胞被吞噬/变色：短促「噗」碎裂感
 * @param {{ x?: number, width?: number }} [opts]
 */
export function playDie(opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  if (nowMs - lastSynthAt.die < DIE_GAP_MS) return;
  lastSynthAt.die = nowMs;

  const t0 = ctx.currentTime;
  const pan = panFromX(opts.x ?? GAME_WIDTH * 0.5, opts.width);
  const pitch = 1 + (Math.random() - 0.5) * 0.2;

  // 下降音
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(340 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(55 * pitch, t0 + 0.14);
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(1400, t0);
  filt.frequency.exponentialRampToValueAtTime(220, t0 + 0.14);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.55, t0 + 0.01);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
  osc.connect(filt);
  filt.connect(og);
  connectOut(ctx, og, pan, t0);
  osc.start(t0);
  osc.stop(t0 + 0.18);

  // 碎裂噪声
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1100 * pitch, t0);
  bp.Q.setValueAtTime(0.7, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.5, t0 + 0.006);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
  noise.connect(bp);
  bp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.13);
}

/**
 * UI 反馈
 * @param {"hover" | "tap" | "confirm" | "back"} [kind]
 */
export function playUi(kind = "tap") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  // hover 与点击分轨限流，避免滑过按钮后立刻点不响
  if (kind === "hover") {
    if (nowMs - lastSynthAt.uiHover < UI_HOVER_GAP_MS) return;
    lastSynthAt.uiHover = nowMs;
  } else {
    if (nowMs - lastSynthAt.ui < UI_GAP_MS) return;
    lastSynthAt.ui = nowMs;
  }

  const t0 = ctx.currentTime;
  /** @type {Record<string, { f0: number, f1: number, dur: number, vol: number, type: OscillatorType }>} */
  const presets = {
    hover: { f0: 920, f1: 1180, dur: 0.03, vol: 0.2, type: "sine" },
    tap: { f0: 720, f1: 540, dur: 0.045, vol: 0.35, type: "sine" },
    confirm: { f0: 520, f1: 780, dur: 0.07, vol: 0.42, type: "triangle" },
    back: { f0: 480, f1: 320, dur: 0.06, vol: 0.32, type: "sine" },
  };
  const p = presets[kind] || presets.tap;
  const pitch = 1 + (Math.random() - 0.5) * 0.04;

  const osc = ctx.createOscillator();
  osc.type = p.type;
  osc.frequency.setValueAtTime(p.f0 * pitch, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, p.f1 * pitch), t0 + p.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(p.vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);
  osc.connect(g);
  connectOut(ctx, g, 0, t0);
  osc.start(t0);
  osc.stop(t0 + p.dur + 0.02);

  // confirm 多一颗高音点缀
  if (kind === "confirm") {
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(1040 * pitch, t0 + 0.02);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t0 + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.25, t0 + 0.028);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    o2.connect(g2);
    connectOut(ctx, g2, 0, t0);
    o2.start(t0 + 0.02);
    o2.stop(t0 + 0.1);
  }
}

/**
 * 可交互控件：鼠标移入播 hover（禁用时静默）
 * @param {MouseEvent | { currentTarget?: HTMLElement | null }} [e]
 */
export function onUiHover(e) {
  const el = e?.currentTarget;
  if (el && "disabled" in el && el.disabled) return;
  playUi("hover");
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopBgm();
    CELL_SOUND_ALIASES.forEach((alias) => {
      if (sound.exists(alias)) sound.remove(alias);
    });
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
      noiseBuffer = null;
    }
  });
}
