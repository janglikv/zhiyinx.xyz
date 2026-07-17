import {
  TUTORIAL_DONE_AUTO_END_MS,
  TUTORIAL_START_PHASE,
} from "./phases";

/**
 * 第一关基础引导：连灰 → 削弱 → 攻红 → 完成。
 * 不依赖 React；通过 onPhase / onComplete 同步 UI。
 *
 * @param {object} options
 * @param {import("../cell").Cell[]} options.cells
 * @param {ReturnType<import("../combat").createCombat>} options.combat
 * @param {ReturnType<import("../aim").createAimSystem>} options.aim
 * @param {Set<number>} options.initialNeutralIdx 开局中立细胞下标
 * @param {(phase: import("./phases").TutorialPhase) => void} [options.onPhase]
 * @param {() => void} [options.onComplete]
 */
export function createTutorialController({
  cells,
  combat,
  aim,
  initialNeutralIdx,
  onPhase,
  onComplete,
}) {
  let active = true;
  /** @type {import("./phases").TutorialPhase} */
  let phase = TUTORIAL_START_PHASE;
  /** 占领灰色前：停自增 + 锁 AI；攻红引导起解除 */
  let enemyUnlocked = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let doneTimer = null;
  let destroyed = false;

  function clearDoneTimer() {
    if (doneTimer != null) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }
  }

  function end() {
    if (!active && phase === null) return;
    active = false;
    enemyUnlocked = true;
    phase = null;
    clearDoneTimer();
    clearHighlights();
    onComplete?.();
  }

  /**
   * @param {import("./phases").TutorialPhase} next
   */
  function setPhase(next) {
    if (!active) return;
    if (phase === next) return;
    phase = next;
    if (next === "attack" || next === "done") {
      enemyUnlocked = true;
    }
    onPhase?.(next);
    if (next === "done") {
      clearDoneTimer();
      doneTimer = setTimeout(() => {
        if (destroyed) return;
        end();
      }, TUTORIAL_DONE_AUTO_END_MS);
    }
  }

  function clearHighlights() {
    for (const cell of cells) {
      cell.setTutorialHighlight(false);
    }
    aim.setTutorialGuideTarget(null);
  }

  /** 推进步骤 + 刷新高亮 / 橙环（在 aim.tick 前调用） */
  function tick() {
    if (!active || phase === null) {
      clearHighlights();
      return;
    }

    // —— 步骤推进 ——
    if (phase !== "done") {
      const captured = [...initialNeutralIdx].some((i) => cells[i]?.isPlayer());

      let linkedNeutral = false;
      let linkedEnemy = false;
      for (const [source, link] of combat.fireLinks) {
        if (!source.isPlayer()) continue;
        if (link.target.isNeutral()) linkedNeutral = true;
        if (link.target.isEnemy()) linkedEnemy = true;
      }

      if (phase === "connect" || phase === "weaken") {
        if (captured) {
          setPhase("attack");
        } else if (linkedNeutral) {
          setPhase("weaken");
        }
      } else if (phase === "attack") {
        if (linkedEnemy) {
          setPhase("done");
        }
      }
    }

    // —— 高亮：源闪烁 + 目标橙环 ——
    if (!active || phase === null) {
      clearHighlights();
      return;
    }

    /** @type {import("../cell").Cell | null} */
    let focus = null;
    /** @type {false | 'source' | 'target'} */
    let focusMode = false;
    /** @type {import("../cell").Cell | null} */
    let guideTarget = null;

    if (phase === "connect") {
      focus = cells.find((c) => c.isPlayer()) ?? null;
      focusMode = "source";
      guideTarget = cells.find((c) => c.isNeutral()) ?? null;
    } else if (phase === "attack") {
      let alreadyOnEnemy = false;
      for (const [source, link] of combat.fireLinks) {
        if (source.isPlayer() && link.target.isEnemy()) {
          alreadyOnEnemy = true;
          break;
        }
      }
      if (!alreadyOnEnemy) {
        for (const i of initialNeutralIdx) {
          const cell = cells[i];
          if (cell?.isPlayer()) {
            focus = cell;
            focusMode = "source";
            break;
          }
        }
        guideTarget = cells.find((c) => c.isEnemy()) ?? null;
      }
    }

    for (const cell of cells) {
      cell.setTutorialHighlight(cell === focus ? focusMode : false);
    }
    aim.setTutorialGuideTarget(guideTarget);
  }

  function destroy() {
    destroyed = true;
    clearDoneTimer();
    if (active) {
      active = false;
      clearHighlights();
    }
  }

  // 首帧通知 UI
  onPhase?.(phase);

  return {
    tick,
    skip: end,
    destroy,
    get active() {
      return active;
    },
    get phase() {
      return phase;
    },
    get enemyUnlocked() {
      return enemyUnlocked;
    },
    /** 占领灰前停自增，便于看清数字下降 */
    get freezeGrowth() {
      return active && !enemyUnlocked;
    },
  };
}
