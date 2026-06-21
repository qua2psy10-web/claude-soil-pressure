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

  const api = { deg2rad, tanDeg, sinDeg, cosDeg, geometry };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TrialWedge = api;
})(typeof window !== 'undefined' ? window : globalThis);
