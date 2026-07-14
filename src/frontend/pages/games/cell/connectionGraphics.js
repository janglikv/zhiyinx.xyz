import { BEAD_SPACING } from "./gameConfig";

export function drawConnection(connection) {
  const { graphics, source, startX, startY, endX, endY, detour, progress, energyPackets, time } = connection;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const normalX = -dy / length;
  const normalY = dx / length;
  const waveCycles = Math.max(0.5, Math.round(length / 75) * 0.5);
  const travelled = length * progress;
  const visibleBeads = progress === 0 ? -1 : Math.floor(travelled / BEAD_SPACING);

  graphics.clear();
  // 头部持续前进，其余小细胞按固定距离跟随，形成蛇行而非末端逐颗追加。
  for (let index = 0; index <= visibleBeads; index += 1) {
    const distanceOnPath = Math.max(0, travelled - index * BEAD_SPACING);
    const ratio = distanceOnPath / length;
    const pathOffset = Math.sin(ratio * Math.PI * 2 * waveCycles) * 8
      + Math.sin(ratio * Math.PI) * detour;
    const x = startX + dx * ratio + normalX * pathOffset;
    const y = startY + dy * ratio + normalY * pathOffset;
    const radius = index === 0 && progress < 1 ? 3.1 : 2.6;
    const side = index % 2 === 0 ? 1 : -1;
    const sway = Math.sin(time * 0.012 + index * 0.9) * 0.8;
    const flagellaStartX = x + normalX * radius * side;
    const flagellaStartY = y + normalY * radius * side;
    const flagellaEndX = x - (dx / length) * 3.5 + normalX * (7 * side + sway);
    const flagellaEndY = y - (dy / length) * 3.5 + normalY * (7 * side + sway);

    graphics
      .moveTo(flagellaStartX, flagellaStartY)
      .quadraticCurveTo(
        x - (dx / length) * 1.8 + normalX * (4.8 * side - sway * 0.3),
        y - (dy / length) * 1.8 + normalY * (4.8 * side - sway * 0.3),
        flagellaEndX,
        flagellaEndY,
      )
      .stroke({ color: source.colors.highlight, width: 1.4, alpha: 0.58 })
      .circle(x + 0.6, y + 0.7, radius + 1).fill({ color: source.colors.dark, alpha: 0.92 })
      .circle(x, y, radius).fill({ color: source.colors.main })
      .circle(x - 0.8, y - 0.9, radius * 0.38).fill({ color: 0xffffff, alpha: 0.45 });
  }

  if (progress !== 1) return;
  energyPackets.forEach((packet) => {
    const ratio = packet.distance / length;
    const pathOffset = Math.sin(ratio * Math.PI * 2 * waveCycles) * 8
      + Math.sin(ratio * Math.PI) * detour;
    const x = startX + dx * ratio + normalX * pathOffset;
    const y = startY + dy * ratio + normalY * pathOffset;
    graphics
      .circle(x, y, 1.9).fill({ color: packet.colors.highlight })
      .circle(x - 0.45, y - 0.5, 0.58).fill({ color: 0xffffff, alpha: 0.95 });
  });
}

export function drawDetachedBurst(burst) {
  burst.graphics.clear();
  burst.packets.forEach((packet, index) => {
    const point = burst.getPoint(packet.ratio);
    const radius = index === 0 ? 3 : 2.5;
    burst.graphics
      .circle(point.x + 0.6, point.y + 0.7, radius + 1)
      .fill({ color: packet.colors.dark, alpha: 0.9 })
      .circle(point.x, point.y, radius)
      .fill({ color: packet.colors.main })
      .circle(point.x - 0.7, point.y - 0.8, radius * 0.35)
      .fill({ color: 0xffffff, alpha: 0.4 });
  });
}
