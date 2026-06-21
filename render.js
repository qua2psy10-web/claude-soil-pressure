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
    const xs = [0, geom.T.x, geom.B.x], ys = [0, geom.T.y, geom.B.y];
    const xmin = Math.min(...xs), xmax = Math.max(...xs);
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    const xspan = (xmax - xmin) * 1.1 || 1;
    const yspan = (ymax - ymin) * 1.1 || 1;
    const s = Math.min((vb.width - 2 * pad) / xspan, (vb.height - 2 * pad) / yspan);
    return (x, y) => ({ X: pad + (x - xmin) * s, Y: vb.height - pad - (y - ymin) * s });
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
    // 低ω域で P が大きな負値（主働状態が成立しない領域、表示上は 0 にクランプ）
    // になりy軸が潰れるのを防ぐため、表示域を 0〜最大 に固定する。
    const pMin = 0, pMax = Math.max(...s.Ps) || 1;
    const mapX = (w) => pad + (w - wMin) / ((wMax - wMin) || 1) * (vb.width - 2 * pad);
    const mapY = (P) => vb.height - pad - (P - pMin) / ((pMax - pMin) || 1) * (vb.height - 2 * pad);
    svg.appendChild(el('line', { x1: pad, y1: vb.height - pad, x2: vb.width - pad, y2: vb.height - pad, stroke: '#888' }));
    svg.appendChild(el('line', { x1: pad, y1: pad, x2: pad, y2: vb.height - pad, stroke: '#888' }));
    const ax = el('text', { x: vb.width - pad, y: vb.height - pad + 16, 'font-size': 11, fill: '#556', 'text-anchor': 'end' }); ax.textContent = 'ω (°)';
    const ay = el('text', { x: pad - 4, y: pad - 6, 'font-size': 11, fill: '#556' }); ay.textContent = 'P (kN/m)';
    svg.appendChild(ax); svg.appendChild(ay);
    let d = '';
    for (let i = 0; i < s.omegas.length; i++) d += (i ? 'L' : 'M') + mapX(s.omegas[i]) + ' ' + mapY(Math.max(s.Ps[i], 0)) + ' ';
    svg.appendChild(el('path', { d, fill: 'none', stroke: '#0066b3', 'stroke-width': 2 }));
    if (s.omegaCrit != null) {
      svg.appendChild(el('circle', { cx: mapX(s.omegaCrit), cy: mapY(s.PaRaw), r: 5, fill: '#b00' }));
      const t = el('text', { x: mapX(s.omegaCrit) + 6, y: mapY(s.PaRaw) - 6, 'font-size': 12, fill: '#b00', 'font-weight': 700 });
      t.textContent = `Pₐ=${s.Pa.toFixed(1)} (ω=${s.omegaCrit.toFixed(1)}°)`;
      svg.appendChild(t);
    }
    const cur = lookupP(s, ctx.omega);
    if (cur != null) svg.appendChild(el('circle', { cx: mapX(ctx.omega), cy: mapY(Math.max(cur, 0)), r: 4, fill: '#234', stroke: '#fff' }));
  }
  function lookupP(s, omega) {
    let best = null, bd = Infinity;
    for (let i = 0; i < s.omegas.length; i++) {
      const d = Math.abs(s.omegas[i] - omega);
      if (d < bd) { bd = d; best = s.Ps[i]; }
    }
    return best;
  }

  function explain(div, ctx) {
    const w = ctx.wedge;
    if (!w.valid) { div.innerHTML = '<p style="color:#b00">この ω では有効なくさびになりません（β &lt; ω &lt; 90 にしてください）。</p>'; return; }
    const g = w.geom, p = ctx.p, o = ctx.omega;
    const f = (n) => Number(n).toFixed(2);
    div.innerHTML = `
      <ol style="font-size:13px;line-height:1.7;padding-left:18px">
        <li><b>くさびの幾何</b>：すべり面長 L = xB/cosω = ${f(g.xB)}/cos${o}° = <b>${f(g.L)} m</b>、面積 A = ½·xB·H = <b>${f(g.A)} m²</b></li>
        <li><b>自重 W</b> = γ·A = ${f(p.gamma)}×${f(g.A)} = <b>${f(w.W)} kN/m</b>${p.q ? `、上載 Q = q·xB = ${f(w.Q)} kN/m` : ''}（合計鉛直 V = <b>${f(w.V)} kN/m</b>）</li>
        <li><b>粘着力 C</b> = c·L = ${f(p.c)}×${f(g.L)} = <b>${f(w.C)} kN/m</b></li>
        <li><b>力のつり合い</b>（V・C・R・P の多角形が閉じる）から <b>P = ${f(w.P)} kN/m</b>（反力 R = ${f(w.R)} kN/m）</li>
        <li><b>試行</b>：ω を変えると右上の P–ω 曲線が動きます。最大の P が<b>主働土圧 Pₐ</b>です。</li>
      </ol>
      <p style="font-size:12px;color:#556">現在の最大：Pₐ = <b>${ctx.sweepRes.Pa.toFixed(2)} kN/m</b>（臨界 ω = ${ctx.sweepRes.omegaCrit?.toFixed(1)}°、作用位置 = 下端から H/3 = ${(p.H / 3).toFixed(2)} m）</p>`;
  }

  function drawAll(ctx) {
    drawSection(document.getElementById('sectionSvg'), ctx);
    drawForcePolygon(document.getElementById('polySvg'), ctx);
    drawCurve(document.getElementById('curveSvg'), ctx);
    explain(document.getElementById('explain'), ctx);
  }
  window.Render = { drawAll, drawSection, drawForcePolygon, drawCurve, explain };
})();
