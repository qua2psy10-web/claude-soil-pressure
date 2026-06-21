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

  function drawCurve(svg, ctx) {
    clear(svg);
    const s = ctx.sweepRes;
    if (!s.omegas.length) return;
    const vb = svg.viewBox.baseVal, pad = 34;
    const wMin = s.omegas[0], wMax = s.omegas[s.omegas.length - 1];
    const pMin = Math.min(0, ...s.Ps), pMax = Math.max(...s.Ps) || 1;
    const mapX = (w) => pad + (w - wMin) / ((wMax - wMin) || 1) * (vb.width - 2 * pad);
    const mapY = (P) => vb.height - pad - (P - pMin) / ((pMax - pMin) || 1) * (vb.height - 2 * pad);
    svg.appendChild(el('line', { x1: pad, y1: vb.height - pad, x2: vb.width - pad, y2: vb.height - pad, stroke: '#888' }));
    svg.appendChild(el('line', { x1: pad, y1: pad, x2: pad, y2: vb.height - pad, stroke: '#888' }));
    const ax = el('text', { x: vb.width - pad, y: vb.height - pad + 16, 'font-size': 11, fill: '#556', 'text-anchor': 'end' }); ax.textContent = 'ω (°)';
    const ay = el('text', { x: pad - 4, y: pad - 6, 'font-size': 11, fill: '#556' }); ay.textContent = 'P (kN/m)';
    svg.appendChild(ax); svg.appendChild(ay);
    let d = '';
    for (let i = 0; i < s.omegas.length; i++) d += (i ? 'L' : 'M') + mapX(s.omegas[i]) + ' ' + mapY(s.Ps[i]) + ' ';
    svg.appendChild(el('path', { d, fill: 'none', stroke: '#0066b3', 'stroke-width': 2 }));
    if (s.omegaCrit != null) {
      svg.appendChild(el('circle', { cx: mapX(s.omegaCrit), cy: mapY(s.PaRaw), r: 5, fill: '#b00' }));
      const t = el('text', { x: mapX(s.omegaCrit) + 6, y: mapY(s.PaRaw) - 6, 'font-size': 12, fill: '#b00', 'font-weight': 700 });
      t.textContent = `Pₐ=${s.Pa.toFixed(1)} (ω=${s.omegaCrit.toFixed(1)}°)`;
      svg.appendChild(t);
    }
    const cur = lookupP(s, ctx.omega);
    if (cur != null) svg.appendChild(el('circle', { cx: mapX(ctx.omega), cy: mapY(cur), r: 4, fill: '#234', stroke: '#fff' }));
  }
  function lookupP(s, omega) {
    let best = null, bd = Infinity;
    for (let i = 0; i < s.omegas.length; i++) {
      const d = Math.abs(s.omegas[i] - omega);
      if (d < bd) { bd = d; best = s.Ps[i]; }
    }
    return best;
  }

  function drawAll(ctx) {
    drawSection(document.getElementById('sectionSvg'), ctx);
    drawForcePolygon(document.getElementById('polySvg'), ctx);
    drawCurve(document.getElementById('curveSvg'), ctx);
  }
  window.Render = { drawAll, drawSection, drawForcePolygon, drawCurve };
})();
