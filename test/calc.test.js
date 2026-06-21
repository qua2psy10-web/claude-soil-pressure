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
