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
