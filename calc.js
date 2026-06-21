(function (global) {
  const deg2rad = (d) => (d * Math.PI) / 180;
  const tanDeg = (d) => Math.tan(deg2rad(d));
  const sinDeg = (d) => Math.sin(deg2rad(d));
  const cosDeg = (d) => Math.cos(deg2rad(d));

  function geometry(p, omega) {
    const { H, beta } = p;
    if (!(omega > beta && omega < 90)) return { valid: false };
    const xB = H / (tanDeg(omega) - tanDeg(beta));
    const yB = xB * tanDeg(omega);
    const A = 0.5 * xB * H;
    const L = xB / cosDeg(omega);
    return {
      valid: true,
      O: { x: 0, y: 0 },
      T: { x: 0, y: H },
      B: { x: xB, y: yB },
      xB, yB, A, L,
    };
  }

  function solveWedge(p, omega) {
    const g = geometry(p, omega);
    if (!g.valid) return { valid: false };
    const { gamma, phi, delta, c, q } = p;

    const W = gamma * g.A;
    const Q = q * g.xB;
    const V = W + Q;
    const C = c * g.L;

    const rAng = omega + 90 - phi; // R の向き（度）
    const a1 = cosDeg(delta), b1 = cosDeg(rAng), d1 = -C * cosDeg(omega);
    const a2 = sinDeg(delta), b2 = sinDeg(rAng), d2 = V - C * sinDeg(omega);
    const det = a1 * b2 - a2 * b1;
    const P = (d1 * b2 - d2 * b1) / det;
    const R = (a1 * d2 - a2 * d1) / det;

    const vectors = [
      { label: 'V', fx: 0, fy: -V },
      { label: 'C', fx: C * cosDeg(omega), fy: C * sinDeg(omega) },
      { label: 'R', fx: R * cosDeg(rAng), fy: R * sinDeg(rAng) },
      { label: 'P', fx: P * cosDeg(delta), fy: P * sinDeg(delta) },
    ];

    return { valid: true, geom: g, W, Q, V, C, L: g.L, A: g.A, P, R, omega, vectors };
  }

  function rankineKa(phi) {
    const t = tanDeg(45 - phi / 2);
    return t * t;
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

  const api = { deg2rad, tanDeg, sinDeg, cosDeg, geometry, solveWedge, rankineKa, sweep };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TrialWedge = api;
})(typeof window !== 'undefined' ? window : globalThis);
