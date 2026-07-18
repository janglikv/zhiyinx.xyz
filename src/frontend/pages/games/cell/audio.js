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
/** BGM 基准音量（用户滑条 1.0 时的实际 HTMLAudio volume） */
const BGM_VOLUME_MAX = 0.35;
const AUDIO_SETTINGS_KEY = "cell-audio-settings-v1";
const HIT_VARIANT_KEY = "cell-hit-variant-v1";
const CELL_SOUND_ALIASES = ["bullet", "firework"];
const LEGACY_PIXI_ALIASES = ["bgm", "bgm-hub", "bgm-play"];

/**
 * 命中音效变体（偏「打中细胞」；`blast` 为旧爆炸对照）
 * @typedef {"gel"|"pop"|"squish"|"plop"|"thud"|"crack"|"splash"|"blast"} HitVariantId
 */

/** @type {{ id: HitVariantId, label: string, desc: string }[]} */
export const HIT_VARIANT_LIST = [
  { id: "gel", label: "凝胶", desc: "软弹胶质，有弹性回弹" },
  { id: "pop", label: "膜破", desc: "薄膜气泡「啵」一声" },
  { id: "squish", label: "湿黏", desc: "湿润挤压，偏有机" },
  { id: "plop", label: "水滴", desc: "液滴落体，清脆 plop" },
  { id: "thud", label: "闷击", desc: "软组织闷响，偏厚" },
  { id: "crack", label: "脆裂", desc: "细胞膜轻裂 + 短噪声" },
  { id: "splash", label: "溅射", desc: "能量溅开，略亮" },
  { id: "blast", label: "爆炸", desc: "小爆炸（旧版对照）" },
];

const HIT_VARIANT_IDS = new Set(HIT_VARIANT_LIST.map((v) => v.id));
/** @type {HitVariantId} */
const DEFAULT_HIT_VARIANT = "thud";

/** @returns {HitVariantId} */
function loadHitVariant() {
  if (typeof window === "undefined") return DEFAULT_HIT_VARIANT;
  try {
    const raw = window.localStorage.getItem(HIT_VARIANT_KEY);
    if (raw && HIT_VARIANT_IDS.has(/** @type {HitVariantId} */ (raw))) {
      return /** @type {HitVariantId} */ (raw);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_HIT_VARIANT;
}

/** @type {HitVariantId} */
let hitVariantId = loadHitVariant();

/** 当前对战使用的命中变体 id */
export function getHitVariant() {
  return hitVariantId;
}

/**
 * 选用命中变体（持久化）
 * @param {string} id
 * @returns {boolean}
 */
export function setHitVariant(id) {
  if (!HIT_VARIANT_IDS.has(/** @type {HitVariantId} */ (id))) return false;
  hitVariantId = /** @type {HitVariantId} */ (id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HIT_VARIANT_KEY, hitVariantId);
    } catch {
      /* ignore */
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// 音量 / 静音（localStorage 持久化）
// ---------------------------------------------------------------------------

/**
 * @param {number} n
 * @returns {number}
 */
function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * @returns {{ muted: boolean, bgm: number, sfx: number }}
 */
function loadAudioSettings() {
  // bgm=1 → 实际 HTMLAudio 为 BGM_VOLUME_MAX（与旧版固定音量一致）
  const defaults = { muted: false, bgm: 1, sfx: 1 };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw);
    return {
      muted: !!p.muted,
      bgm: clamp01(p.bgm ?? defaults.bgm),
      sfx: clamp01(p.sfx ?? defaults.sfx),
    };
  } catch {
    return defaults;
  }
}

/** @type {{ muted: boolean, bgm: number, sfx: number }} */
let audioSettings = loadAudioSettings();

function persistAudioSettings() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_KEY,
      JSON.stringify(audioSettings),
    );
  } catch {
    /* quota / private mode */
  }
}

/** 当前有效 BGM 音量（已含静音） */
function effectiveBgmVolume() {
  if (audioSettings.muted) return 0;
  return clamp01(audioSettings.bgm) * BGM_VOLUME_MAX;
}

/** 当前有效 SFX 倍率（已含静音） */
function sfxGain() {
  if (audioSettings.muted) return 0;
  return clamp01(audioSettings.sfx);
}

function applyBgmVolumes() {
  const v = effectiveBgmVolume();
  try {
    bgmAudio.hub.volume = v;
    bgmAudio.play.volume = v;
  } catch {
    /* ignore */
  }
}

/** 读取音量设置（拷贝） */
export function getAudioSettings() {
  return {
    muted: audioSettings.muted,
    bgm: audioSettings.bgm,
    sfx: audioSettings.sfx,
  };
}

/**
 * 总静音开关（音乐 + 音效）
 * @param {boolean} muted
 */
export function setAudioMuted(muted) {
  audioSettings.muted = !!muted;
  persistAudioSettings();
  applyBgmVolumes();
}

/**
 * 背景音乐音量 0–1
 * @param {number} value
 */
export function setBgmVolume(value) {
  audioSettings.bgm = clamp01(value);
  persistAudioSettings();
  applyBgmVolumes();
}

/**
 * 音效音量 0–1
 * @param {number} value
 */
export function setSfxVolume(value) {
  audioSettings.sfx = clamp01(value);
  persistAudioSettings();
}

/**
 * 批量更新（可选字段）
 * @param {{ muted?: boolean, bgm?: number, sfx?: number }} patch
 */
export function updateAudioSettings(patch = {}) {
  if (typeof patch.muted === "boolean") audioSettings.muted = patch.muted;
  if (patch.bgm != null) audioSettings.bgm = clamp01(patch.bgm);
  if (patch.sfx != null) audioSettings.sfx = clamp01(patch.sfx);
  persistAudioSettings();
  applyBgmVolumes();
}

// ---------------------------------------------------------------------------
// @pixi/sound：禁止顶层 import。
// 其 WebAudioContext 构造时会立刻 resume()，无用户手势时 Chrome 刷警告：
// "The AudioContext was not allowed to start..."
// 改为在 unlockCellAudio（点击手势）里动态 import 并注册。
// ---------------------------------------------------------------------------

/** @type {import("@pixi/sound").SoundLibrary | null} */
let pixiSound = null;
/** @type {typeof import("@pixi/sound").filters.StereoFilter | null} */
let StereoFilterCtor = null;
/** @type {Promise<import("@pixi/sound").SoundLibrary> | null} */
let pixiInitPromise = null;

function initPixiSound() {
  if (pixiInitPromise) return pixiInitPromise;
  pixiInitPromise = import("@pixi/sound").then(({ sound, filters }) => {
    pixiSound = sound;
    StereoFilterCtor = filters.StereoFilter;
    // Vite HMR / 重复 init：清旧 alias 再注册
    [...CELL_SOUND_ALIASES, ...LEGACY_PIXI_ALIASES].forEach((alias) => {
      if (sound.exists(alias)) sound.remove(alias);
    });
    sound.add("bullet", { url: bulletSoundUrl, preload: true });
    sound.add("firework", { url: fireworkSoundUrl, preload: true });
    sound.disableAutoPause = true;
    sound.resumeAll();
    return sound;
  });
  return pixiInitPromise;
}

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
  el.volume = effectiveBgmVolume();
  // 不挂到 DOM；play() 需在用户手势解锁后调用
  return el;
}

const bgmAudio = {
  hub: createBgmAudio(bgmUrl),
  play: createBgmAudio(gameBgmUrl),
};

// 设置已从 localStorage 加载；确保两轨初始音量一致
applyBgmVolumes();

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
  next.volume = effectiveBgmVolume();
  const playPromise = next.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      // 自动播放策略拦截时保持 scene 标记，下次手势/unlock 可再试
    });
  }
}

/** 离开页面时停 BGM */
export function stopBgm() {
  stopAllBgm();
  activeBgmScene = null;
}

/**
 * 浏览器要求音频必须在玩家手势中解锁。
 * 须在 click/touch 回调同步路径内调用，才能合法 resume AudioContext。
 */
export function unlockCellAudio() {
  // 仅在用户手势中加载 @pixi/sound，避免顶层构造 WebAudio 刷警告
  void initPixiSound();
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  // 若已选定场景但被 autoplay 挡住，在手势里补一次 play
  if (activeBgmScene && bgmAudio[activeBgmScene]?.paused) {
    bgmAudio[activeBgmScene].play().catch(() => {});
  }
}

/**
 * 手势内解锁并等待 @pixi/sound 就绪（调试试听 / 需保证媒体 SFX 首击可响）。
 * @returns {Promise<void>}
 */
export async function unlockCellAudioReady() {
  unlockCellAudio();
  try {
    await initPixiSound();
  } catch {
    /* ignore load failure */
  }
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

/**
 * 播放从媒体文件加载的子弹发射音效
 * @param {{ x: number, color: number }} options
 */
export function playBulletShot({ x, color }) {
  if (!pixiSound || !StereoFilterCtor) return;
  const gain = sfxGain();
  if (gain <= 0) return;
  const now = performance.now();
  const playerShot = color === COLOR_PLAYER;
  const channel = playerShot ? "player" : "enemy";
  const gap = playerShot ? PLAYER_SHOT_GAP_MS : ENEMY_SHOT_GAP_MS;
  // 两个阵营分别限流，避免敌方密集射击吞掉玩家操作反馈。
  if (now - lastShotAt[channel] < gap) return;
  lastShotAt[channel] = now;

  // 声道偏置定位 [-0.7, 0.7]
  const pan = Math.max(-0.7, Math.min(0.7, (x / GAME_WIDTH) * 1.4 - 0.7));

  pixiSound.play("bullet", {
    // 原素材只有约 0.11s～0.20s 有效，裁去前后静音以同步射击画面。
    start: 0.105,
    end: 0.23,
    volume: (playerShot ? 1 : 0.72) * gain,
    speed: playerShot ? 1.08 : 0.82,
    filters: [new StereoFilterCtor(pan)],
  });
}

/**
 * 播放单次烟花爆炸音效，支持根据爆炸位置做声道偏置
 * @param {{ x: number, width: number }} options
 */
export function playFirework({ x, width }) {
  if (!pixiSound || !StereoFilterCtor) return;
  const gain = sfxGain();
  if (gain <= 0) return;
  const pan = Math.max(-0.7, Math.min(0.7, (x / width) * 1.4 - 0.7));

  pixiSound.play("firework", {
    volume: 0.65 * gain,
    start: 0,
    filters: [new StereoFilterCtor(pan)],
  });
}

// ---------------------------------------------------------------------------
// 程序合成交互音效（Web Audio）：P0 hit / hurt / UI
// ---------------------------------------------------------------------------

/** @type {AudioContext | null} */
let audioCtx = null;
const SFX_MASTER = 1; // 合成音效基准，再乘 sfxGain()
const lastSynthAt = {
  hit: -Infinity,
  hurt: -Infinity,
  ui: -Infinity,
  uiHover: -Infinity,
};
const HIT_GAP_MS = 42;
const HURT_GAP_MS = 70;
const UI_GAP_MS = 40;
const UI_HOVER_GAP_MS = 55;

/**
 * 创建/获取 AudioContext。不在此处 resume：
 * 无用户手势时 resume 会触发 Chrome autoplay 警告。
 * 解锁请走 unlockCellAudio() 或 playUi 的点击路径。
 */
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

/**
 * @param {{ resume?: boolean }} [opts] resume=true 仅在已知用户手势栈内使用
 * @returns {AudioContext | null}
 */
function getPlayableAudioCtx(opts = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  if (ctx.state === "running") return ctx;
  if (opts.resume && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
    // resume 异步完成；手势栈内调度的节点通常仍可出声
    return ctx;
  }
  // suspended 且无手势：静默跳过，避免控制台警告
  return null;
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
  master.gain.setValueAtTime(SFX_MASTER * sfxGain(), when);
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
  const needSec = 0.35;
  if (
    noiseBuffer &&
    noiseBuffer.sampleRate === ctx.sampleRate &&
    noiseBuffer.duration >= needSec - 0.01
  ) {
    return noiseBuffer;
  }
  // 略加长，供爆炸噪声尾音使用
  const len = Math.floor(ctx.sampleRate * needSec);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitGel(ctx, t0, strength, pan, pitch) {
  // 软弹胶质：正弦下沉 + 轻回弹，少量闷噪声
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(340 * pitch, t0);
  o.frequency.exponentialRampToValueAtTime(95 * pitch, t0 + 0.055);
  o.frequency.exponentialRampToValueAtTime(140 * pitch, t0 + 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55 * strength, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  o.connect(g);
  connectOut(ctx, g, pan, t0);
  o.start(t0);
  o.stop(t0 + 0.16);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900 * pitch, t0);
  lp.frequency.exponentialRampToValueAtTime(220 * pitch, t0 + 0.09);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.28 * strength, t0 + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  noise.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.12);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitPop(ctx, t0, strength, pan, pitch) {
  // 薄膜气泡「啵」
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(720 * pitch, t0);
  o.frequency.exponentialRampToValueAtTime(180 * pitch, t0 + 0.045);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.48 * strength, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
  o.connect(g);
  connectOut(ctx, g, pan, t0);
  o.start(t0);
  o.stop(t0 + 0.08);

  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(980 * pitch, t0);
  o2.frequency.exponentialRampToValueAtTime(420 * pitch, t0 + 0.03);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(0.22 * strength, t0 + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  o2.connect(g2);
  connectOut(ctx, g2, pan, t0);
  o2.start(t0);
  o2.stop(t0 + 0.05);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1600 * pitch, t0);
  bp.Q.setValueAtTime(1.2, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.32 * strength, t0 + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  noise.connect(bp);
  bp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.06);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitSquish(ctx, t0, strength, pan, pitch) {
  // 湿黏挤压：带通噪声主体 + 低频闷音
  const boom = ctx.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(160 * pitch, t0);
  boom.frequency.exponentialRampToValueAtTime(48 * pitch, t0 + 0.12);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, t0);
  bg.gain.exponentialRampToValueAtTime(0.5 * strength, t0 + 0.008);
  bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  boom.connect(bg);
  connectOut(ctx, bg, pan, t0);
  boom.start(t0);
  boom.stop(t0 + 0.16);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(700 * pitch, t0);
  bp.frequency.exponentialRampToValueAtTime(220 * pitch, t0 + 0.14);
  bp.Q.setValueAtTime(0.7, t0);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.52 * strength, t0 + 0.01);
  ng.gain.linearRampToValueAtTime(0.22 * strength, t0 + 0.06);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  noise.connect(bp);
  bp.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.2);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitPlop(ctx, t0, strength, pan, pitch) {
  // 液滴 plop：经典下落音高
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(520 * pitch, t0);
  o.frequency.exponentialRampToValueAtTime(110 * pitch, t0 + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.58 * strength, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  o.connect(g);
  connectOut(ctx, g, pan, t0);
  o.start(t0);
  o.stop(t0 + 0.14);

  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.setValueAtTime(780 * pitch, t0 + 0.012);
  o2.frequency.exponentialRampToValueAtTime(200 * pitch, t0 + 0.07);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, t0 + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.2 * strength, t0 + 0.016);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
  o2.connect(g2);
  connectOut(ctx, g2, pan, t0);
  o2.start(t0 + 0.012);
  o2.stop(t0 + 0.09);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1200 * pitch, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.18 * strength, t0 + 0.003);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  noise.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.07);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitThud(ctx, t0, strength, pan, pitch) {
  // 软组织闷击
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(140 * pitch, t0);
  o.frequency.exponentialRampToValueAtTime(42 * pitch, t0 + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.68 * strength, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
  o.connect(g);
  connectOut(ctx, g, pan, t0);
  o.start(t0);
  o.stop(t0 + 0.17);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(480 * pitch, t0);
  lp.frequency.exponentialRampToValueAtTime(120 * pitch, t0 + 0.1);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.4 * strength, t0 + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  noise.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.13);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitCrack(ctx, t0, strength, pan, pitch) {
  // 膜脆裂：短 snap + 细噪声
  const snap = ctx.createOscillator();
  snap.type = "square";
  snap.frequency.setValueAtTime(1100 * pitch, t0);
  snap.frequency.exponentialRampToValueAtTime(260 * pitch, t0 + 0.025);
  const sf = ctx.createBiquadFilter();
  sf.type = "bandpass";
  sf.frequency.setValueAtTime(1400 * pitch, t0);
  sf.Q.setValueAtTime(1.4, t0);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t0);
  sg.gain.exponentialRampToValueAtTime(0.28 * strength, t0 + 0.0015);
  sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);
  snap.connect(sf);
  sf.connect(sg);
  connectOut(ctx, sg, pan, t0);
  snap.start(t0);
  snap.stop(t0 + 0.04);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(280 * pitch, t0);
  body.frequency.exponentialRampToValueAtTime(70 * pitch, t0 + 0.07);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, t0);
  bg.gain.exponentialRampToValueAtTime(0.42 * strength, t0 + 0.004);
  bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  body.connect(bg);
  connectOut(ctx, bg, pan, t0);
  body.start(t0);
  body.stop(t0 + 0.1);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(1200 * pitch, t0);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.3 * strength, t0 + 0.002);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
  noise.connect(hp);
  hp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.07);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitSplash(ctx, t0, strength, pan, pitch) {
  // 能量溅射：较亮带通噪声扫频 + 轻体量
  const boom = ctx.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(200 * pitch, t0);
  boom.frequency.exponentialRampToValueAtTime(60 * pitch, t0 + 0.08);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.0001, t0);
  bg.gain.exponentialRampToValueAtTime(0.4 * strength, t0 + 0.005);
  bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  boom.connect(bg);
  connectOut(ctx, bg, pan, t0);
  boom.start(t0);
  boom.stop(t0 + 0.11);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.setValueAtTime(0.85, t0);
  bp.frequency.setValueAtTime(2400 * pitch, t0);
  bp.frequency.exponentialRampToValueAtTime(480 * pitch, t0 + 0.12);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.48 * strength, t0 + 0.004);
  ng.gain.exponentialRampToValueAtTime(0.12 * strength, t0 + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  noise.connect(bp);
  bp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + 0.15);
}

/**
 * @param {AudioContext} ctx
 * @param {number} t0
 * @param {number} strength
 * @param {number} pan
 * @param {number} pitch
 */
function synthHitBlast(ctx, t0, strength, pan, pitch) {
  // 旧版小爆炸（对照）
  const bodyDur = 0.1 + strength * 0.06;
  const tailDur = 0.14 + strength * 0.08;

  const boom = ctx.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(118 * pitch, t0);
  boom.frequency.exponentialRampToValueAtTime(38 * pitch, t0 + bodyDur * 0.85);
  const boomG = ctx.createGain();
  boomG.gain.setValueAtTime(0.0001, t0);
  boomG.gain.exponentialRampToValueAtTime(0.72 * strength, t0 + 0.006);
  boomG.gain.exponentialRampToValueAtTime(0.0001, t0 + bodyDur);
  boom.connect(boomG);
  connectOut(ctx, boomG, pan, t0);
  boom.start(t0);
  boom.stop(t0 + bodyDur + 0.02);

  const mid = ctx.createOscillator();
  mid.type = "triangle";
  mid.frequency.setValueAtTime(220 * pitch, t0);
  mid.frequency.exponentialRampToValueAtTime(55 * pitch, t0 + 0.08);
  const midG = ctx.createGain();
  midG.gain.setValueAtTime(0.0001, t0);
  midG.gain.exponentialRampToValueAtTime(0.38 * strength, t0 + 0.004);
  midG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  mid.connect(midG);
  connectOut(ctx, midG, pan, t0);
  mid.start(t0);
  mid.stop(t0 + 0.12);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.setValueAtTime(0.55, t0);
  bp.frequency.setValueAtTime(1400 * pitch, t0);
  bp.frequency.exponentialRampToValueAtTime(280 * pitch, t0 + tailDur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(5200 * pitch, t0);
  lp.frequency.exponentialRampToValueAtTime(420 * pitch, t0 + tailDur * 0.9);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.exponentialRampToValueAtTime(0.62 * strength, t0 + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.18 * strength, t0 + 0.04);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + tailDur);
  noise.connect(bp);
  bp.connect(lp);
  lp.connect(ng);
  connectOut(ctx, ng, pan, t0);
  noise.start(t0);
  noise.stop(t0 + tailDur + 0.02);

  const snap = ctx.createOscillator();
  snap.type = "square";
  snap.frequency.setValueAtTime(980 * pitch, t0);
  snap.frequency.exponentialRampToValueAtTime(160 * pitch, t0 + 0.028);
  const snapF = ctx.createBiquadFilter();
  snapF.type = "highpass";
  snapF.frequency.setValueAtTime(400, t0);
  const snapG = ctx.createGain();
  snapG.gain.setValueAtTime(0.0001, t0);
  snapG.gain.exponentialRampToValueAtTime(0.22 * strength, t0 + 0.002);
  snapG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
  snap.connect(snapF);
  snapF.connect(snapG);
  connectOut(ctx, snapG, pan, t0);
  snap.start(t0);
  snap.stop(t0 + 0.04);
}

/** @type {Record<HitVariantId, (ctx: AudioContext, t0: number, strength: number, pan: number, pitch: number) => void>} */
const HIT_SYNTHS = {
  gel: synthHitGel,
  pop: synthHitPop,
  squish: synthHitSquish,
  plop: synthHitPlop,
  thud: synthHitThud,
  crack: synthHitCrack,
  splash: synthHitSplash,
  blast: synthHitBlast,
};

/**
 * 命中音效（按当前选用的变体合成；可临时指定 variant 试听）
 * @param {{
 *   x?: number,
 *   width?: number,
 *   strength?: number,
 *   variant?: HitVariantId | string,
 *   force?: boolean,
 * }} [opts]
 */
export function playHit(opts = {}) {
  if (sfxGain() <= 0) return;
  const ctx = getPlayableAudioCtx();
  if (!ctx) return;
  const nowMs = performance.now();
  if (!opts.force && nowMs - lastSynthAt.hit < HIT_GAP_MS) return;
  lastSynthAt.hit = nowMs;

  const t0 = ctx.currentTime;
  const strength = Math.max(0.35, Math.min(1.25, opts.strength ?? 0.75));
  const pan = panFromX(opts.x ?? GAME_WIDTH * 0.5, opts.width);
  const pitch = 1 + (Math.random() - 0.5) * 0.14;
  const id =
    opts.variant && HIT_VARIANT_IDS.has(/** @type {HitVariantId} */ (opts.variant))
      ? /** @type {HitVariantId} */ (opts.variant)
      : hitVariantId;
  const synth = HIT_SYNTHS[id] || HIT_SYNTHS[DEFAULT_HIT_VARIANT];
  synth(ctx, t0, strength, pan, pitch);
}

/**
 * 己方受伤：偏低闷击
 * @param {{ x?: number, width?: number, strength?: number }} [opts]
 */
export function playHurt(opts = {}) {
  if (sfxGain() <= 0) return;
  const ctx = getPlayableAudioCtx();
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

/** @type {Record<string, { f0: number, f1: number, dur: number, vol: number, type: OscillatorType }>} */
const UI_PRESETS = {
  hover: { f0: 920, f1: 1180, dur: 0.03, vol: 0.2, type: "sine" },
  tap: { f0: 720, f1: 540, dur: 0.045, vol: 0.35, type: "sine" },
  confirm: { f0: 520, f1: 780, dur: 0.07, vol: 0.42, type: "triangle" },
  back: { f0: 480, f1: 320, dur: 0.06, vol: 0.32, type: "sine" },
};

/**
 * UI 反馈
 * @param {"hover" | "tap" | "confirm" | "back"} [kind]
 */
export function playUi(kind = "tap") {
  if (sfxGain() <= 0) return;
  // hover 非用户激活手势，禁止 resume；点击可 resume
  const ctx =
    kind === "hover"
      ? getPlayableAudioCtx()
      : getPlayableAudioCtx({ resume: true });
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
  const p = UI_PRESETS[kind] || UI_PRESETS.tap;
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

/**
 * 按钮音效 props：hover + 点击（禁用时静默）
 * @param {"tap" | "confirm" | "back"} [clickKind]
 * @param {(e?: MouseEvent) => void} [onClick]
 * @returns {{ onMouseEnter: typeof onUiHover, onClick: (e: MouseEvent) => void }}
 */
export function uiSfx(clickKind = "tap", onClick) {
  return {
    onMouseEnter: onUiHover,
    onClick: (e) => {
      const el = e?.currentTarget;
      if (el && "disabled" in el && el.disabled) return;
      // 先解锁（含懒加载 pixi），再播点击音，保证首击也在手势栈内
      unlockCellAudio();
      playUi(clickKind);
      onClick?.(e);
    },
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopBgm();
    if (pixiSound) {
      CELL_SOUND_ALIASES.forEach((alias) => {
        if (pixiSound.exists(alias)) pixiSound.remove(alias);
      });
    }
    pixiSound = null;
    StereoFilterCtor = null;
    pixiInitPromise = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
      noiseBuffer = null;
    }
  });
}
