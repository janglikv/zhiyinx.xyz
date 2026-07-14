import { BEAD_SPACING } from "./gameConfig";
import { getPathPoint } from "./pathUtils";

export function drawSlashTrail(graphics, points) {
  graphics.clear();
  for (let index = 1; index < points.length; index += 1) {
    const strength = index / points.length;
    graphics
      .moveTo(points[index - 1].x, points[index - 1].y)
      .lineTo(points[index].x, points[index].y)
      .stroke({ color: 0xdffcff, width: 1.5 + strength * 4, alpha: 0.3 + strength * 0.7 });
  }
}

export function drawConnectionPreview(graphics, source, route, hasCellTarget) {
  graphics.clear();
  if (!source || !route) return;
  const previewLength = Math.hypot(route.endX - route.startX, route.endY - route.startY);
  const beadCount = Math.floor(previewLength / BEAD_SPACING) + 1;
  const affordableBeads = Math.floor(source.value);
  const hasEnoughEnergy = hasCellTarget && affordableBeads >= beadCount;

  for (let index = 0; index < beadCount; index += 1) {
    const ratio = beadCount === 1 ? 0 : index / (beadCount - 1);
    const point = getPathPoint(route, ratio);
    const nextPoint = getPathPoint(route, Math.min(1, ratio + 0.01));
    const previousPoint = getPathPoint(route, Math.max(0, ratio - 0.01));
    const tangentX = nextPoint.x - previousPoint.x;
    const tangentY = nextPoint.y - previousPoint.y;
    const tangentLength = Math.hypot(tangentX, tangentY);
    const directionX = tangentX / tangentLength;
    const directionY = tangentY / tangentLength;
    const normalX = -directionY;
    const normalY = directionX;
    const side = index % 2 === 0 ? 1 : -1;
    const radius = index === beadCount - 1 ? 3.1 : 2.6;
    const statusColor = hasEnoughEnergy
      ? 0x54c92b
      : index < affordableBeads ? 0xb8c0c8 : 0x50565e;
    const bodyColor = hasEnoughEnergy ? 0x54c92b : 0x9aa1a8;
    graphics
      .moveTo(point.x + normalX * radius * side, point.y + normalY * radius * side)
      .quadraticCurveTo(
        point.x - directionX * 2 + normalX * 4 * side,
        point.y - directionY * 2 + normalY * 4 * side,
        point.x - directionX * 3.5 + normalX * 7 * side,
        point.y - directionY * 3.5 + normalY * 7 * side,
      )
      .stroke({ color: statusColor, width: 1.2, alpha: 0.18 })
      .circle(point.x, point.y, radius).fill({ color: bodyColor, alpha: 0.14 })
      .circle(point.x, point.y, radius).stroke({ color: statusColor, width: 0.8, alpha: 0.24 })
      .circle(point.x - 0.7, point.y - 0.8, radius * 0.34).fill({ color: 0xffffff, alpha: 0.08 });
  }
}
