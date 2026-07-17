import * as PIXI from "pixi.js";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants";
import backgroundLevel1 from "./backgrounds/level-1.webp";
import backgroundLevel2 from "./backgrounds/level-2.webp";
import backgroundLevel3 from "./backgrounds/level-3.webp";
import backgroundLevel4 from "./backgrounds/level-4.webp";
import backgroundLevel5 from "./backgrounds/level-5.webp";

export const BACKGROUNDS = [
  { id: "level-1", src: backgroundLevel1 },
  { id: "level-2", src: backgroundLevel2 },
  { id: "level-3", src: backgroundLevel3 },
  { id: "level-4", src: backgroundLevel4 },
  { id: "level-5", src: backgroundLevel5 },
];

/** @typedef {typeof BACKGROUNDS[number]['id']} BackgroundMode */

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
  const initialMode = getDesiredBgMode?.() ?? "level-1";
  const defaultTexture = textureById[initialMode];
  const background = new PIXI.Sprite(defaultTexture);
  fitBackgroundSprite(background, defaultTexture);
  app.stage.addChild(background);

  /** @type {BackgroundMode} */
  let backgroundMode = initialMode;

  /** @param {BackgroundMode} mode */
  function setBackgroundMode(mode) {
    backgroundMode = mode;
    const texture = textureById[mode];
    if (!texture) return;
    fitBackgroundSprite(background, texture);
    background.visible = true;
    app.renderer.background.color = 0x000000;
  }

  setBackgroundMode(initialMode);

  return {
    background,
    setBackgroundMode,
    getBackgroundMode: () => backgroundMode,
  };
}
