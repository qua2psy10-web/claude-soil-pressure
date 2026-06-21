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

  function drawForcePolygon(svg, ctx) {
    clear(svg);
    if (!ctx.wedge.valid) return;
    const vecs = ctx.wedge.vectors; // V, C, R, P
    const vb = svg.viewBox.baseVal;
    let x = 0, y = 0;
    const pts = [{ x, y }];
    for (const v of vecs) { x += v.fx; y += v.fy; pts.push({ x, y }); }
    const xsArr = pts.map((p) => p.x), ysArr = pts.map((p) => p.y);
    const minX = Math.min(...xsArr), maxX = Math.max(...xsArr);
    const minY = Math.min(...ysArr), maxY = Math.max(...ysArr);
    const pad = 30;
    const sx = (vb.width - 2 * pad) / ((maxX - minX) || 1);
    const sy = (vb.height - 2 * pad) / ((maxY - minY) || 1);
    const s = Math.min(sx, sy);
    const map = (p) => ({ X: pad + (p.x - minX) * s, Y: vb.height - pad - (p.y - minY) * s });
    const colors = { V: '#234', C: '#386641', R: '#0066b3', P: '#b00' };
    for (let i = 0; i < vecs.length; i++) {
      const a = map(pts[i]), b = map(pts[i + 1]);
      svg.appendChild(el('line', { x1: a.X, y1: a.Y, x2: b.X, y2: b.Y, stroke: colors[vecs[i].label], 'stroke-width': 2.5 }));
      const t = el('text', { x: (a.X + b.X) / 2 + 4, y: (a.Y + b.Y) / 2, 'font-size': 12, fill: colors[vecs[i].label] });
      t.textContent = vecs[i].label;
      svg.appendChild(t);
    }
  }

  function drawAll(ctx) {
    drawSection(document.getElementById('sectionSvg'), ctx);
    drawForcePolygon(document.getElementById('polySvg'), ctx);
  }
  window.Render = { drawAll, drawSection, drawForcePolygon };
})();
