/**
 * 通关烟花：拖尾粒子 canvas 动画（不拦截指针）
 * @param {HTMLCanvasElement} canvas
 * @param {{ width: number, height: number }} size
 * @returns {() => void} stop / cleanup
 */
export function startWinFireworks(canvas, { width, height }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const TRAIL_SPARK = 56;
  const TRAIL_ROCKET = 18;

  /**
   * @typedef {{
   *   x:number, y:number, vx:number, vy:number,
   *   life:number, max:number, color:string, size:number,
   *   trail:{x:number,y:number}[], kind:'spark'|'rocket', trailMax:number
   * }} FxParticle
   */
  /** @type {FxParticle[]} */
  const particles = [];
  const palette = [
    "#54c92b", "#7ae04a", "#b8ff6a",
    "#6ecbff", "#4da3ff", "#a78bfa",
    "#ff6b9d", "#ff8c2a", "#ffd54a",
    "#ff5c5c", "#00e5c3", "#ffffff",
  ];
  let lastRocket = 0;
  let rocketCount = 0;
  let raf = 0;
  let running = true;
  let lastTs = performance.now();
  const start = lastTs;

  function pickColor() {
    return palette[Math.floor(Math.random() * palette.length)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {string} color
   * @param {number} max
   * @param {number} size
   * @param {'spark'|'rocket'} kind
   */
  function addParticle(x, y, vx, vy, color, max, size, kind) {
    const trailMax = kind === "spark" ? TRAIL_SPARK : TRAIL_ROCKET;
    particles.push({
      x, y, vx, vy,
      life: 0,
      max,
      color,
      size,
      trail: [{ x, y }],
      kind,
      trailMax,
    });
  }

  /** 集中在画面正中，不要散太开 */
  function burstOrigin() {
    const cx = width * 0.5 + (Math.random() - 0.5) * 160;
    const cy = height * 0.5 + (Math.random() - 0.5) * 70;
    return { cx, cy };
  }

  function spawnRocket() {
    const { cx, cy } = burstOrigin();
    const x = cx + (Math.random() - 0.5) * 24;
    const y = height + 8;
    const color = pickColor();
    const rise = Math.max(3.6, (y - cy) / 48 + Math.random() * 0.4);
    addParticle(
      x,
      y,
      (cx - x) * 0.02,
      -rise,
      color,
      900 + Math.random() * 300,
      2,
      "rocket",
    );
  }

  /**
   * @param {number} cx
   * @param {number} cy
   * @param {string} [baseColor]
   * @param {number} [power]
   */
  function spawnBurst(cx, cy, baseColor, power = 1) {
    const n = Math.floor(28 + 22 * power);
    const main = baseColor || pickColor();
    for (let i = 0; i < n; i += 1) {
      const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.25;
      const sp = (1.0 + Math.random() * 2.2) * power;
      const color = Math.random() < 0.4 ? main : pickColor();
      addParticle(
        cx,
        cy,
        Math.cos(a) * sp,
        Math.sin(a) * sp,
        color,
        900 + Math.random() * 700,
        0.85 + Math.random() * 0.9,
        "spark",
      );
    }
    for (let i = 0; i < 6; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.2 + Math.random() * 0.8;
      addParticle(
        cx, cy,
        Math.cos(a) * sp, Math.sin(a) * sp,
        pickColor(),
        400 + Math.random() * 300,
        0.65 + Math.random() * 0.5,
        "spark",
      );
    }
  }

  /**
   * @param {FxParticle} p
   * @param {number} alpha
   */
  function drawThinTrail(p, alpha) {
    const pts = p.trail;
    if (pts.length < 2) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.color;

    for (let i = 1; i < pts.length; i += 1) {
      const t = i / (pts.length - 1);
      const w = 0.35 + t * 1.05;
      ctx.globalAlpha = alpha * (0.08 + t * t * 0.85);
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }

  /**
   * @param {FxParticle} p
   * @param {number} prevX
   * @param {number} prevY
   */
  function pushTrail(p, prevX, prevY) {
    const dist = Math.hypot(p.x - prevX, p.y - prevY);
    const steps = Math.max(1, Math.min(5, Math.ceil(dist / 2.4)));
    for (let s = 1; s <= steps; s += 1) {
      const u = s / steps;
      p.trail.push({
        x: prevX + (p.x - prevX) * u,
        y: prevY + (p.y - prevY) * u,
      });
    }
    while (p.trail.length > p.trailMax) p.trail.shift();
  }

  /** @param {number} now */
  function frame(now) {
    if (!running) return;
    const dt = Math.min(32, now - lastTs);
    lastTs = now;
    const t = now - start;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);

    // 总共只放 5 发，间隔稍开，集中绽放
    if (rocketCount < 5 && now - lastRocket > 520) {
      lastRocket = now;
      rocketCount += 1;
      spawnRocket();
    }

    ctx.globalCompositeOperation = "lighter";

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      const prevX = p.x;
      const prevY = p.y;
      p.life += dt;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      if (p.kind === "rocket") {
        p.vy += 0.012 * (dt / 16);
        p.vx *= 0.995;
        if (Math.random() < 0.55) {
          addParticle(
            p.x + (Math.random() - 0.5) * 1.5,
            p.y + 3,
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.9 + 0.2,
            p.color,
            160 + Math.random() * 140,
            0.6 + Math.random() * 0.4,
            "spark",
          );
        }
        if (p.vy >= -0.35 || p.life >= p.max * 0.92) {
          spawnBurst(p.x, p.y, p.color, 0.95 + Math.random() * 0.4);
          particles.splice(i, 1);
          continue;
        }
      } else {
        p.vy += 0.022 * (dt / 16);
        p.vx *= 0.994;
        p.vy *= 0.996;
      }

      pushTrail(p, prevX, prevY);

      const k = 1 - p.life / p.max;
      if (k <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const alpha = Math.min(1, k) * (p.kind === "rocket" ? 1 : 0.9);
      drawThinTrail(p, alpha);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const headR = p.kind === "rocket" ? 1.6 : (0.7 + k * 0.55);
      ctx.beginPath();
      ctx.arc(p.x, p.y, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.65;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, headR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (t > 12000 && particles.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  ctx.clearRect(0, 0, width, height);
  lastRocket = performance.now() - 520;
  raf = requestAnimationFrame(frame);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
  };
}
