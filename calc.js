(function (global) {
  const deg2rad = (d) => (d * Math.PI) / 180;
  const tanDeg = (d) => Math.tan(deg2rad(d));
  const sinDeg = (d) => Math.sin(deg2rad(d));
  const cosDeg = (d) => Math.cos(deg2rad(d));

  const api = { deg2rad, tanDeg, sinDeg, cosDeg };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TrialWedge = api;
})(typeof window !== 'undefined' ? window : globalThis);
