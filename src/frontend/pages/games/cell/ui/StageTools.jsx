import SettingsButton from "./SettingsButton";
import FullscreenButton from "./FullscreenButton";

/**
 * 设置 + 全屏（hub / play 共用，Fragment 不破坏父级布局）
 * @param {{
 *   stageRef: React.RefObject<HTMLElement | null>,
 *   onOpenSettings: () => void,
 * }} props
 */
export default function StageTools({ stageRef, onOpenSettings }) {
  return (
    <>
      <SettingsButton onClick={onOpenSettings} />
      <FullscreenButton targetRef={stageRef} />
    </>
  );
}
