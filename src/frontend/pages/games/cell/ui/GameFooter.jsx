/** 对局底部图例（游戏壳内） */
export default function GameFooter() {
  return (
    <div className="cell-legend">
      <span className="cell-legend__item">
        <i className="cell-legend__dot cell-legend__dot--p" /> 己方
      </span>
      <span className="cell-legend__item">
        <i className="cell-legend__dot cell-legend__dot--e" /> 敌方
      </span>
      <span className="cell-legend__item">
        <i className="cell-legend__dot cell-legend__dot--n" /> 中立
      </span>
      <span className="cell-legend__sep" />
      <span className="cell-legend__tip">拖拽连线发射 · 滑动切断射流</span>
    </div>
  );
}
