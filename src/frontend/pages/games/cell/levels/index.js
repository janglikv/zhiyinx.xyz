import level1 from "./level-1";
import level2 from "./level-2";
import level3 from "./level-3";
import level4 from "./level-4";
import level5 from "./level-5";

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   description: string,
 *   cells: Array<{ x: number, y: number, value: number, color: number }>,
 *   aiSeed: number,
 *   tutorial?: string | boolean,
 * }} LevelDef
 */

/** @type {LevelDef[]} */
export const LEVELS = [level1, level2, level3, level4, level5];

/**
 * @param {number} index
 * @returns {LevelDef | undefined}
 */
export function getLevel(index) {
  return LEVELS[index];
}
