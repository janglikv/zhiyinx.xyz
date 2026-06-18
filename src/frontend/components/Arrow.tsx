import styles from "./Arrow.module.css";

type ArrowProps = {
  bottom?: string;
  left?: string;
};

export default function Arrow({ bottom, left }: ArrowProps) {
  const customStyle: React.CSSProperties = {};
  if (bottom !== undefined) customStyle.bottom = bottom;
  if (left !== undefined) {
    customStyle.left = left;
    customStyle.transform = "none";
  }

  return (
    <div className={styles.wrapper} style={customStyle}>
      <svg
        width="360"
        height="360"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.handdrawnArrow}
      >
        {/* 歪扭的手画主干 */}
        <path d="M52 88 C46 64, 54 36, 48 12" />
        {/* 左侧箭头帽，故意画得跟主干有一点点错位重叠，更有手绘质感 */}
        <path d="M26 35 C36 26, 43 18, 48 12" />
        {/* 右侧箭头帽 */}
        <path d="M70 34 C59 25, 53 19, 48 12" />
      </svg>
    </div>
  );
}
