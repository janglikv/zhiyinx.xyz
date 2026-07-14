export function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
  ));
  return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
}

export function getPathPoint(route, ratio) {
  const dx = route.endX - route.startX;
  const dy = route.endY - route.startY;
  const length = Math.hypot(dx, dy);
  const waveCycles = Math.max(0.5, Math.round(length / 75) * 0.5);
  const offset = Math.sin(ratio * Math.PI * 2 * waveCycles) * 8
    + Math.sin(ratio * Math.PI) * route.detour;
  return {
    x: route.startX + dx * ratio - (dy / length) * offset,
    y: route.startY + dy * ratio + (dx / length) * offset,
  };
}

export function syncConnectionEndpoints(connection) {
  connection.startX = connection.source.x
    + Math.cos(connection.sourcePortAngle) * connection.source.radius;
  connection.startY = connection.source.y
    + Math.sin(connection.sourcePortAngle) * connection.source.radius;
  connection.endX = connection.target.x
    - Math.cos(connection.targetPortAngle) * connection.target.radius;
  connection.endY = connection.target.y
    - Math.sin(connection.targetPortAngle) * connection.target.radius;
}
