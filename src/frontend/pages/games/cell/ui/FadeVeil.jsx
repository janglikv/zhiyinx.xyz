/**
 * 画布内黑场转场遮罩
 * @param {{
 *   phase: "idle" | "out" | "hold" | "in",
 *   onCovered: () => void,
 *   onRevealed: () => void,
 * }} props
 */
export default function FadeVeil({ phase, onCovered, onRevealed }) {
  const covered = phase === "out" || phase === "hold" || phase === "in";
  // out/hold：盖住；in：开始揭开（opacity→0）
  const opaque = phase === "out" || phase === "hold";

  return (
    <div
      className={[
        "cell-fade-veil",
        covered ? "cell-fade-veil--active" : "",
        opaque ? "cell-fade-veil--opaque" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== "opacity") return;
        if (phase === "out") onCovered();
        if (phase === "in") onRevealed();
      }}
    />
  );
}
