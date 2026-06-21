(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

  // 物理座標(x:0..,y:0..H 付近, y上向き) → SVG座標へ
  function makeMap(svg, geom, pad) {
    const vb = svg.viewBox.baseVal;
    const xs = [0, geom.B.x], ys = [0, geom.T.y, geom.B.y];
    const xmax = Math.max(...xs) * 1.15 || 1;
    const ymax = Math.max(...ys) * 1.15 || 1;
    const sx = (vb.width - 2 * pad) / xmax;
    const sy = (vb.height - 2 * pad) / ymax;
    const s = Math.min(sx, sy);
    return (x, y) => ({ X: pad + x * s, Y: vb.height - pad - y * s });
  }

  function drawSection(svg, ctx) {
    clear(svg);
    if (!ctx.wedge.valid) return;
    const g = ctx.wedge.geom;
    const m = makeMap(svg, g, 28);
    const O = m(g.O.x, g.O.y), T = m(g.T.x, g.T.y), B = m(g.B.x, g.B.y);
    svg.appendChild(el('polygon', {
      points: `${O.X},${O.Y} ${T.X},${T.Y} ${B.X},${B.Y}`,
      fill: '#ffe0b2', stroke: 'none',
    }));
    svg.appendChild(el('line', { x1: O.X, y1: O.Y, x2: T.X, y2: T.Y, stroke: '#234', 'stroke-width': 4 }));
    svg.appendChild(el('line', { x1: T.X, y1: T.Y, x2: B.X, y2: B.Y, stroke: '#386641', 'stroke-width': 2 }));
    svg.appendChild(el('line', { x1: O.X, y1: O.Y, x2: B.X, y2: B.Y, stroke: '#b00', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    const lbl = el('text', { x: O.X + 14, y: O.Y - 8, 'font-size': 13, fill: '#b00' });
    lbl.textContent = `ω=${ctx.omega}°`;
    svg.appendChild(lbl);
  }

  function drawAll(ctx) {
    drawSection(document.getElementById('sectionSvg'), ctx);
  }
  window.Render = { drawAll, drawSection };
})();
