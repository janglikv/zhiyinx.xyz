import * as PIXI from "pixi.js";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";
import backgroundScene from "./backgrounds/scene.png";
import backgroundDish from "./backgrounds/dish.png";
import backgroundDna from "./backgrounds/dna.png";
import backgroundMicrobes from "./backgrounds/microbes.jpg";

export const BACKGROUNDS = [
  { id: "scene", label: "场景", src: backgroundScene },
  { id: "dish", label: "培养皿", src: backgroundDish },
  { id: "dna", label: "DNA", src: backgroundDna },
  { id: "microbes", label: "微生物", src: backgroundMicrobes },
  { id: "black", label: "纯黑", src: null },
];

/** @typedef {typeof BACKGROUNDS[number]['id']} BackgroundMode */

const BG_STORAGE_KEY = "cell-game-background";

/**
 * @param {unknown} value
 * @returns {value is BackgroundMode}
 */
export function isBackgroundMode(value) {
  return BACKGROUNDS.some((item) => item.id === value);
}

/** @returns {BackgroundMode} */
export function loadBackgroundMode() {
  try {
    const saved = localStorage.getItem(BG_STORAGE_KEY);
    if (isBackgroundMode(saved)) return /** @type {BackgroundMode} */ (saved);
  } catch (e) {
    // private mode / 禁用存储时忽略
  }
  return "scene";
}

/** @param {BackgroundMode} mode */
export function saveBackgroundMode(mode) {
  try {
    localStorage.setItem(BG_STORAGE_KEY, mode);
  } catch (e) {
    // private mode / 禁用存储时忽略
  }
}

/**
 * @param {PIXI.Sprite} sprite
 * @param {PIXI.Texture} texture
 */
export function fitBackgroundSprite(sprite, texture) {
  const scale = Math.max(
    GAME_WIDTH / texture.width,
    GAME_HEIGHT / texture.height,
  );
  sprite.texture = texture;
  sprite.anchor.set(0.5);
  sprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  sprite.scale.set(scale);
}

/**
 * 加载全部背景贴图。
 * @returns {Promise<Record<string, PIXI.Texture>>}
 */
export async function loadBackgroundTextures() {
  const imageEntries = BACKGROUNDS.filter((item) => item.src);
  const textures = await Promise.all(
    imageEntries.map((item) => PIXI.Assets.load(item.src)),
  );
  /** @type {Record<string, PIXI.Texture>} */
  const textureById = {};
  imageEntries.forEach((item, index) => {
    textureById[item.id] = textures[index];
  });
  return textureById;
}

/**
 * 创建舞台背景精灵与切换 API。
 * @param {PIXI.Application} app
 * @param {Record<string, PIXI.Texture>} textureById
 * @param {() => BackgroundMode} [getDesiredBgMode]
 */
export function createBackgroundController(app, textureById, getDesiredBgMode) {
  const defaultTexture = textureById.scene;
  const background = new PIXI.Sprite(defaultTexture);
  fitBackgroundSprite(background, defaultTexture);
  app.stage.addChild(background);

  /** @type {BackgroundMode} */
  let backgroundMode = "scene";

  /** @param {BackgroundMode} mode */
  function setBackgroundMode(mode) {
    backgroundMode = mode;
    if (mode === "black") {
      background.visible = false;
      app.renderer.background.color = 0x000000;
      return;
    }

    const texture = textureById[mode];
    if (!texture) return;
    fitBackgroundSprite(background, texture);
    background.visible = true;
    app.renderer.background.color = 0x000000;
  }

  setBackgroundMode(getDesiredBgMode?.() ?? "scene");

  return {
    background,
    setBackgroundMode,
    getBackgroundMode: () => backgroundMode,
  };
}
