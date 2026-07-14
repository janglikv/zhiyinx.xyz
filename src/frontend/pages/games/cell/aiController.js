import { BEAD_SPACING } from "./gameConfig";

export function chooseAiMove(cells, connections, chooseRoute, settings) {
  const sources = cells.filter((cell) => cell.team === "red");
  let bestCandidate = null;

  sources.forEach((source) => {
    cells.forEach((target) => {
      if (source === target || target.team === "red") return;
      if (connections.some((item) => !item.retracting && item.source === source && item.target === target)) return;

      // 先用中心距离筛选，只为最终候选执行昂贵的避障选路。
      const length = Math.max(0, Math.hypot(target.x - source.x, target.y - source.y)
        - source.radius - target.radius);
      const cost = Math.floor(length / BEAD_SPACING) + 1;
      if (source.value < cost + settings.reserveEnergy) return;

      const defense = target.team === "green" ? target.value : 0;
      if (target.team === "green" && source.value - cost < defense * settings.attackRatio) return;

      // 优先扩张中立细胞，其次攻击较弱且距离较近的玩家细胞。
      const score = (target.team === "neutral" ? 80 : 120)
        - cost * 1.4
        - defense * settings.attackRatio
        + source.value * 0.25;
      if (!bestCandidate || score > bestCandidate.score) bestCandidate = { source, target, score };
    });
  });

  if (!bestCandidate) return null;
  const route = chooseRoute(bestCandidate.source, bestCandidate.target);
  return route ? { ...bestCandidate, route } : null;
}
