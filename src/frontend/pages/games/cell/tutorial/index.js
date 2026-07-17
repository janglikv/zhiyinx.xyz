/** 新手引导域：状态机 + 文案 + HUD */
export { createTutorialController } from "./controller";
export {
  TUTORIAL_COPY,
  TUTORIAL_START_PHASE,
  TUTORIAL_DONE_AUTO_END_MS,
} from "./phases";
export { default as TutorialHud } from "./Hud";
