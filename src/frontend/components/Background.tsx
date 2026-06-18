import styles from "./Background.module.css";

type BackgroundProps = {
  showBlob3?: boolean;
};

export default function Background({ showBlob3 = true }: BackgroundProps) {
  return (
    <>
      {/* 极光模糊背景 */}
      <div className={styles.auroraBg}>
        <div className={`${styles.blob} ${styles.blob1}`}></div>
        <div className={`${styles.blob} ${styles.blob2}`}></div>
        {showBlob3 && <div className={`${styles.blob} ${styles.blob3}`}></div>}
      </div>
      {/* 细致网格背景 */}
      <div className={styles.gridOverlay}></div>
    </>
  );
}
