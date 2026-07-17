import { LEVELS } from "../levels";
import { COLOR_PLAYER, COLOR_ENEMY, COLOR_NEUTRAL } from "../constants";
import hubBg from "../backgrounds/level-1.webp";
import "./styles.css";

/**
 * 从 "第一关：基础增殖" 抽出短标题。
 * @param {string} name
 */
function shortTitle(name) {
  const m = name.match(/[：:]\s*(.+)$/);
  return m ? m[1] : name;
}

/** 与游戏内阵营色一致（CSS） */
const HEX = {
  player: `#${COLOR_PLAYER.toString(16).padStart(6, "0")}`,
  enemy: `#${COLOR_ENEMY.toString(16).padStart(6, "0")}`,
  neutral: `#${COLOR_NEUTRAL.toString(16).padStart(6, "0")}`,
};

/**
 * 关卡选择：画布内的游戏菜单（非网站卡片风）
 * @param {{
 *   maxUnlocked: number,
 *   cleared: Set<number>,
 *   recommendedIndex: number,
 *   onEnterLevel: (index: number) => void,
 *   tools?: import("react").ReactNode,
 * }} props
 */
export default function LevelSelect({
  maxUnlocked,
  cleared,
  recommendedIndex,
  onEnterLevel,
  tools,
}) {
  const unlockedCount = maxUnlocked + 1;
  const clearedCount = cleared.size;

  return (
    <div className="cell-hub">
      <div
        className="cell-hub__bg"
        style={{ backgroundImage: `url(${hubBg})` }}
        aria-hidden
      />
      <div className="cell-hub__vignette" aria-hidden />
      <div className="cell-hub__cells-deco" aria-hidden>
        <span className="cell-hub__orb cell-hub__orb--p" style={{ "--c": HEX.player }} />
        <span className="cell-hub__orb cell-hub__orb--n" style={{ "--c": HEX.neutral }} />
        <span className="cell-hub__orb cell-hub__orb--e" style={{ "--c": HEX.enemy }} />
      </div>

      <div className="cell-hub__ui">
        <header className="cell-hub__top">
          <div className="cell-hub__brand">
            <span className="cell-hub__brand-icon" aria-hidden>
              🦠
            </span>
            <div>
              <p className="cell-hub__eyebrow">CELL DIVISION · CAMPAIGN</p>
              <h2 className="cell-hub__title">选择关卡</h2>
            </div>
          </div>
          <div className="cell-hub__top-right">
            <div className="cell-hub__stats">
              <div className="cell-hub__stat">
                <span className="cell-hub__stat-val">
                  {unlockedCount}/{LEVELS.length}
                </span>
                <span className="cell-hub__stat-lab">已解锁</span>
              </div>
              <div className="cell-hub__stat-divider" />
              <div className="cell-hub__stat">
                <span className="cell-hub__stat-val">{clearedCount}</span>
                <span className="cell-hub__stat-lab">已通关</span>
              </div>
            </div>
            {tools ? <div className="cell-hub__tools">{tools}</div> : null}
          </div>
        </header>

        <div className="cell-hub__map" role="list">
          {LEVELS.map((lvl, index) => {
            const unlocked = index <= maxUnlocked;
            const done = cleared.has(index);
            const recommended = unlocked && index === recommendedIndex;
            const nodeClass = [
              "cell-hub__node",
              unlocked ? "cell-hub__node--open" : "cell-hub__node--locked",
              done ? "cell-hub__node--cleared" : "",
              recommended ? "cell-hub__node--rec" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div key={lvl.id} className="cell-hub__slot" role="listitem">
                {index > 0 && (
                  <div
                    className={
                      index <= maxUnlocked
                        ? "cell-hub__link cell-hub__link--on"
                        : "cell-hub__link"
                    }
                    aria-hidden
                  />
                )}
                <button
                  type="button"
                  className={nodeClass}
                  disabled={!unlocked}
                  onClick={() => unlocked && onEnterLevel(index)}
                  title={unlocked ? lvl.description : "通关前一关后解锁"}
                >
                  <span className="cell-hub__node-ring" aria-hidden />
                  <span className="cell-hub__node-core">
                    <span className="cell-hub__node-num">{index + 1}</span>
                    {!unlocked && (
                      <span className="cell-hub__node-lock" aria-hidden>
                        🔒
                      </span>
                    )}
                    {done && (
                      <span className="cell-hub__node-check" aria-hidden>
                        ✓
                      </span>
                    )}
                  </span>
                  {recommended && (
                    <span className="cell-hub__node-pulse" aria-hidden />
                  )}
                </button>
                <div className="cell-hub__node-meta">
                  <span className="cell-hub__node-name">{shortTitle(lvl.name)}</span>
                  <span
                    className={
                      done
                        ? "cell-hub__node-state cell-hub__node-state--done"
                        : recommended
                          ? "cell-hub__node-state cell-hub__node-state--rec"
                          : unlocked
                            ? "cell-hub__node-state"
                            : "cell-hub__node-state cell-hub__node-state--lock"
                    }
                  >
                    {done ? "已通关" : recommended ? "推荐" : unlocked ? "可进入" : "锁定"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cell-hub__detail">
          {(() => {
            const focus = LEVELS[recommendedIndex] ?? LEVELS[0];
            const unlocked = recommendedIndex <= maxUnlocked;
            return (
              <>
                <div className="cell-hub__detail-text">
                  <p className="cell-hub__detail-label">当前目标</p>
                  <p className="cell-hub__detail-name">{focus.name}</p>
                  <p className="cell-hub__detail-desc">
                    {unlocked
                      ? focus.description
                      : "完成前一关以解锁此区域。"}
                  </p>
                </div>
                <button
                  type="button"
                  className="cell-hub__play"
                  disabled={!unlocked}
                  onClick={() => unlocked && onEnterLevel(recommendedIndex)}
                >
                  {cleared.has(recommendedIndex) ? "再次出击" : "开始出击"}
                </button>
              </>
            );
          })()}
        </div>

        <p className="cell-hub__ops">
          <span style={{ color: HEX.player }}>● 己方</span>
          <span style={{ color: HEX.enemy }}>● 敌方</span>
          <span style={{ color: HEX.neutral }}>● 中立</span>
          <span className="cell-hub__ops-sep" />
          拖拽连线发射 · 滑动切断射流 · 肃清全部敌方细胞
        </p>
      </div>
    </div>
  );
}
