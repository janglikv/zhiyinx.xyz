import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const appRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();
    let destroyed = false;

    async function initPixi() {
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x07080b,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed || !containerRef.current) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
        return;
      }

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);

      // 绘制背景网格
      const bgGraphics = new PIXI.Graphics();
      bgGraphics.stroke({ color: 0x111622, width: 1.5 });
      for (let x = 0; x < 800; x += 50) {
        bgGraphics.moveTo(x, 0);
        bgGraphics.lineTo(x, 600);
      }
      for (let y = 0; y < 600; y += 50) {
        bgGraphics.moveTo(0, y);
        bgGraphics.lineTo(800, y);
      }
      app.stage.addChild(bgGraphics);

      const connectionLayer = new PIXI.Container();
      app.stage.addChild(connectionLayer);
      const previewGraphics = new PIXI.Graphics();
      connectionLayer.addChild(previewGraphics);
      const slashGraphics = new PIXI.Graphics();

      const animatedParts = [];
      const growingCells = [];
      const cells = [];
      const connections = [];
      const autoGrowthInterval = 1000;
      // 输送速度是自增的两倍，因此逻辑帧间隔取自增间隔的一半。
      const logicInterval = autoGrowthInterval / 2;
      let logicAccumulator = 0;
      let logicTick = 0;
      let pressedCell = null;
      let hoveredCell = null;
      let slashActive = false;
      let slashPoints = [];
      let slashFade = 0;

      function pointToSegmentDistance(point, start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
        const ratio = Math.max(0, Math.min(1,
          ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
        ));
        return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
      }

      function drawSlashTrail() {
        slashGraphics.clear();
        for (let index = 1; index < slashPoints.length; index += 1) {
          const strength = index / slashPoints.length;
          slashGraphics
            .moveTo(slashPoints[index - 1].x, slashPoints[index - 1].y)
            .lineTo(slashPoints[index].x, slashPoints[index].y)
            .stroke({ color: 0xdffcff, width: 1.5 + strength * 4, alpha: 0.3 + strength * 0.7 });
        }
      }

      function finishSlash() {
        slashActive = false;
        slashFade = 1;
        connections.forEach((connection) => {
          if (connection.retracting || connection.progress === 0) return;
          let hit = false;
          let previousPathPoint = getPathPoint(connection, 0);
          const pathSteps = Math.max(2, Math.ceil(48 * connection.progress));

          for (let pathIndex = 1; pathIndex <= pathSteps && !hit; pathIndex += 1) {
            const pathPoint = getPathPoint(connection, (pathIndex / pathSteps) * connection.progress);
            for (let slashIndex = 1; slashIndex < slashPoints.length; slashIndex += 1) {
              const slashStart = slashPoints[slashIndex - 1];
              const slashEnd = slashPoints[slashIndex];
              if (
                pointToSegmentDistance(pathPoint, slashStart, slashEnd) < 6
                || pointToSegmentDistance(slashEnd, previousPathPoint, pathPoint) < 6
              ) {
                hit = true;
                break;
              }
            }
            previousPathPoint = pathPoint;
          }

          if (hit) {
            connection.retracting = true;
            connection.energyPackets = [];
          }
        });
      }

      function clearConnectionPreview() {
        previewGraphics.clear();
        cells.forEach((item) => {
          item.selection.visible = false;
          item.targetHint.visible = false;
        });
        pressedCell = null;
        hoveredCell = null;
      }

      function drawConnectionPreview(pointerX, pointerY) {
        if (!pressedCell) return;
        const targetX = hoveredCell ? hoveredCell.x : pointerX;
        const targetY = hoveredCell ? hoveredCell.y : pointerY;
        const dx = targetX - pressedCell.x;
        const dy = targetY - pressedCell.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= pressedCell.radius) return;

        const startX = pressedCell.x + (dx / distance) * pressedCell.radius;
        const startY = pressedCell.y + (dy / distance) * pressedCell.radius;
        const endOffset = hoveredCell ? hoveredCell.radius : 4;
        const endX = targetX - (dx / distance) * endOffset;
        const endY = targetY - (dy / distance) * endOffset;
        const previewLength = Math.hypot(endX - startX, endY - startY);
        const count = Math.floor(previewLength / 8);

        previewGraphics.clear();
        for (let index = 0; index <= count; index += 1) {
          const ratio = count === 0 ? 0 : index / count;
          const x = startX + (endX - startX) * ratio;
          const y = startY + (endY - startY) * ratio;
          previewGraphics
            .circle(x, y, hoveredCell ? 2.2 : 1.7)
            .fill({ color: hoveredCell ? pressedCell.colors.highlight : pressedCell.colors.main, alpha: 0.6 });
        }
      }

      function getPathPoint(route, ratio) {
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

      function syncConnectionEndpoints(connection) {
        connection.startX = connection.source.x
          + Math.cos(connection.sourcePortAngle) * connection.source.radius;
        connection.startY = connection.source.y
          + Math.sin(connection.sourcePortAngle) * connection.source.radius;
        connection.endX = connection.target.x
          - Math.cos(connection.targetPortAngle) * connection.target.radius;
        connection.endY = connection.target.y
          - Math.sin(connection.targetPortAngle) * connection.target.radius;
      }

      function chooseRoute(source, target) {
        const baseAngle = Math.atan2(target.y - source.y, target.x - source.x);
        const portOffsets = [0, 0.24, -0.24, 0.46, -0.46];
        const detours = [0, 28, -28, 40, -40, 56, -56, 72, -72];
        let bestRoute = null;
        let bestScore = Infinity;

        for (const sourceOffset of portOffsets) {
          for (const targetOffset of portOffsets) {
            const startX = source.x + Math.cos(baseAngle + sourceOffset) * source.radius;
            const startY = source.y + Math.sin(baseAngle + sourceOffset) * source.radius;
            const endX = target.x - Math.cos(baseAngle + targetOffset) * target.radius;
            const endY = target.y - Math.sin(baseAngle + targetOffset) * target.radius;

            for (const detour of detours) {
              const route = {
                startX,
                startY,
                endX,
                endY,
                detour,
                sourcePortAngle: baseAngle + sourceOffset,
                targetPortAngle: baseAngle + targetOffset,
              };
              let score = Math.abs(detour) * 0.35 + (Math.abs(sourceOffset) + Math.abs(targetOffset)) * 18;
              let blocked = false;

              for (let step = 1; step < 32 && !blocked; step += 1) {
                const point = getPathPoint(route, step / 32);
                blocked = cells.some((cell) => {
                  if (cell === source || cell === target) return false;
                  return Math.hypot(point.x - cell.x, point.y - cell.y) <= cell.radius + 10;
                });
                if (blocked) break;

                connections.forEach((connection) => {
                  for (let otherStep = 1; otherStep < 24; otherStep += 1) {
                    const otherPoint = getPathPoint(connection, otherStep / 24);
                    const distance = Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y);
                    if (distance < 14) score += (14 - distance) ** 2 * 0.4;
                  }
                });
              }
              if (blocked) continue;

              connections.forEach((connection) => {
                const sourceEndpoint = connection.source === source
                  ? [connection.startX, connection.startY]
                  : connection.target === source ? [connection.endX, connection.endY] : null;
                const targetEndpoint = connection.source === target
                  ? [connection.startX, connection.startY]
                  : connection.target === target ? [connection.endX, connection.endY] : null;
                if (sourceEndpoint) {
                  const distance = Math.hypot(startX - sourceEndpoint[0], startY - sourceEndpoint[1]);
                  if (distance < 14) score += (14 - distance) ** 2 * 8;
                }
                if (targetEndpoint) {
                  const distance = Math.hypot(endX - targetEndpoint[0], endY - targetEndpoint[1]);
                  if (distance < 14) score += (14 - distance) ** 2 * 8;
                }
              });

              if (score < bestScore) {
                bestScore = score;
                bestRoute = route;
              }
            }
          }
        }
        return bestRoute;
      }

      function startConnection(source, target) {
        const route = chooseRoute(source, target);

        connections.push({
          graphics: new PIXI.Graphics(),
          source,
          target,
          progress: 0,
          grownBeads: 0,
          refundedBeads: 0,
          energyPackets: [],
          time: 0,
          ...route,
        });
        connectionLayer.addChild(connections.at(-1).graphics);
      }

      function drawConnection(connection) {
        const { graphics, source, startX, startY, endX, endY, detour, progress, energyPackets, time } = connection;
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.hypot(dx, dy);
        const normalX = -dy / length;
        const normalY = dx / length;
        const waveAmplitude = 8;
        const waveCycles = Math.max(0.5, Math.round(length / 75) * 0.5);
        const beadSpacing = 6;
        const travelled = length * progress;
        const visibleBeads = progress === 0 ? -1 : Math.floor(travelled / beadSpacing);

        graphics.clear();
        // 头部持续前进，其余小细胞按固定距离跟随，形成蛇行而非末端逐颗追加。
        for (let index = 0; index <= visibleBeads; index += 1) {
          const distanceOnPath = Math.max(0, travelled - index * beadSpacing);
          const ratio = distanceOnPath / length;
          const pathOffset = Math.sin(ratio * Math.PI * 2 * waveCycles) * waveAmplitude
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
            .circle(x - 0.8, y - 0.9, radius * 0.38)
            .fill({ color: 0xffffff, alpha: 0.45 });
        }

        if (progress === 1) {
          energyPackets.forEach((packet) => {
            const ratio = packet.distance / length;
            const pathOffset = Math.sin(ratio * Math.PI * 2 * waveCycles) * waveAmplitude
              + Math.sin(ratio * Math.PI) * detour;
            const x = startX + dx * ratio + normalX * pathOffset;
            const y = startY + dy * ratio + normalY * pathOffset;
            graphics
              .circle(x, y, 1.9).fill({ color: packet.colors.highlight })
              .circle(x - 0.45, y - 0.5, 0.58).fill({ color: 0xffffff, alpha: 0.95 });
          });
        }
      }

      function createCell(x, y, text, colors, options = {}) {
        const { grows = true, empty = false, team = "neutral" } = options;
        let isEmpty = empty;
        const neutralColors = { ...colors };
        const numericValue = Math.min(99, Number(text));
        const cellRadius = Math.min(40, Math.max(16, 14 + Math.sqrt(numericValue) * 1.6));
        const detailRadius = 14 + Math.sqrt(60) * 1.6;
        const bumpCount = Math.round((Math.PI * 2 * detailRadius) / 8);
        const poreCount = Math.max(2, Math.round((detailRadius ** 2 - 9 ** 2) / 55));
        const cell = new PIXI.Container();
        cell.position.set(x, y);
        cell.eventMode = "static";
        cell.cursor = "pointer";
        cell.hitArea = new PIXI.Circle(0, 0, Math.max(20, cellRadius + 5));

        const shadow = new PIXI.Graphics()
          .ellipse(2, 3, cellRadius + 4, cellRadius + 3)
          .fill({ color: colors.shadow, alpha: 0.55 });
        shadow.filters = [new PIXI.BlurFilter({ strength: 4 })];

        const membrane = new PIXI.Container();
        const bumpSprites = [];
        const bumpAngleOffset = Math.random() * Math.PI * 2;
        const bumpOrder = [];
        const poreOrder = [];
        // 不规则的膜突起是参考图中最明显的轮廓特征。
        for (let index = 0; index < bumpCount; index += 1) {
          // 黄金角让新增位置看起来随机，同时避免大量凸起挤在同一区域。
          const angle = (bumpAngleOffset + index * 2.399) % (Math.PI * 2);
          const bumpX = Math.cos(angle) * (cellRadius + 1.5);
          const bumpY = Math.sin(angle) * (cellRadius + 1.5);
          const radius = index % 3 === 0 ? 3 : 2.5;
          const bump = new PIXI.Graphics()
            .circle(0.6, 0.8, radius + 0.8)
            .fill({ color: colors.dark })
            .circle(0, 0, radius)
            .fill({ color: colors.main })
            .circle(-0.6, -0.8, radius * 0.48)
            .fill({ color: colors.highlight, alpha: 0.75 });
          bump.position.set(bumpX, bumpY);
          membrane.addChild(bump);
          bumpSprites.push({ bump, x: bumpX, y: bumpY, radius, angle, targetAngle: angle, phase: index * 0.83, appearance: 0, targetVisible: false });
        }

        const body = new PIXI.Graphics()
          .circle(1, 1.5, cellRadius).fill({ color: colors.shadow })
          .circle(0, 0, cellRadius).fill({ color: colors.main })
          .circle(-1.5, -2, cellRadius - 2.5).fill({ color: colors.light })
          .ellipse(-cellRadius * 0.25, -cellRadius * 0.35, cellRadius * 0.58, cellRadius * 0.42)
          .fill({ color: colors.highlight, alpha: 0.34 })
          .circle(0, 0, cellRadius).stroke({ color: colors.outline, width: 1.2, alpha: 0.85 })
          .circle(0, 0, cellRadius - 1.8).stroke({ color: colors.highlight, width: 0.8, alpha: 0.62 });

        const sheen = new PIXI.Container();
        const sheenShape = new PIXI.Graphics()
          .ellipse(-cellRadius * 0.7, -cellRadius * 0.25, 7, 13).fill({ color: colors.highlight, alpha: 0.13 })
          .ellipse(-cellRadius * 0.4, -cellRadius * 0.45, 3, 7).fill({ color: 0xffffff, alpha: 0.11 });
        const sheenMask = new PIXI.Graphics().circle(0, 0, cellRadius - 2).fill(0xffffff);
        sheen.addChild(sheenShape, sheenMask);
        sheen.mask = sheenMask;

        const pores = new PIXI.Container();
        const poreSprites = [];
        for (let index = 0; index < poreCount; index += 1) {
          const angle = index * 2.399 + 0.5;
          const distanceFromCenter = (12 + cellRadius - 4) / 2;
          const poreX = Math.cos(angle) * distanceFromCenter;
          const poreY = Math.sin(angle) * distanceFromCenter;
          const radius = index % 3 === 0 ? 2.4 : 1.8;
          const pore = new PIXI.Graphics()
            .circle(0.3, 0.5, radius + 0.7).fill({ color: colors.poreRing, alpha: 0.85 })
            .circle(0, 0, radius).fill({ color: colors.pore })
            .ellipse(-radius * 0.25, -radius * 0.3, radius * 0.52, radius * 0.35)
            .fill({ color: colors.poreDark, alpha: 0.78 })
            .circle(-radius * 0.32, -radius * 0.38, Math.max(0.4, radius * 0.16))
            .fill({ color: colors.highlight, alpha: 0.7 });
          pore.position.set(poreX, poreY);
          pores.addChild(pore);
          poreSprites.push({ pore, radius, angle, targetAngle: angle, appearance: 0, targetVisible: false });
        }

        const center = new PIXI.Graphics()
          .circle(0, 0.5, 9).fill({ color: colors.centerDark, alpha: 0.96 })
          .circle(-0.5, -0.25, 8.25).fill({ color: colors.center })
          .circle(0, 0.25, 8.5).stroke({ color: colors.highlight, width: 0.6, alpha: 0.55 });
        const value = new PIXI.Text({
          text,
          style: {
            fontFamily: "Arial, sans-serif",
            fontSize: 11.5,
            fontWeight: "700",
            fill: 0xffffff,
            stroke: { color: colors.centerDark, width: 0.8 },
          },
        });
        value.anchor.set(0.5);
        value.position.set(0, 1);

        const selection = new PIXI.Graphics()
          .circle(0, 0, cellRadius).stroke({ color: colors.highlight, width: 9, alpha: 0.32 })
          .circle(0, 0, cellRadius).stroke({ color: colors.highlight, width: 5, alpha: 0.58 })
          .circle(0, 0, cellRadius).stroke({ color: 0xffffff, width: 1.8, alpha: 0.95 });
        selection.visible = false;
        const targetHint = new PIXI.Graphics()
          .circle(0, 0, cellRadius).stroke({ color: colors.highlight, width: 11, alpha: 0.38 })
          .circle(0, 0, cellRadius).stroke({ color: colors.highlight, width: 6, alpha: 0.7 })
          .circle(0, 0, cellRadius).stroke({ color: 0xffffff, width: 2.2, alpha: 1 });
        targetHint.visible = false;

        cell.addChild(shadow, membrane, body, sheen, pores, center, value, selection, targetHint);
        app.stage.addChild(cell);
        const animatedPart = {
          bumpSprites,
          poreSprites,
          sheenShape,
          sheenRange: cellRadius * 0.35,
          radius: cellRadius,
          detailScale: 1,
        };
        animatedParts.push(animatedPart);
        const cellData = { container: cell, x, y, radius: cellRadius, colors, selection, targetHint, team };
        cells.push(cellData);

        function renderGrowth(currentValue) {
          const radius = Math.min(40, Math.max(16, 14 + Math.sqrt(currentValue) * 1.6));
          const currentDetailRadius = Math.min(40, Math.max(16, 14 + Math.sqrt(Math.min(currentValue, 60)) * 1.6));
          const currentBumpCount = isEmpty ? 0 : Math.round((Math.PI * 2 * currentDetailRadius) / 8);
          const currentPoreCount = isEmpty ? 0 : Math.max(2, Math.round((currentDetailRadius ** 2 - 9 ** 2) / 55));

          cellData.radius = radius;
          animatedPart.radius = radius;
          const radiusAtDetailLimit = 14 + Math.sqrt(60) * 1.6;
          animatedPart.detailScale = currentValue > 60 ? radius / radiusAtDetailLimit : 1;
          cell.hitArea = new PIXI.Circle(0, 0, Math.max(20, radius + 5));
          value.text = String(Math.floor(currentValue));

          shadow.clear().ellipse(2, 3, radius + 4, radius + 3)
            .fill({ color: colors.shadow, alpha: 0.55 });
          body.clear()
            .circle(1, 1.5, radius).fill({ color: colors.shadow })
            .circle(0, 0, radius).fill({ color: colors.main })
            .circle(-1.5, -2, radius - 2.5).fill({ color: colors.light })
            .ellipse(-radius * 0.25, -radius * 0.35, radius * 0.58, radius * 0.42)
            .fill({ color: colors.highlight, alpha: 0.34 })
            .circle(0, 0, radius).stroke({ color: colors.outline, width: 1.2, alpha: 0.85 })
            .circle(0, 0, radius - 1.8).stroke({ color: colors.highlight, width: 0.8, alpha: 0.62 });

          while (bumpOrder.length > currentBumpCount) {
            bumpOrder.splice(Math.floor(Math.random() * bumpOrder.length), 1);
          }
          while (bumpOrder.length < currentBumpCount) {
            const newIndex = bumpSprites.findIndex((_, index) => !bumpOrder.includes(index));
            bumpOrder.splice(Math.floor(Math.random() * (bumpOrder.length + 1)), 0, newIndex);
          }
          const activeBumps = new Set(bumpOrder);
          bumpSprites.forEach((item, index) => { item.targetVisible = activeBumps.has(index); });
          bumpOrder.forEach((itemIndex, slot) => {
            const item = bumpSprites[itemIndex];
            item.targetAngle = bumpAngleOffset + (slot / currentBumpCount) * Math.PI * 2;
            if (item.appearance === 0) item.angle = item.targetAngle;
          });

          while (poreOrder.length > currentPoreCount) {
            poreOrder.splice(Math.floor(Math.random() * poreOrder.length), 1);
          }
          while (poreOrder.length < currentPoreCount) {
            const newIndex = poreSprites.findIndex((_, index) => !poreOrder.includes(index));
            poreOrder.splice(Math.floor(Math.random() * (poreOrder.length + 1)), 0, newIndex);
          }
          const activePores = new Set(poreOrder);
          poreSprites.forEach((item, index) => { item.targetVisible = activePores.has(index); });
          poreOrder.forEach((itemIndex, slot) => {
            const item = poreSprites[itemIndex];
            item.targetAngle = 0.5 + (slot / currentPoreCount) * Math.PI * 2;
            if (item.appearance === 0) item.angle = item.targetAngle;
          });

          sheenMask.clear().circle(0, 0, radius - 2).fill(0xffffff);
          selection.clear()
            .circle(0, 0, radius).stroke({ color: colors.highlight, width: 9, alpha: 0.32 })
            .circle(0, 0, radius).stroke({ color: colors.highlight, width: 5, alpha: 0.58 })
            .circle(0, 0, radius).stroke({ color: 0xffffff, width: 1.8, alpha: 0.95 });
          targetHint.clear()
            .circle(0, 0, radius).stroke({ color: colors.highlight, width: 11, alpha: 0.38 })
            .circle(0, 0, radius).stroke({ color: colors.highlight, width: 6, alpha: 0.7 })
            .circle(0, 0, radius).stroke({ color: 0xffffff, width: 2.2, alpha: 1 });
        }

        cellData.setFaction = (nextTeam, capturingColors, emptyState) => {
          isEmpty = emptyState;
          cellData.team = nextTeam;
          Object.assign(colors, capturingColors);

          bumpSprites.forEach(({ bump, radius }) => {
            bump.clear()
              .circle(0.6, 0.8, radius + 0.8).fill({ color: colors.dark })
              .circle(0, 0, radius).fill({ color: colors.main })
              .circle(-0.6, -0.8, radius * 0.48).fill({ color: colors.highlight, alpha: 0.75 });
          });
          poreSprites.forEach(({ pore, radius }) => {
            pore.clear()
              .circle(0.3, 0.5, radius + 0.7).fill({ color: colors.poreRing, alpha: 0.85 })
              .circle(0, 0, radius).fill({ color: colors.pore })
              .ellipse(-radius * 0.25, -radius * 0.3, radius * 0.52, radius * 0.35)
              .fill({ color: colors.poreDark, alpha: 0.78 })
              .circle(-radius * 0.32, -radius * 0.38, Math.max(0.4, radius * 0.16))
              .fill({ color: colors.highlight, alpha: 0.7 });
          });
          center.clear()
            .circle(0, 0.5, 9).fill({ color: colors.centerDark, alpha: 0.96 })
            .circle(-0.5, -0.25, 8.25).fill({ color: colors.center })
            .circle(0, 0.25, 8.5).stroke({ color: colors.highlight, width: 0.6, alpha: 0.55 });
          sheenShape.clear()
            .ellipse(-cellData.radius * 0.7, -cellData.radius * 0.25, 7, 13)
            .fill({ color: colors.highlight, alpha: 0.13 })
            .ellipse(-cellData.radius * 0.4, -cellData.radius * 0.45, 3, 7)
            .fill({ color: 0xffffff, alpha: 0.11 });

          renderGrowth(cellData.value);
          cellData.autoGrow = !emptyState;
          if (!emptyState) {
            cellData.targetValue = 99;
            if (!growingCells.includes(cellData)) growingCells.push(cellData);
          }
        };
        cellData.capture = (capturingTeam, capturingColors) => {
          if (isEmpty) cellData.setFaction(capturingTeam, capturingColors, false);
        };
        cellData.neutralize = () => {
          cellData.setFaction("neutral", neutralColors, true);
        };

        const initialValue = grows ? 1 : numericValue;
        renderGrowth(initialValue);
        cellData.value = initialValue;
        cellData.render = renderGrowth;
        cellData.autoGrow = grows;
        cellData.pendingIncoming = [];
        cellData.sendCursor = 0;
        if (grows && numericValue > initialValue) {
          cellData.targetValue = numericValue;
          growingCells.push(cellData);
        }

        cell.on("pointerdown", (event) => {
          pressedCell = cellData;
          selection.visible = true;
          drawConnectionPreview(event.global.x, event.global.y);
        });
        cell.on("pointerover", () => {
          if (!pressedCell || pressedCell === cellData) return;
          hoveredCell = cellData;
          targetHint.visible = true;
        });
        cell.on("pointerout", () => {
          if (hoveredCell !== cellData) return;
          hoveredCell = null;
          targetHint.visible = false;
        });
        cell.on("pointerup", () => {
          if (pressedCell && pressedCell !== cellData) {
            startConnection(pressedCell, cellData);
          }
          clearConnectionPreview();
        });
      }

      createCell(260, 300, "99", {
        shadow: 0x00150c, dark: 0x0b5e27, main: 0x54c92b, light: 0x69dc32,
        highlight: 0xc1f56a, outline: 0x173f1c, poreRing: 0x2b8e21,
        pore: 0x17641e, poreDark: 0x0a3c18, centerDark: 0x0a2c17, center: 0x163c1e,
      }, { team: "green" });
      createCell(400, 300, "0", {
        shadow: 0x11151a, dark: 0x424952, main: 0x737d88, light: 0x929ca7,
        highlight: 0xd2d9df, outline: 0x30363d, poreRing: 0x59616b,
        pore: 0x424952, poreDark: 0x272d34, centerDark: 0x15191e, center: 0x2b3138,
      }, { grows: false, empty: true, team: "neutral" });
      createCell(540, 300, "99", {
        shadow: 0x240506, dark: 0x852427, main: 0xd94343, light: 0xee5553,
        highlight: 0xff9a82, outline: 0x5d171b, poreRing: 0xb52f32,
        pore: 0x8f2025, poreDark: 0x581319, centerDark: 0x2d0a0c, center: 0x4c1719,
      }, { team: "red" });
      app.stage.addChild(slashGraphics);

      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
      app.stage.on("pointerdown", (event) => {
        if (event.target !== app.stage) return;
        slashActive = true;
        slashFade = 1;
        slashPoints = [{ x: event.global.x, y: event.global.y }];
        slashGraphics.alpha = 1;
        slashGraphics.clear();
      });
      app.stage.on("globalpointermove", (event) => {
        drawConnectionPreview(event.global.x, event.global.y);
        if (!slashActive) return;
        const lastPoint = slashPoints.at(-1);
        if (Math.hypot(event.global.x - lastPoint.x, event.global.y - lastPoint.y) < 3) return;
        slashPoints.push({ x: event.global.x, y: event.global.y });
        if (slashPoints.length > 50) slashPoints.shift();
        drawSlashTrail();
      });
      app.stage.on("pointerup", (event) => {
        if (slashActive) finishSlash();
        if (event.target === app.stage) {
          clearConnectionPreview();
        }
      });
      app.stage.on("pointerupoutside", () => {
        if (slashActive) finishSlash();
        clearConnectionPreview();
      });

      function runLogicTick() {
        logicTick += 1;

        cells.forEach((cell) => {
          const isBuildingConnection = connections.some((connection) => (
            connection.source === cell
            && !connection.retracting
            && connection.progress < 1
          ));
          if (cell.autoGrow && !isBuildingConnection && logicTick % 2 === 0 && cell.value < 99) {
            cell.value += 1;
            cell.render(cell.value);
          }

          const incoming = cell.pendingIncoming.shift();
          if (!incoming) return;
          if (cell.team === "neutral") {
            cell.capture(incoming.team, incoming.colors);
            cell.value = Math.min(99, cell.value + 1);
            cell.render(cell.value);
          } else if (cell.team === incoming.team) {
            cell.value = Math.min(99, cell.value + 1);
            cell.render(cell.value);
          } else if (Math.floor(cell.value) <= 1) {
            cell.value = 0;
            cell.neutralize();
            cell.capture(incoming.team, incoming.colors);
          } else {
            cell.value -= 1;
            cell.render(cell.value);
          }
        });

        // 每个源细胞每帧只选择一条已建立连接，避免多连接导致瞬时跳变。
        cells.forEach((cell) => {
          const outgoing = connections.filter((connection) => (
            connection.source === cell
            && !connection.retracting
            && connection.progress === 1
            && (connection.target.team !== cell.team || connection.target.value < 99)
          ));
          if (outgoing.length === 0 || cell.value < 1) return;

          const connection = outgoing[cell.sendCursor % outgoing.length];
          cell.sendCursor += 1;
          connection.energyPackets.push({
            distance: 0,
            team: cell.team,
            colors: { ...cell.colors },
          });
          cell.value -= 1;
          cell.render(cell.value);
        });
      }

      let elapsed = 0;
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaTime;

        if (!slashActive && slashFade > 0) {
          slashFade = Math.max(0, slashFade - ticker.deltaMS / 260);
          slashGraphics.alpha = slashFade;
          if (slashFade === 0) slashGraphics.clear();
        }

        cells.forEach((cell, index) => {
          if (cell.selection.visible) {
            cell.selection.alpha = 0.55 + Math.sin(elapsed * 0.08 + index) * 0.45;
          }
          if (cell.targetHint.visible) {
            cell.targetHint.alpha = 0.6 + Math.sin(elapsed * 0.1 + index) * 0.4;
          }
        });

        logicAccumulator += ticker.deltaMS;
        while (logicAccumulator >= logicInterval) {
          logicAccumulator -= logicInterval;
          runLogicTick();
        }

        connections.forEach((connection) => {
          syncConnectionEndpoints(connection);
          connection.time += ticker.deltaMS;
          if (connection.retracting) {
            connection.progress = Math.max(0, connection.progress - ticker.deltaMS / 650);
            const pathLength = Math.hypot(
              connection.endX - connection.startX,
              connection.endY - connection.startY,
            );
            const remainingBeads = connection.progress === 0
              ? 0
              : Math.floor((pathLength * connection.progress) / 6) + 1;
            const totalRefunded = connection.grownBeads - remainingBeads;
            const refund = totalRefunded - connection.refundedBeads;
            if (refund > 0) {
              connection.refundedBeads += refund;
              // 触手珠链收回到源细胞时，立即返还生成珠链所消耗的能量。
              connection.source.value = Math.min(99, connection.source.value + refund);
              connection.source.render(connection.source.value);
            }
          } else if (connection.progress < 1) {
            const pathLength = Math.hypot(
              connection.endX - connection.startX,
              connection.endY - connection.startY,
            );
            const desiredProgress = Math.min(1, connection.progress + ticker.deltaMS / 1800);
            const desiredBeads = Math.floor((pathLength * desiredProgress) / 6) + 1;
            const newBeads = Math.min(
              desiredBeads - connection.grownBeads,
              Math.floor(connection.source.value),
            );

            if (newBeads > 0) {
              connection.grownBeads += newBeads;
              connection.source.value -= newBeads;
              connection.source.render(connection.source.value);
            }

            if (connection.source.value < 1) {
              connection.retracting = true;
              connection.energyPackets = [];
            }

            // 未支付下一颗小细胞的能量前，触手只能前进到已生成珠链的末端。
            const affordableProgress = connection.grownBeads === 0
              ? 0
              : Math.min(1, (connection.grownBeads * 6 - 0.001) / pathLength);
            connection.progress = Math.min(desiredProgress, affordableProgress);
          } else {
            const pathLength = Math.hypot(
              connection.endX - connection.startX,
              connection.endY - connection.startY,
            );
            connection.energyPackets.forEach((packet) => {
              packet.distance += (ticker.deltaMS / 90) * 6;
            });
            connection.energyPackets = connection.energyPackets.filter((packet) => {
              if (packet.distance < pathLength) return true;
              connection.target.pendingIncoming.push(packet);
              return false;
            });
          }
          syncConnectionEndpoints(connection);
          drawConnection(connection);
        });
        for (let index = connections.length - 1; index >= 0; index -= 1) {
          if (!connections[index].retracting || connections[index].progress > 0) continue;
          connections[index].graphics.destroy();
          connections.splice(index, 1);
        }

        // 各突起错开摆动，避免整圈同步产生机械式呼吸感。
        animatedParts.forEach(({ bumpSprites, poreSprites, sheenShape, sheenRange, radius, detailScale }, cellIndex) => {
          bumpSprites.forEach((item) => {
            const angleDelta = Math.atan2(
              Math.sin(item.targetAngle - item.angle),
              Math.cos(item.targetAngle - item.angle),
            );
            item.angle += angleDelta * Math.min(1, ticker.deltaMS / 360);
            const sway = Math.sin(elapsed * 0.025 + item.phase + cellIndex) * 0.45;
            item.x = Math.cos(item.angle) * (radius + 1.5);
            item.y = Math.sin(item.angle) * (radius + 1.5);
            item.bump.position.set(
              item.x - Math.sin(item.angle) * sway,
              item.y + Math.cos(item.angle) * sway,
            );

            const target = item.targetVisible ? 1 : 0;
            item.appearance += (target - item.appearance) * Math.min(1, ticker.deltaMS / 180);
            item.bump.visible = item.appearance > 0.01;
            item.bump.alpha = item.appearance;
            item.bump.scale.set((0.45 + item.appearance * 0.55) * detailScale);
          });
          poreSprites.forEach((item) => {
            const angleDelta = Math.atan2(
              Math.sin(item.targetAngle - item.angle),
              Math.cos(item.targetAngle - item.angle),
            );
            item.angle += angleDelta * Math.min(1, ticker.deltaMS / 360);
            const ringRadius = (12 + radius - 4) / 2;
            item.pore.position.set(
              Math.cos(item.angle) * ringRadius,
              Math.sin(item.angle) * ringRadius,
            );

            const target = item.targetVisible ? 1 : 0;
            item.appearance += (target - item.appearance) * Math.min(1, ticker.deltaMS / 180);
            item.pore.visible = item.appearance > 0.01;
            item.pore.alpha = item.appearance;
            item.pore.scale.set((0.45 + item.appearance * 0.55) * detailScale);
          });
          sheenShape.x = Math.sin(elapsed * 0.008 + cellIndex) * sheenRange;
          sheenShape.y = Math.cos(elapsed * 0.006 + cellIndex) * sheenRange * 0.24;
          sheenShape.alpha = 0.8 + Math.sin(elapsed * 0.012 + cellIndex) * 0.2;
        });
      });
    }

    initPixi().catch((err) => {
      console.error("PixiJS 初始化失败", err);
    });

    return () => {
      destroyed = true;
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
        appRef.current = null;
      } else {
        // 如果 init 还没有完成就退出了，用 app 实例直接尝试安全销毁
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
      }
    };
  }, []);

  return (
    <GameLayout title="细胞扩张战争" icon="🦠" me={me} onLogout={onLogout} onOpenLogin={onOpenLogin}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ position: "relative", width: "800px", height: "600px" }}>
          <div
            ref={containerRef}
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid var(--border-light)",
              background: "#07080b",
              boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.9)",
              width: "800px",
              height: "600px",
            }}
          />
        </div>
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
