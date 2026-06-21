(function (global) {
  const deg2rad = (d) => (d * Math.PI) / 180;
  const tanDeg = (d) => Math.tan(deg2rad(d));
  const sinDeg = (d) => Math.sin(deg2rad(d));
  const cosDeg = (d) => Math.cos(deg2rad(d));

  function geometry(p, omega) {
    const { H, beta } = p;
    const theta = p.theta || 0;
    const xT = H * tanDeg(theta);
    const lambda = Math.atan2(H, xT) * 180 / Math.PI; // 壁面の傾き角（度）
    if (!(omega > beta && omega < lambda)) return { valid: false };
    const xB = H * (1 - tanDeg(theta) * tanDeg(beta)) / (tanDeg(omega) - tanDeg(beta));
    if (!(xB > xT)) return { valid: false };
    const yB = xB * tanDeg(omega);
    const A = 0.5 * Math.abs(xT * yB - xB * H);
    const L = xB / cosDeg(omega);
    const Hw = Math.min(p.Hw || 0, H); // 水位（下端からの高さ、Hでクランプ）
    const cot = 1 / tanDeg(omega);
    const Aw = 0.5 * Hw * Hw * Math.abs(tanDeg(theta) - cot); // 水位以下のくさび面積
    return {
      valid: true,
      O: { x: 0, y: 0 },
      T: { x: xT, y: H },
      B: { x: xB, y: yB },
      xT, xB, yB, A, L, Aw,
    };
  }

  function solveWedge(p, omega) {
    const g = geometry(p, omega);
    if (!g.valid) return { valid: false };
    const { gamma, phi, delta, c, q } = p;

    const W = gamma * g.A;
    const Q = q * (g.xB - g.xT);
    const V = W + Q;
    const C = c * g.L;

    const rAng = omega + 90 - phi; // R の向き（度）
    const nWall = Math.atan2(-g.xT, p.H) * 180 / Math.PI; // 壁面法線角（度）
    const pAng = nWall + delta; // P の向き（度）

    const a1 = cosDeg(pAng), b1 = cosDeg(rAng), d1 = -C * cosDeg(omega);
    const a2 = sinDeg(pAng), b2 = sinDeg(rAng), d2 = V - C * sinDeg(omega);
    const det = a1 * b2 - a2 * b1;
    const P = (d1 * b2 - d2 * b1) / det;
    const R = (a1 * d2 - a2 * d1) / det;

    const vectors = [
      { label: 'V', fx: 0, fy: -V },
      { label: 'C', fx: C * cosDeg(omega), fy: C * sinDeg(omega) },
      { label: 'R', fx: R * cosDeg(rAng), fy: R * sinDeg(rAng) },
      { label: 'P', fx: P * cosDeg(pAng), fy: P * sinDeg(pAng) },
    ];

    return { valid: true, geom: g, W, Q, V, C, L: g.L, A: g.A, P, R, omega, vectors };
  }

  function rankineKa(phi) {
    const t = tanDeg(45 - phi / 2);
    return t * t;
  }

  function coulombKa(phi, delta, beta, theta) {
    const num = Math.pow(cosDeg(phi - theta), 2);
    const root = Math.sqrt(sinDeg(phi + delta) * sinDeg(phi - beta) / (cosDeg(delta + theta) * cosDeg(theta - beta)));
    const den = Math.pow(cosDeg(theta), 2) * cosDeg(delta + theta) * Math.pow(1 + root, 2);
    return num / den;
  }

  function sweep(p, opts = {}) {
    const step = opts.step || 0.25;
    const eps = 0.001;
    const omegas = [];
    const Ps = [];
    let Pa = -Infinity;
    let omegaCrit = null;
    for (let w = p.beta + step; w < 90 - eps; w += step) {
      const r = solveWedge(p, w);
      if (!r.valid) continue;
      omegas.push(w);
      Ps.push(r.P);
      if (r.P > Pa) { Pa = r.P; omegaCrit = w; }
    }
    return { omegas, Ps, Pa: Math.max(Pa, 0), PaRaw: Pa, omegaCrit };
  }

  const api = { deg2rad, tanDeg, sinDeg, cosDeg, geometry, solveWedge, rankineKa, coulombKa, sweep };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TrialWedge = api;
})(typeof window !== 'undefined' ? window : globalThis);
