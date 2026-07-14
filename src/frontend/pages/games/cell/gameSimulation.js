import {
  BEAD_SPACING,
  LARGE_CELL_GROWTH_MULTIPLIER,
  LARGE_CELL_THRESHOLD,
  MAX_ENERGY,
  TRANSFER_HIGH_DIFFERENCE,
  TRANSFER_MEDIUM_DIFFERENCE,
} from "./gameConfig";

function getTransferSpeed(difference) {
  if (difference > TRANSFER_HIGH_DIFFERENCE) return 3;
  if (difference > TRANSFER_MEDIUM_DIFFERENCE) return 2;
  return difference > 0 ? 1 : 0;
}

export function createConnectionState() {
  return {
    energyPackets: [],
    transferAccumulator: 0,
    transferReverse: null,
    hostileForwardAccumulator: 0,
    hostileReverseAccumulator: 0,
    flowing: false,
    visualReverse: false,
  };
}

function resolveIncomingEnergy(cell, connections, retractConnection) {
  if (cell.pendingIncoming.length === 0) return;
  const hostileIncoming = cell.team !== "neutral"
    && cell.pendingIncoming.some((packet) => packet.team !== cell.team);
  const retractableOutgoing = connections.filter((connection) => (
    connection.source === cell
    && connection.progress > 0
    && !connection.retracting
  ));

  if (!cell.defendingRetreat && cell.value < 1 && hostileIncoming && retractableOutgoing.length > 0) {
    cell.defendingRetreat = true;
    retractableOutgoing.forEach(retractConnection);
    // 只留一个逻辑帧开始返还能量，不能在完整撤回期间免疫攻击。
    return;
  }
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
  if (balance > 0 || hostile.length === 0) {
    const nextValue = Math.min(MAX_ENERGY, balance);
    const overflow = Math.max(0, balance - MAX_ENERGY);
    if (overflow > 0) {
      friendly.slice(-overflow).forEach((packet) => packet.source.refundEnergy(1));
    }
    cell.value = nextValue;
    cell.render(nextValue);
    return;
  }

  if (balance === 0) {
    cell.value = 0;
    cell.neutralize();
    return;
  }

  // 同帧统一按净额结算，避免输入顺序导致阵营闪烁。
  cell.value = Math.abs(balance);
  cell.setFaction(hostile[0].team, hostile[0].colors, false);
}

function addPackets(connection, sender, reverse, speed, count) {
  sender.changeValue(-count);
  for (let index = 0; index < count; index += 1) {
    connection.energyPackets.push({
      distance: 0,
      reverse,
      travelSpeed: speed / 3,
      source: sender,
      team: sender.team,
      colors: { ...sender.colors },
    });
  }
}

function sendHostilePackets(connection, sender, reverse, rate, speed, accumulatorKey) {
  connection[accumulatorKey] += rate / 2;
  const count = Math.min(
    Math.floor(connection[accumulatorKey]),
    Math.floor(sender.value),
  );
  if (count === 0) return;
  connection[accumulatorKey] -= count;
  addPackets(connection, sender, reverse, speed, count);
}

function updateConnectionTransfer(connection) {
  connection.flowing = false;
  if (connection.retracting || connection.progress !== 1) return;

  const friendly = connection.source.team === connection.target.team;
  const mutualHostile = !friendly
    && connection.source.team !== "neutral"
    && connection.target.team !== "neutral";

  if (mutualHostile) {
    const difference = Math.abs(connection.source.value - connection.target.value);
    const advantageSpeed = getTransferSpeed(difference);
    const travelSpeed = Math.max(1, advantageSpeed);
    const sourceRate = 1 + (connection.source.value > connection.target.value ? advantageSpeed : 0);
    const targetRate = 1 + (connection.target.value > connection.source.value ? advantageSpeed : 0);

    // 敌对双方共用管道：基础输出互相抵消，能量优势形成额外推进。
    sendHostilePackets(
      connection, connection.source, false, sourceRate, travelSpeed, "hostileForwardAccumulator",
    );
    sendHostilePackets(
      connection, connection.target, true, targetRate, travelSpeed, "hostileReverseAccumulator",
    );
    connection.flowing = connection.source.value > 0
      || connection.target.value > 0
      || connection.energyPackets.length > 0;
    return;
  }

  // 友方可即时掉头；连接中立目标时保持建立时的单向占领。
  const reverse = friendly && connection.target.value > connection.source.value;
  const sender = reverse ? connection.target : connection.source;
  const receiver = reverse ? connection.source : connection.target;
  const difference = sender.value - receiver.value;
  if (difference <= 0 || receiver.value >= MAX_ENERGY) {
    connection.transferAccumulator = 0;
    return;
  }

  connection.flowing = true;
  connection.visualReverse = reverse;
  if (connection.transferReverse !== reverse) {
    connection.transferAccumulator = 0;
    connection.transferReverse = reverse;
  }

  const speed = getTransferSpeed(difference);
  connection.transferAccumulator += speed / 2;
  const count = Math.min(
    Math.floor(connection.transferAccumulator),
    Math.floor(sender.value),
    Math.ceil(difference / 2),
  );
  if (count === 0) return;
  connection.transferAccumulator -= count;
  addPackets(connection, sender, reverse, speed, count);
}

export function runGameLogic({ cells, connections, logicTick, retractConnection }) {
  const nextLogicTick = logicTick + 1;

  cells.forEach((cell) => {
    if (cell.pendingRefund > 0 && cell.value < MAX_ENERGY) {
      const refund = Math.min(cell.pendingRefund, MAX_ENERGY - cell.value);
      cell.pendingRefund -= refund;
      cell.changeValue(refund);
    }

    if (cell.autoGrow && nextLogicTick % 2 === 0 && cell.value < MAX_ENERGY) {
      const growth = cell.value > LARGE_CELL_THRESHOLD ? LARGE_CELL_GROWTH_MULTIPLIER : 1;
      cell.changeValue(growth);
    }
    resolveIncomingEnergy(cell, connections, retractConnection);
  });

  connections.forEach(updateConnectionTransfer);
  return nextLogicTick;
}

export function advanceEnergyPackets(connection, deltaMS, pathLength) {
  connection.energyPackets.forEach((packet) => {
    packet.distance += (deltaMS / 90) * BEAD_SPACING * packet.travelSpeed;
  });

  const consumed = new Set();
  connection.energyPackets.forEach((forwardPacket, forwardIndex) => {
    if (forwardPacket.reverse || consumed.has(forwardIndex)) return;
    const forwardRatio = forwardPacket.distance / pathLength;
    const reverseIndex = connection.energyPackets.findIndex((reversePacket, index) => (
      reversePacket.reverse
      && reversePacket.team !== forwardPacket.team
      && !consumed.has(index)
      && forwardRatio >= 1 - reversePacket.distance / pathLength
    ));
    if (reverseIndex < 0) return;
    // 敌对能量在管道内相遇后同时消失，能量已从两端扣除。
    consumed.add(forwardIndex);
    consumed.add(reverseIndex);
  });

  if (consumed.size > 0) {
    connection.energyPackets = connection.energyPackets.filter((_, index) => !consumed.has(index));
  }
  connection.energyPackets = connection.energyPackets.filter((packet) => {
    if (packet.distance < pathLength) return true;
    const receiver = packet.reverse ? connection.source : connection.target;
    receiver.pendingIncoming.push(packet);
    return false;
  });
}

export function hasTeamEnergy(team, cells, connections, detachedBursts) {
  return cells.some((cell) => cell.team === team)
    || cells.some((cell) => cell.pendingIncoming.some((packet) => packet.team === team))
    || connections.some((connection) => (
      connection.energyPackets.some((packet) => packet.team === team)
    ))
    || detachedBursts.some((burst) => burst.packets.some((packet) => packet.team === team));
}
