export function createCellDrawers(colors) {
  function drawShadow(graphics, radius) {
    graphics.clear().ellipse(2, 3, radius + 4, radius + 3)
      .fill({ color: colors.shadow, alpha: 0.55 });
  }

  function drawBody(graphics, radius) {
    graphics.clear()
      .circle(1, 1.5, radius).fill({ color: colors.shadow })
      .circle(0, 0, radius).fill({ color: colors.main })
      .circle(-1.5, -2, radius - 2.5).fill({ color: colors.light })
      .ellipse(-radius * 0.25, -radius * 0.35, radius * 0.58, radius * 0.42)
      .fill({ color: colors.highlight, alpha: 0.34 })
      .circle(0, 0, radius).stroke({ color: colors.outline, width: 1.2, alpha: 0.85 })
      .circle(0, 0, radius - 1.8).stroke({ color: colors.highlight, width: 0.8, alpha: 0.62 });
  }

  function drawBump(graphics, radius) {
    graphics.clear()
      .circle(0.6, 0.8, radius + 0.8).fill({ color: colors.dark })
      .circle(0, 0, radius).fill({ color: colors.main })
      .circle(-0.6, -0.8, radius * 0.48).fill({ color: colors.highlight, alpha: 0.75 });
  }

  function drawPore(graphics, radius) {
    graphics.clear()
      .circle(0.3, 0.5, radius + 0.7).fill({ color: colors.poreRing, alpha: 0.85 })
      .circle(0, 0, radius).fill({ color: colors.pore })
      .ellipse(-radius * 0.25, -radius * 0.3, radius * 0.52, radius * 0.35)
      .fill({ color: colors.poreDark, alpha: 0.78 })
      .circle(-radius * 0.32, -radius * 0.38, Math.max(0.4, radius * 0.16))
      .fill({ color: colors.highlight, alpha: 0.7 });
  }

  function drawCenter(graphics, empty = false) {
    graphics.clear();
    if (empty) {
      // 中立细胞用深色空腔和厚边缘表现“尚未被占领”。
      graphics
        .circle(0.8, 1.2, 11).fill({ color: colors.shadow, alpha: 0.82 })
        .circle(0, 0, 10).fill({ color: colors.centerDark })
        .circle(0, 0.4, 6.6).fill({ color: 0x090c10 })
        .ellipse(-2.5, -3, 4.8, 2.4).fill({ color: colors.highlight, alpha: 0.18 })
        .circle(0, 0, 9.2).stroke({ color: colors.highlight, width: 1.3, alpha: 0.42 });
      return;
    }
    graphics
      .circle(0, 0.5, 9).fill({ color: colors.centerDark, alpha: 0.96 })
      .circle(-0.5, -0.25, 8.25).fill({ color: colors.center })
      .circle(0, 0.25, 8.5).stroke({ color: colors.highlight, width: 0.6, alpha: 0.55 });
  }

  function drawSheen(graphics, radius) {
    graphics.clear()
      .ellipse(-radius * 0.7, -radius * 0.25, 7, 13).fill({ color: colors.highlight, alpha: 0.13 })
      .ellipse(-radius * 0.4, -radius * 0.45, 3, 7).fill({ color: 0xffffff, alpha: 0.11 });
  }

  function drawHint(graphics, radius, target = false) {
    graphics.clear()
      .circle(0, 0, radius).stroke({ color: colors.highlight, width: target ? 11 : 9, alpha: target ? 0.38 : 0.32 })
      .circle(0, 0, radius).stroke({ color: colors.highlight, width: target ? 6 : 5, alpha: target ? 0.7 : 0.58 })
      .circle(0, 0, radius).stroke({ color: 0xffffff, width: target ? 2.2 : 1.8, alpha: target ? 1 : 0.95 });
  }

  return { drawShadow, drawBody, drawBump, drawPore, drawCenter, drawSheen, drawHint };
}
