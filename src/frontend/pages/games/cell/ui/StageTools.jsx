import SettingsButton from "./SettingsButton";
import DebugButton from "./DebugButton";
import FullscreenButton from "./FullscreenButton";

const IS_DEV = import.meta.env.DEV;

/**
 * 设置 +（DEV 调试）+ 全屏（hub / play 共用，Fragment 不破坏父级布局）
 * @param {{
 *   stageRef: React.RefObject<HTMLElement | null>,
 *   onOpenSettings: () => void,
 *   onOpenDebug?: () => void,
 * }} props
 */
export default function StageTools({ stageRef, onOpenSettings, onOpenDebug }) {
  return (
    <>
      <SettingsButton onClick={onOpenSettings} />
      {IS_DEV && onOpenDebug ? <DebugButton onClick={onOpenDebug} /> : null}
      <FullscreenButton targetRef={stageRef} />
    </>
  );
}
