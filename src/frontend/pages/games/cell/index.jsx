import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import GameLayout from "../../../components/GameLayout";
import { createCellDrawers } from "./cellGraphics";
import { drawConnection, drawDetachedBurst } from "./connectionGraphics";
import {
  AUTO_GROWTH_INTERVAL,
  BEAD_SPACING,
  CUT_ATTACK_SPEED_MULTIPLIER,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_ENERGY,
} from "./gameConfig";
import { chooseAiMove } from "./aiController";
import { CELL_LEVELS } from "./levelConfigs";
import { drawConnectionPreview as drawConnectionPreviewGraphics, drawSlashTrail } from "./interactionGraphics";
import { getPathPoint, pointToSegmentDistance, syncConnectionEndpoints } from "./pathUtils";
import backgroundImage from "./background.png";

function mountCellGame(container, level, onGameEnd) {
    const app = new PIXI.Application();
    let destroyed = false;

    async function initPixi() {
      await app.init({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: 0x111820,
        antialias: true,
        // 960×540 场景在高分屏无需按完整设备倍率渲染，可显著降低像素填充压力。
        resolution: Math.min(window.devicePixelRatio || 1, 1.5),
        autoDensity: true,
      });
      const backgroundTexture = await PIXI.Assets.load(backgroundImage);

      if (destroyed) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          // 静默忽略
        }
        return;
      }

      container.appendChild(app.canvas);
      app.ticker.maxFPS = 60;

      const background = new PIXI.Sprite(backgroundTexture);
      const backgroundScale = Math.max(
        GAME_WIDTH / backgroundTexture.width,
        GAME_HEIGHT / backgroundTexture.height,
      );
      background.anchor.set(0.5);
      background.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      background.scale.set(backgroundScale);
      app.stage.addChild(background);

      const connectionLayer = new PIXI.Container();
      app.stage.addChild(connectionLayer);
      const previewGraphics = new PIXI.Graphics();
      connectionLayer.addChild(previewGraphics);
      const slashGraphics = new PIXI.Graphics();

      const animatedParts = [];
      const cells = [];
      const connections = [];
      const detachedBursts = [];
      // 输送速度是自增的两倍，因此逻辑帧间隔取自增间隔的一半。
      const logicInterval = AUTO_GROWTH_INTERVAL / 2;
      let logicAccumulator = 0;
      let logicTick = 0;
      let pressedCell = null;
      let hoveredCell = null;
      let previewRoute = null;
      let previewTarget = null;
      const queuedConnections = [];
      let slashActive = false;
      let slashPoints = [];
      let slashFade = 0;
      let aiAccumulator = 0;
      let gameResult = null;

      function retractConnection(connection) {
        if (connection.retracting) return;
        connection.retracting = true;
        connection.source.refundEnergy(connection.energyPackets.length);
        connection.energyPackets = [];
      }

      function finishSlash() {
        slashActive = false;
        slashFade = 1;
        connections.forEach((connection) => {
          if (connection.ownerTeam !== "green" || connection.retracting || connection.progress === 0) return;
          let hit = false;
          let cutRatio = 0;
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
                cutRatio = (pathIndex / pathSteps) * connection.progress;
                break;
              }
            }
            previousPathPoint = pathPoint;
          }

          if (hit) {
            const pathLength = Math.hypot(
              connection.endX - connection.startX,
              connection.endY - connection.startY,
            );
            const proximalBeads = Math.min(
              connection.grownBeads,
              Math.floor((pathLength * cutRatio) / BEAD_SPACING) + 1,
            );
            const burstPackets = [];
            const distalBeads = connection.grownBeads - proximalBeads;
            for (let index = 0; index < distalBeads; index += 1) {
              const distance = Math.max(pathLength * cutRatio, pathLength * connection.progress - index * BEAD_SPACING);
              burstPackets.push({
                ratio: distance / pathLength,
                source: connection.source,
                team: connection.source.team,
                colors: { ...connection.source.colors },
              });
            }
            connection.energyPackets.forEach((packet) => {
              const ratio = packet.distance / pathLength;
              if (ratio >= cutRatio) burstPackets.push({ ...packet, ratio });
              else packet.source.refundEnergy(1);
            });
            connection.energyPackets = [];

            if (burstPackets.length > 0) {
              const burst = {
                graphics: new PIXI.Graphics(),
                target: connection.target,
                pathLength,
                packets: burstPackets,
                getPoint: (ratio) => getPathPoint(connection, ratio),
              };
              detachedBursts.push(burst);
              connectionLayer.addChild(burst.graphics);
            }

            // 切点前的珠链按原收回动画返还，切点后的珠链脱离后继续进攻。
            connection.progress = cutRatio;
            connection.grownBeads = proximalBeads;
            connection.refundedBeads = 0;
            connection.retracting = true;
          }
        });
        for (let queueIndex = queuedConnections.length - 1; queueIndex >= 0; queueIndex -= 1) {
          const queued = queuedConnections[queueIndex];
          let hit = false;
          let previousPathPoint = getPathPoint(queued.route, 0);
          for (let pathIndex = 1; pathIndex <= 48 && !hit; pathIndex += 1) {
            const pathPoint = getPathPoint(queued.route, pathIndex / 48);
            for (let slashIndex = 1; slashIndex < slashPoints.length; slashIndex += 1) {
              if (
                pointToSegmentDistance(pathPoint, slashPoints[slashIndex - 1], slashPoints[slashIndex]) < 6
                || pointToSegmentDistance(slashPoints[slashIndex], previousPathPoint, pathPoint) < 6
              ) {
                hit = true;
                break;
              }
            }
            previousPathPoint = pathPoint;
          }
          if (!hit) continue;
          queued.graphics.destroy();
          queuedConnections.splice(queueIndex, 1);
        }
      }

      function clearConnectionPreview() {
        previewGraphics.clear();
        cells.forEach((item) => {
          item.selection.visible = false;
          item.targetHint.visible = false;
        });
        pressedCell = null;
        hoveredCell = null;
        previewRoute = null;
        previewTarget = null;
      }

      function chooseRoute(source, target) {
        const baseAngle = Math.atan2(target.y - source.y, target.x - source.x);
        const portOffsets = [0, 0.3, -0.3];
        const detours = [0, 32, -32, 64, -64];
        const connectionSamples = connections.map((connection) => ({
          connection,
          points: Array.from({ length: 12 }, (_, index) => getPathPoint(connection, (index + 1) / 13)),
        }));
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

              for (let step = 1; step < 21 && !blocked; step += 1) {
                const point = getPathPoint(route, step / 21);
                blocked = cells.some((cell) => {
                  if (cell === source || cell === target) return false;
                  return Math.hypot(point.x - cell.x, point.y - cell.y) <= cell.radius + 10;
                });
                if (blocked) break;

                connectionSamples.forEach(({ points }) => {
                  for (const otherPoint of points) {
                    const distance = Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y);
                    if (distance < 14) score += (14 - distance) ** 2 * 0.4;
                  }
                });
              }
              if (blocked) continue;

              connectionSamples.forEach(({ connection }) => {
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

      function drawConnectionPreview(pointerX, pointerY) {
        if (!pressedCell) {
          previewGraphics.clear();
          previewRoute = null;
          previewTarget = null;
          return;
        }
        previewTarget = hoveredCell || { x: pointerX, y: pointerY, radius: 4 };
        if (Math.hypot(previewTarget.x - pressedCell.x, previewTarget.y - pressedCell.y) <= pressedCell.radius) {
          previewGraphics.clear();
          previewRoute = null;
          previewTarget = null;
          return;
        }
        previewRoute = chooseRoute(pressedCell, previewTarget);
        drawConnectionPreviewGraphics(previewGraphics, pressedCell, previewRoute, Boolean(hoveredCell));
      }

      function startConnection(source, target, selectedRoute = null) {
        // 使用玩家确认时看到的路径，避免松手后重新选路导致预瞄造价失效。
        const route = selectedRoute || (previewTarget === target && previewRoute
          ? { ...previewRoute }
          : chooseRoute(source, target));
        if (!route) return;
        const pathLength = Math.hypot(route.endX - route.startX, route.endY - route.startY);

        connections.push({
          graphics: new PIXI.Graphics(),
          source,
          target,
          ownerTeam: source.team,
          progress: 0,
          requiredBeads: Math.floor(pathLength / BEAD_SPACING) + 1,
          grownBeads: 0,
          refundedBeads: 0,
          energyPackets: [],
          time: 0,
          ...route,
        });
        connectionLayer.addChild(connections.at(-1).graphics);
      }

      function createCell(x, y, text, colors, options = {}) {
        const { grows = true, empty = false, team = "neutral" } = options;
        let isEmpty = empty;
        const neutralColors = { ...colors };
        const numericValue = Math.min(MAX_ENERGY, Number(text));
        const cellRadius = Math.min(40, Math.max(16, 14 + Math.sqrt(numericValue) * 1.6));
        const detailRadius = 14 + Math.sqrt(60) * 1.6;
        const bumpCount = Math.round((Math.PI * 2 * detailRadius) / 8);
        const poreCount = Math.max(2, Math.round((detailRadius ** 2 - 9 ** 2) / 55));
        const {
          drawShadow, drawBody, drawBump, drawPore, drawCenter, drawSheen, drawHint,
        } = createCellDrawers(colors);

        const cell = new PIXI.Container();
        cell.position.set(x, y);
        cell.eventMode = "static";
        cell.cursor = "pointer";
        cell.hitArea = new PIXI.Circle(0, 0, Math.max(20, cellRadius + 5));

        const shadow = new PIXI.Graphics();
        drawShadow(shadow, cellRadius);
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
          const bump = new PIXI.Graphics();
          drawBump(bump, radius);
          bump.position.set(bumpX, bumpY);
          membrane.addChild(bump);
          bumpSprites.push({ bump, x: bumpX, y: bumpY, radius, angle, targetAngle: angle, phase: index * 0.83, appearance: 0, targetVisible: false });
        }

        const body = new PIXI.Graphics();
        drawBody(body, cellRadius);

        const sheen = new PIXI.Container();
        const sheenShape = new PIXI.Graphics();
        drawSheen(sheenShape, cellRadius);
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
          const pore = new PIXI.Graphics();
          drawPore(pore, radius);
          pore.position.set(poreX, poreY);
          pores.addChild(pore);
          poreSprites.push({ pore, radius, angle, targetAngle: angle, appearance: 0, targetVisible: false });
        }

        const center = new PIXI.Graphics();
        drawCenter(center, isEmpty);
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

        const selection = new PIXI.Graphics();
        drawHint(selection, cellRadius);
        selection.visible = false;
        const targetHint = new PIXI.Graphics();
        drawHint(targetHint, cellRadius, true);
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
          const currentBumpCount = Math.round((Math.PI * 2 * currentDetailRadius) / 8);
          const currentPoreCount = Math.max(2, Math.round((currentDetailRadius ** 2 - 9 ** 2) / 55));

          cellData.radius = radius;
          animatedPart.radius = radius;
          const radiusAtDetailLimit = 14 + Math.sqrt(60) * 1.6;
          animatedPart.detailScale = currentValue > 60 ? radius / radiusAtDetailLimit : 1;
          cell.hitArea = new PIXI.Circle(0, 0, Math.max(20, radius + 5));
          value.text = String(Math.floor(currentValue));
          value.visible = !isEmpty;

          drawShadow(shadow, radius);
          drawBody(body, radius);

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
          drawHint(selection, radius);
          drawHint(targetHint, radius, true);
        }

        cellData.setFaction = (nextTeam, capturingColors, emptyState) => {
          isEmpty = emptyState;
          cellData.team = nextTeam;
          Object.assign(colors, capturingColors);

          bumpSprites.forEach(({ bump, radius }) => drawBump(bump, radius));
          poreSprites.forEach(({ pore, radius }) => drawPore(pore, radius));
          drawCenter(center, isEmpty);
          drawSheen(sheenShape, cellData.radius);

          renderGrowth(cellData.value);
          cellData.autoGrow = !emptyState;
        };
        cellData.capture = (capturingTeam, capturingColors) => {
          if (isEmpty) cellData.setFaction(capturingTeam, capturingColors, false);
        };
        cellData.neutralize = () => {
          cellData.setFaction("neutral", neutralColors, true);
        };

        const initialValue = numericValue;
        renderGrowth(initialValue);
        cellData.value = initialValue;
        cellData.render = renderGrowth;
        cellData.changeValue = (delta) => {
          cellData.value = Math.max(0, Math.min(MAX_ENERGY, cellData.value + delta));
          cellData.render(cellData.value);
        };
        cellData.pendingRefund = 0;
        cellData.refundEnergy = (amount) => {
          const immediateRefund = Math.min(amount, MAX_ENERGY - cellData.value);
          if (immediateRefund > 0) cellData.changeValue(immediateRefund);
          cellData.pendingRefund += amount - immediateRefund;
        };
        cellData.autoGrow = grows;
        cellData.pendingIncoming = [];
        cellData.sendCursor = 0;
        cellData.defendingRetreat = false;

        cell.on("pointerdown", (event) => {
          if (gameResult || cellData.team !== "green") return;
          clearConnectionPreview();
          pressedCell = cellData;
          selection.visible = true;
          drawConnectionPreview(event.global.x, event.global.y);
        });
        cell.on("pointerover", (event) => {
          if (!pressedCell || pressedCell === cellData) return;
          hoveredCell = cellData;
          targetHint.visible = true;
          drawConnectionPreview(event.global.x, event.global.y);
        });
        cell.on("pointerout", (event) => {
          if (hoveredCell !== cellData) return;
          hoveredCell = null;
          targetHint.visible = false;
          drawConnectionPreview(event.global.x, event.global.y);
        });
        cell.on("pointerup", () => {
          if (pressedCell?.team === "green" && pressedCell !== cellData) {
            const route = previewRoute ? { ...previewRoute } : chooseRoute(pressedCell, cellData);
            if (route) {
              const pathLength = Math.hypot(route.endX - route.startX, route.endY - route.startY);
              const requiredBeads = Math.floor(pathLength / BEAD_SPACING) + 1;
              if (pressedCell.value >= requiredBeads) {
                startConnection(pressedCell, cellData, route);
              } else {
                // 能量不足时锁定本次操作，达到预瞄造价后自动执行。
                const queued = {
                  graphics: new PIXI.Graphics(),
                  source: pressedCell,
                  target: cellData,
                  route,
                  requiredBeads,
                };
                queuedConnections.push(queued);
                connectionLayer.addChild(queued.graphics);
                drawConnectionPreviewGraphics(
                  queued.graphics, pressedCell, route, true, requiredBeads,
                );
              }
            }
          }
          clearConnectionPreview();
        });
      }

      level.cells.forEach(({ x, y, value, colors, options }) => {
        // 阵营切换会改写颜色，实例必须复制一份，避免污染关卡配置和重开状态。
        createCell(x, y, value, { ...colors }, options);
      });
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
        drawSlashTrail(slashGraphics, slashPoints);
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
          if (cell.pendingRefund > 0 && cell.value < MAX_ENERGY) {
            const refund = Math.min(cell.pendingRefund, MAX_ENERGY - cell.value);
            cell.pendingRefund -= refund;
            cell.changeValue(refund);
          }

          const outgoingConnections = connections.filter((connection) => connection.source === cell);
          // 输出触手会占用细胞全部生产能力，完全收回后才恢复自增。
          if (cell.autoGrow && outgoingConnections.length === 0 && logicTick % 2 === 0 && cell.value < MAX_ENERGY) {
            cell.changeValue(1);
          }

          if (cell.pendingIncoming.length === 0) return;
          const hostileIncoming = cell.team !== "neutral"
            && cell.pendingIncoming.some((packet) => packet.team !== cell.team);
          const outgoing = connections.filter((connection) => (
            connection.source === cell && connection.progress > 0
          ));

          if (!cell.defendingRetreat && cell.value < 1 && hostileIncoming && outgoing.length > 0) {
            cell.defendingRetreat = true;
            outgoing.forEach((connection) => {
              retractConnection(connection);
            });
          }
          // 零能量时先完整收回触手，返还的珠链能量可用于抵消正在抵达的攻击。
          if (cell.defendingRetreat && outgoing.length > 0) return;
          cell.defendingRetreat = false;

          const incoming = cell.pendingIncoming.splice(0);
          const greenIncoming = incoming.filter((packet) => packet.team === "green");
          const redIncoming = incoming.filter((packet) => packet.team === "red");

          if (cell.team === "neutral") {
            const balance = greenIncoming.length - redIncoming.length;
            if (balance === 0) return;
            const winners = balance > 0 ? greenIncoming : redIncoming;
            cell.value = Math.abs(balance);
            cell.setFaction(winners[0].team, winners[0].colors, false);
            return;
          }

          const friendly = cell.team === "green" ? greenIncoming : redIncoming;
          const hostile = cell.team === "green" ? redIncoming : greenIncoming;
          const balance = cell.value + friendly.length - hostile.length;
          if (balance >= 0 || hostile.length === 0) {
            const nextValue = Math.min(MAX_ENERGY, balance);
            const overflow = Math.max(0, balance - MAX_ENERGY);
            if (overflow > 0) {
              friendly.slice(-overflow).forEach((packet) => packet.source.refundEnergy(1));
            }
            cell.value = nextValue;
            cell.render(nextValue);
            return;
          }

          // 同帧攻击统一净额结算，避免红绿输入按队列顺序导致阵营疯狂闪烁。
          cell.value = Math.abs(balance);
          cell.setFaction(hostile[0].team, hostile[0].colors, false);
        });

        // 每个源细胞每帧只选择一条已建立连接，避免多连接导致瞬时跳变。
        cells.forEach((cell) => {
          const outgoing = connections.filter((connection) => (
            connection.source === cell
            && !connection.retracting
            && connection.progress === 1
            && (connection.target.team !== cell.team || connection.target.value < MAX_ENERGY)
          ));
          if (outgoing.length === 0) return;

          const redirectedGrowth = logicTick % 2 === 0;
          if (!redirectedGrowth && cell.value < 1) return;

          const connection = outgoing[cell.sendCursor % outgoing.length];
          cell.sendCursor += 1;
          connection.energyPackets.push({
            distance: 0,
            source: cell,
            team: cell.team,
            colors: { ...cell.colors },
          });
          // 有输出触手时，自增能量直接进入触手；另一半输送速度才消耗细胞储备。
          if (!redirectedGrowth) cell.changeValue(-1);
        });
      }

      let elapsed = 0;
      app.ticker.add((ticker) => {
        elapsed += ticker.deltaTime;

        if (!gameResult) {
          aiAccumulator += ticker.deltaMS;
          if (aiAccumulator >= level.ai.thinkInterval) {
            aiAccumulator = 0;
            // 已完成占领的支援线不再长期占用 AI 来源细胞的自增能力。
            connections.forEach((connection) => {
              if (
                connection.source.team === "red"
                && connection.target.team === "red"
                && connection.progress === 1
                && connection.target.value >= level.ai.reserveEnergy
              ) {
                retractConnection(connection);
              }
            });
            const move = chooseAiMove(cells, connections, chooseRoute, level.ai);
            if (move) startConnection(move.source, move.target, move.route);
          }
        }

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

        for (let index = 0; index < queuedConnections.length; index += 1) {
          const queued = queuedConnections[index];
          const { source, target, route, requiredBeads } = queued;
          if (source.team !== "green") {
            queued.graphics.destroy();
            queuedConnections.splice(index, 1);
            index -= 1;
            continue;
          }

          route.startX = source.x + Math.cos(route.sourcePortAngle) * source.radius;
          route.startY = source.y + Math.sin(route.sourcePortAngle) * source.radius;
          route.endX = target.x - Math.cos(route.targetPortAngle) * target.radius;
          route.endY = target.y - Math.sin(route.targetPortAngle) * target.radius;
          const committedEnergy = connections.reduce((total, connection) => (
            connection.source === source && !connection.retracting && connection.progress < 1
              ? total + connection.requiredBeads - connection.grownBeads
              : total
          ), 0);
          const availableEnergy = Math.max(0, source.value - committedEnergy);
          drawConnectionPreviewGraphics(
            queued.graphics, source, route, true, requiredBeads, availableEnergy,
          );
          if (availableEnergy < requiredBeads) continue;

          startConnection(source, target, route);
          queued.graphics.destroy();
          queuedConnections.splice(index, 1);
          index -= 1;
        }

        connections.forEach((connection) => {
          syncConnectionEndpoints(connection);
          connection.time += ticker.deltaMS;
          const pathLength = Math.hypot(
            connection.endX - connection.startX,
            connection.endY - connection.startY,
          );
          if (connection.retracting) {
            connection.progress = Math.max(0, connection.progress - ticker.deltaMS / 650);
            const remainingBeads = connection.progress === 0
              ? 0
              : Math.floor((pathLength * connection.progress) / BEAD_SPACING) + 1;
            const totalRefunded = connection.grownBeads - remainingBeads;
            const refund = totalRefunded - connection.refundedBeads;
            if (refund > 0) {
              connection.refundedBeads += refund;
              // 触手珠链收回到源细胞时，立即返还生成珠链所消耗的能量。
              connection.source.refundEnergy(refund);
            }
          } else if (connection.progress < 1) {
            const desiredProgress = Math.min(1, connection.progress + ticker.deltaMS / 1800);
            const desiredBeads = Math.floor((pathLength * desiredProgress) / BEAD_SPACING) + 1;
            const newBeads = Math.min(
              Math.min(desiredBeads, connection.requiredBeads) - connection.grownBeads,
              Math.floor(connection.source.value),
            );

            if (newBeads > 0) {
              connection.grownBeads += newBeads;
              connection.source.changeValue(-newBeads);
            }

            // 刚好耗尽能量但珠链已经足够时仍可继续伸到终点。
            if (connection.source.value < 1 && connection.grownBeads < connection.requiredBeads) {
              retractConnection(connection);
            }

            // 未支付下一颗小细胞的能量前，触手只能前进到已生成珠链的末端。
            const affordableProgress = connection.grownBeads === connection.requiredBeads
              ? 1
              : connection.grownBeads === 0
              ? 0
              : Math.min(1, (connection.grownBeads * BEAD_SPACING - 0.001) / pathLength);
            connection.progress = Math.min(desiredProgress, affordableProgress);
          } else {
            connection.energyPackets.forEach((packet) => {
              packet.distance += (ticker.deltaMS / 90) * BEAD_SPACING;
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
        for (let index = detachedBursts.length - 1; index >= 0; index -= 1) {
          const burst = detachedBursts[index];
          const ratioStep = (
            ((ticker.deltaMS / 90) * BEAD_SPACING * CUT_ATTACK_SPEED_MULTIPLIER)
            / burst.pathLength
          );
          burst.packets.forEach((packet) => { packet.ratio += ratioStep; });
          burst.packets = burst.packets.filter((packet) => {
            if (packet.ratio < 1) return true;
            burst.target.pendingIncoming.push(packet);
            return false;
          });
          if (burst.packets.length > 0) {
            drawDetachedBurst(burst);
          } else {
            burst.graphics.destroy();
            detachedBursts.splice(index, 1);
          }
        }
        if (pressedCell && previewRoute) {
          // 路径保持不变时只重绘状态，使能量分段无需移动指针也能实时更新。
          previewRoute.startX = pressedCell.x
            + Math.cos(previewRoute.sourcePortAngle) * pressedCell.radius;
          previewRoute.startY = pressedCell.y
            + Math.sin(previewRoute.sourcePortAngle) * pressedCell.radius;
          previewRoute.endX = previewTarget.x
            - Math.cos(previewRoute.targetPortAngle) * previewTarget.radius;
          previewRoute.endY = previewTarget.y
            - Math.sin(previewRoute.targetPortAngle) * previewTarget.radius;
          drawConnectionPreviewGraphics(
            previewGraphics,
            pressedCell,
            previewRoute,
            Boolean(hoveredCell),
          );
        }
        for (let index = connections.length - 1; index >= 0; index -= 1) {
          if (!connections[index].retracting || connections[index].progress > 0) continue;
          connections[index].graphics.destroy();
          connections.splice(index, 1);
        }

        if (!gameResult) {
          const hasTeamEnergy = (team) => cells.some((cell) => cell.team === team)
            || cells.some((cell) => cell.pendingIncoming.some((packet) => packet.team === team))
            || connections.some((connection) => (
              connection.energyPackets.some((packet) => packet.team === team)
            ))
            || detachedBursts.some((burst) => burst.packets.some((packet) => packet.team === team));
          if (!hasTeamEnergy("red")) gameResult = "win";
          if (!hasTeamEnergy("green")) gameResult = "lose";
          if (gameResult) {
            queuedConnections.forEach((queued) => queued.graphics.destroy());
            queuedConnections.length = 0;
            clearConnectionPreview();
            onGameEnd(gameResult);
          }
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
      try {
        app.destroy(true, { children: true });
      } catch (e) {
        // 初始化尚未完成时，由 initPixi 中的 destroyed 分支负责销毁。
      }
    };
}

function CellEaterPage({ me, onLogout, onOpenLogin }) {
  const containerRef = useRef(null);
  const [levelIndex, setLevelIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [restartKey, setRestartKey] = useState(0);
  const level = CELL_LEVELS[levelIndex];

  useEffect(() => mountCellGame(containerRef.current, level, setResult), [level, restartKey]);

  function selectLevel(nextIndex) {
    setLevelIndex(nextIndex);
    setResult(null);
  }

  function restartLevel() {
    setResult(null);
    setRestartKey((value) => value + 1);
  }

  return (
    <GameLayout
      title="细胞扩张战争"
      icon="🦠"
      me={me}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      contentWidth={GAME_WIDTH}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div style={{ width: GAME_WIDTH, display: "flex", alignItems: "center", gap: "10px" }}>
          {CELL_LEVELS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === levelIndex ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => selectLevel(index)}
              style={{ padding: "7px 14px", fontSize: "12px" }}
            >
              第 {item.id} 关
            </button>
          ))}
          <span style={{ marginLeft: "6px", color: "var(--text-secondary)", fontSize: "13px" }}>
            {level.name} · {level.description}
          </span>
        </div>
        <div style={{ position: "relative", width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <div
            ref={containerRef}
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid var(--border-light)",
              background: "#07080b",
              boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.9)",
              width: GAME_WIDTH,
              height: GAME_HEIGHT,
            }}
          />
          {result && (
            <div
              style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "16px",
                background: "rgba(5, 8, 10, 0.72)", borderRadius: "16px",
              }}
            >
              <strong style={{ color: "white", fontSize: "32px" }}>
                {result === "win" ? "关卡胜利" : "菌落失守"}
              </strong>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" className="btn btn-ghost" onClick={restartLevel}>重新挑战</button>
                {result === "win" && levelIndex < CELL_LEVELS.length - 1 && (
                  <button type="button" className="btn btn-primary" onClick={() => selectLevel(levelIndex + 1)}>
                    下一关
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </GameLayout>
  );
}

export default CellEaterPage;
