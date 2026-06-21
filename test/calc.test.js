const test = require('node:test');
const assert = require('node:assert');
const TW = require('../calc.js');

test('deg2rad converts degrees to radians', () => {
  assert.ok(Math.abs(TW.deg2rad(180) - Math.PI) < 1e-9);
  assert.ok(Math.abs(TW.deg2rad(0)) < 1e-9);
});

test('tanDeg computes tangent of degrees', () => {
  assert.ok(Math.abs(TW.tanDeg(45) - 1) < 1e-9);
  assert.ok(Math.abs(TW.tanDeg(0)) < 1e-9);
});

test('geometry: 垂直壁・水平地表・ω=45 で xB,A,L が幾何どおり', () => {
  const g = TW.geometry({ H: 5, beta: 0 }, 45);
  assert.ok(g.valid);
  assert.ok(Math.abs(g.xB - 5) < 1e-9);      // 5 / tan45
  assert.ok(Math.abs(g.A - 12.5) < 1e-9);    // 0.5*5*5
  assert.ok(Math.abs(g.L - 5 / Math.cos(Math.PI / 4)) < 1e-9);
  assert.deepStrictEqual(g.T, { x: 0, y: 5 });
});

test('geometry: ω<=β または ω>=90 は無効', () => {
  assert.strictEqual(TW.geometry({ H: 5, beta: 10 }, 10).valid, false);
  assert.strictEqual(TW.geometry({ H: 5, beta: 0 }, 90).valid, false);
});

const P_BASE = { H: 5, gamma: 18, phi: 30, delta: 0, c: 0, q: 0, beta: 0 };

test('solveWedge: Rankine一致（c=δ=β=0, φ=30, ω=60 で P=75）', () => {
  const r = TW.solveWedge(P_BASE, 60);
  assert.ok(r.valid);
  assert.ok(Math.abs(r.P - 75.0) < 1e-6, `P=${r.P}`);
});

test('solveWedge: 4力ベクトルの総和がゼロ（つり合い閉合）', () => {
  const r = TW.solveWedge(P_BASE, 55);
  const sx = r.vectors.reduce((s, v) => s + v.fx, 0);
  const sy = r.vectors.reduce((s, v) => s + v.fy, 0);
  assert.ok(Math.abs(sx) < 1e-6, `sx=${sx}`);
  assert.ok(Math.abs(sy) < 1e-6, `sy=${sy}`);
});

test('solveWedge: 粘着力を入れると同じωでPが小さくなる', () => {
  const noC = TW.solveWedge(P_BASE, 60).P;
  const withC = TW.solveWedge({ ...P_BASE, c: 10 }, 60).P;
  assert.ok(withC < noC, `withC=${withC} !< noC=${noC}`);
});

test('rankineKa: φ=30 で 1/3', () => {
  assert.ok(Math.abs(TW.rankineKa(30) - 1 / 3) < 1e-9);
});

test('sweep: Pₐ≈75, 臨界ω≈60（=45+φ/2）', () => {
  const s = TW.sweep(P_BASE, { step: 0.25 });
  assert.ok(Math.abs(s.Pa - 75.0) < 0.2, `Pa=${s.Pa}`);
  assert.ok(Math.abs(s.omegaCrit - 60) < 0.5, `omegaCrit=${s.omegaCrit}`);
  assert.strictEqual(s.omegas.length, s.Ps.length);
  assert.ok(s.omegas.length > 100);
});

test('sweep: Pₐは理論値 ½γH²Kₐ に一致', () => {
  const s = TW.sweep(P_BASE, { step: 0.25 });
  const theory = 0.5 * 18 * 25 * TW.rankineKa(30);
  assert.ok(Math.abs(s.Pa - theory) < 0.2, `Pa=${s.Pa} theory=${theory}`);
});
