/**
 * 返回键旁三星进度：清场 / 时间（默认满）/ 能量
 * @param {{
 *   clearProgress?: number,
 *   timeProgress?: number,
 *   energyProgress?: number,
 *   clearLit?: boolean,
 *   timeLit?: boolean,
 *   energyLit?: boolean,
 *   starTimeSec?: number,
 *   energyTarget?: number,
 *   hidden?: boolean,
 * }} props
 */
export default function StarProgressHud({
  clearProgress = 0,
  timeProgress = 1,
  energyProgress = 0,
  clearLit = false,
  timeLit = true,
  energyLit = false,
  starTimeSec,
  energyTarget,
  hidden = false,
}) {
  if (hidden) return null;

  const items = [
    {
      key: "clear",
      label: "清场",
      progress: clearProgress,
      lit: clearLit,
      title: "消灭全部敌巢 · 通关星",
    },
    {
      key: "time",
      label: "限时",
      progress: timeProgress,
      lit: timeLit,
      title:
        starTimeSec != null
          ? `评星限时 ${starTimeSec} 秒内通关 · 时间星（默认点亮，耗尽熄灭）`
          : "评星限时内通关 · 时间星",
    },
    {
      key: "energy",
      label: "能量",
      progress: energyProgress,
      lit: energyLit,
      title:
        energyTarget != null
          ? `己方总能量 ≥ ${Math.round(energyTarget)} · 能量星`
          : "己方能量达标 · 能量星",
    },
  ];

  return (
    <div className="cell-star-hud" role="group" aria-label="三星进度">
      {items.map((item) => {
        const pct = Math.round(clamp01(item.progress) * 100);
        return (
          <div
            key={item.key}
            className={[
              "cell-star-hud__item",
              item.lit ? "is-lit" : "",
              pct <= 0 && item.key === "time" ? "is-empty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={item.title}
          >
            <span className="cell-star-hud__star" aria-hidden>
              ★
            </span>
            <div
              className="cell-star-hud__track"
              role="progressbar"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div
                className="cell-star-hud__fill"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** @param {number} n */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
