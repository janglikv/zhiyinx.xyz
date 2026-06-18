import styles from "./Background.module.css";
function Background({ showBlob3 = true }) {
  return <>
      {
    /* 极光模糊背景 */
  }
      <div className={styles.auroraBg}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
        {showBlob3 && <div className={`${styles.blob} ${styles.blob3}`} />}
      </div>
      {
    /* 细致网格背景 */
  }
      <div className={styles.gridOverlay} />
    </>;
}
export {
  Background as default
};
