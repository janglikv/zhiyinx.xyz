/**
 * 对局失败倒计时 HUD（右上角，后 30s 变红）
 * @param {{
 *   remainingSec: number | null,
 *   timeLimitSec?: number,
 *   urgent?: boolean,
 *   hidden?: boolean,
 * }} props
 */
export default function BattleTimer({
  remainingSec,
  timeLimitSec = 180,
  urgent = false,
  hidden = false,
}) {
  if (hidden || remainingSec == null || remainingSec < 0) return null;

  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const label = `${m}:${String(s).padStart(2, "0")}`;
  const critical = remainingSec <= 10;

  return (
    <div
      className={[
        "cell-battle-timer",
        urgent ? "cell-battle-timer--urgent" : "",
        critical ? "cell-battle-timer--critical" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={`对局限时 ${timeLimitSec} 秒 · 超时判负`}
      aria-live="polite"
    >
      <span className="cell-battle-timer__icon" aria-hidden>
        ⏱
      </span>
      <span className="cell-battle-timer__value">{label}</span>
    </div>
  );
}
