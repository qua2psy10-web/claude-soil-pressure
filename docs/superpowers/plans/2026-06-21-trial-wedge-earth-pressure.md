# 試行楔法による土圧計算 学習アプリ 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ブラウザで開く1ファイル系の学習アプリを作り、試行楔法による主働土圧の計算過程（くさび角ωを動かし、力のつり合いからPを求め、最大値=Pₐを探す）を初学者が手を動かして理解できるようにする。

**Architecture:** 純粋計算関数を `calc.js`（クラシックスクリプト。ブラウザの `file://` でもNodeの `node --test` でも動く形）に分離し、TDDで力学コアを固める。UI（入力・SVG描画・解説・ステッパー）は `index.html` に集約し、単一の `state` から一方向データフローで全ペインを再描画する。

**Tech Stack:** 素のHTML/CSS/JavaScript、SVG描画、ビルドなし、外部ライブラリなし。テストはNode組み込みの `node:test` / `node:assert`。

---

## 座標系と数式（実装の前提・全タスク共通の参照）

**座標系:** x=水平（右=裏込め側が正）、y=鉛直上向き。壁かかと O=(0,0)、壁天端 T=(0,H)。壁背面は鉛直（v1）。地表は T から右上へ勾配 β。すべり面は O から右上へ角度 ω。

**幾何（ω, βは度。tanは度→rad変換して計算）:**
- 有効条件: `β < ω < 90`
- すべり面と地表の交点 B: `xB = H / (tan ω − tan β)`、`yB = xB · tan ω`
- くさび三角形 O,T,B の面積: `A = 0.5 · xB · H`
- すべり面長: `L = xB / cos ω`

**力（くさびに作用、単位はkN/m=壁奥行1mあたり）:**
- 自重 `W = γ · A`、上載荷重 `Q = q · xB`、合計鉛直力 `V = W + Q`（向き: 鉛直下、ベクトル `(0, −V)`）
- 粘着力 `C = c · L`（向き: すべり面に沿い上向き = 角度 ω、ベクトル `C·(cosω, sinω)`）
- すべり面反力 `R`（大きさ未知、向き = 角度 `ω + 90 − φ`、ベクトル `R·(cos, sin)`）
- 壁からの土圧反力 `P`（大きさ未知、向き = 角度 `δ`、ベクトル `P·(cosδ, sinδ)`）

**つり合い（ΣFx=0, ΣFy=0）→ 未知数 P, R の連立2元1次:**
```
P·cosδ + R·cos(ω+90−φ) = −C·cosω
P·sinδ + R·sin(ω+90−φ) =  V − C·sinω
```
クラメルで解く（Δ = cosδ·sin(ω+90−φ) − sinδ·cos(ω+90−φ)）。

**試行:** ω を β+ε 〜 90−ε でスイープし P(ω) を作る。**最大の P が主働土圧 Pₐ**、その ω が臨界すべり面角。

**検証の要（c=0, δ=0, β=0, 鉛直壁, φ=30°, γ=18, H=5）:**
- ω=60° で P=75.0 kN/m（= ½γH²·Kₐ, Kₐ=tan²(45−φ/2)=1/3）
- スイープの最大 Pₐ≈75.0、臨界 ω≈60°（=45+φ/2）

---

## ファイル構成

- Create: `calc.js` — 純粋計算（`geometry`, `solveWedge`, `sweep`, `rankineKa`, 角度ヘルパ）。ブラウザ用 `window.TrialWedge` とNode用 `module.exports` の両対応。
- Create: `index.html` — UI全体（入力パネル、4ペイン、解説、ステッパー、自動探索）。`<script src="calc.js">` を読み込む。
- Create: `render.js` — SVG描画 + 解説テキスト生成（DOM依存。`index.html` から読み込む）。
- Create: `test/calc.test.js` — `node:test` による `calc.js` のユニットテスト。
- Create: `README.md` — 開き方・使い方・テスト実行方法。

---

## Task 1: プロジェクト雛形と calc.js のスケルトン（角度ヘルパ）

**Files:**
- Create: `calc.js`
- Create: `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/calc.test.js`:
```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test`
Expected: FAIL（`Cannot find module '../calc.js'`）

- [ ] **Step 3: 最小実装**

`calc.js`:
```js
(function (global) {
  const deg2rad = (d) => (d * Math.PI) / 180;
  const tanDeg = (d) => Math.tan(deg2rad(d));
  const sinDeg = (d) => Math.sin(deg2rad(d));
  const cosDeg = (d) => Math.cos(deg2rad(d));

  const api = { deg2rad, tanDeg, sinDeg, cosDeg };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TrialWedge = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test`
Expected: PASS（2 tests）

- [ ] **Step 5: コミット**

```bash
git add calc.js test/calc.test.js
git commit -m "feat: calc.js 雛形と角度ヘルパ（TDD）"
```

---

## Task 2: geometry() — くさび幾何

**Files:**
- Modify: `calc.js`
- Modify: `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/calc.test.js` に追記:
```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test`
Expected: FAIL（`TW.geometry is not a function`）

- [ ] **Step 3: 最小実装**

`calc.js` の `api` 定義の前に追加し、`api` に `geometry` を加える:
```js
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
```
`api` を `{ deg2rad, tanDeg, sinDeg, cosDeg, geometry }` に更新。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
git add calc.js test/calc.test.js
git commit -m "feat: geometry() くさび幾何（TDD）"
```

---

## Task 3: solveWedge() — 力のつり合いから P, R を解く

**Files:**
- Modify: `calc.js`
- Modify: `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/calc.test.js` に追記:
```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test`
Expected: FAIL（`TW.solveWedge is not a function`）

- [ ] **Step 3: 最小実装**

`calc.js` に追加し、`api` に `solveWedge` を加える:
```js
  function solveWedge(p, omega) {
    const g = geometry(p, omega);
    if (!g.valid) return { valid: false };
    const { gamma, phi, delta, c, q } = p;

    const W = gamma * g.A;
    const Q = q * g.xB;
    const V = W + Q;
    const C = c * g.L;

    const rAng = omega + 90 - phi; // R の向き（度）
    // 連立: [cosδ, cos(rAng)][P]   [ -C·cosω        ]
    //       [sinδ, sin(rAng)][R] = [  V - C·sinω    ]
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
```
`api` に `solveWedge` を追加。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test`
Expected: PASS（7 tests）

- [ ] **Step 5: コミット**

```bash
git add calc.js test/calc.test.js
git commit -m "feat: solveWedge() 力のつり合いでP,Rを解く（Rankine検証つき）"
```

---

## Task 4: sweep() と rankineKa() — 最大値探索と理論値

**Files:**
- Modify: `calc.js`
- Modify: `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く**

`test/calc.test.js` に追記:
```js
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
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `node --test`
Expected: FAIL（`TW.sweep is not a function`）

- [ ] **Step 3: 最小実装**

`calc.js` に追加し `api` に加える:
```js
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
```
`api` に `rankineKa, sweep` を追加。

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test`
Expected: PASS（11 tests）

- [ ] **Step 5: コミット**

```bash
git add calc.js test/calc.test.js
git commit -m "feat: sweep()最大値探索 と rankineKa()理論値（TDD）"
```

---

## Task 5: index.html の骨組み（入力パネル + state + 一方向データフロー）

**Files:**
- Create: `index.html`

- [ ] **Step 1: HTML骨組みと入力パネルを書く**

`index.html`:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>試行楔法 土圧計算ウォーク</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; color: #1a1a1a; background: #f6f7f9; }
  header { background: #234; color: #fff; padding: 12px 20px; }
  header h1 { font-size: 18px; margin: 0; }
  .wrap { display: grid; grid-template-columns: 280px 1fr; gap: 16px; padding: 16px; }
  .panel { background: #fff; border: 1px solid #e2e5e9; border-radius: 8px; padding: 12px; }
  .panel h2 { font-size: 14px; margin: 0 0 10px; color: #234; }
  .grid4 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  label { display: block; font-size: 12px; margin-bottom: 8px; }
  label span { display: block; color: #556; margin-bottom: 2px; }
  input[type=number] { width: 100%; box-sizing: border-box; padding: 4px 6px; }
  .omega-row { margin-top: 8px; }
  input[type=range] { width: 100%; }
  .val { font-variant-numeric: tabular-nums; font-weight: 600; }
  svg { width: 100%; height: auto; background: #fff; }
  .err { color: #b00; font-size: 12px; min-height: 16px; }
</style>
</head>
<body>
<header><h1>試行楔法による土圧計算ウォーク</h1></header>
<div class="wrap">
  <section class="panel" id="inputs">
    <h2>① 入力</h2>
    <div class="grid4">
      <label><span>壁高 H (m)</span><input type="number" id="H" value="5" step="0.5" min="0.5"></label>
      <label><span>単位体積重量 γ (kN/m³)</span><input type="number" id="gamma" value="18" step="0.5" min="1"></label>
      <label><span>内部摩擦角 φ (°)</span><input type="number" id="phi" value="30" step="1" min="0" max="45"></label>
      <label><span>壁面摩擦角 δ (°)</span><input type="number" id="delta" value="15" step="1" min="0" max="30"></label>
      <label><span>粘着力 c (kN/m²)</span><input type="number" id="c" value="0" step="1" min="0"></label>
      <label><span>上載荷重 q (kN/m²)</span><input type="number" id="q" value="0" step="1" min="0"></label>
      <label><span>裏込め勾配 β (°)</span><input type="number" id="beta" value="0" step="1" min="0" max="30"></label>
    </div>
    <div class="omega-row">
      <label><span>試行くさび角 ω = <span class="val" id="omegaVal">45</span>°</span>
        <input type="range" id="omega" min="1" max="89" value="45" step="0.5"></label>
    </div>
    <button id="autoBtn">最大値を自動で探す</button>
    <div class="err" id="err"></div>
  </section>

  <section>
    <div class="panel"><h2>② 断面図</h2><svg id="sectionSvg" viewBox="0 0 480 320"></svg></div>
    <div class="panel" style="margin-top:16px"><h2>③ 力の多角形</h2><svg id="polySvg" viewBox="0 0 360 280"></svg></div>
    <div class="panel" style="margin-top:16px"><h2>④ P–ω 曲線</h2><svg id="curveSvg" viewBox="0 0 480 240"></svg></div>
    <div class="panel" style="margin-top:16px"><h2>ステップ解説</h2><div id="explain"></div></div>
  </section>
</div>
<script src="calc.js"></script>
<script src="render.js"></script>
<script>
  const TW = window.TrialWedge;
  const ids = ['H', 'gamma', 'phi', 'delta', 'c', 'q', 'beta', 'omega'];
  const state = {};

  function readInputs() {
    for (const id of ids) state[id] = parseFloat(document.getElementById(id).value);
    document.getElementById('omegaVal').textContent = state.omega;
  }

  function params() {
    return { H: state.H, gamma: state.gamma, phi: state.phi,
             delta: state.delta, c: state.c, q: state.q, beta: state.beta };
  }

  function recompute() {
    readInputs();
    const p = params();
    const sweepRes = TW.sweep(p, { step: 0.25 });
    const wedge = TW.solveWedge(p, state.omega);
    window.Render.drawAll({ p, omega: state.omega, wedge, sweepRes });
  }

  ids.forEach((id) => document.getElementById(id).addEventListener('input', recompute));
  document.addEventListener('DOMContentLoaded', recompute);
</script>
</body>
</html>
```

- [ ] **Step 2: render.js を仮実装（描画はまだ空でも落ちないように）**

`render.js`:
```js
(function () {
  function drawAll(_ctx) { /* 後続タスクで実装 */ }
  window.Render = { drawAll };
})();
```

- [ ] **Step 3: ブラウザで開いて確認**

Run: `open index.html`（macOS）
Expected: 入力パネルが表示され、数値・スライダーを動かしてもエラーでコンソールが赤くならない。`omegaVal` がスライダーに連動して変わる。

- [ ] **Step 4: コミット**

```bash
git add index.html render.js
git commit -m "feat: index.html骨組み・入力パネル・state一方向データフロー"
```

---

## Task 6: render.js — 断面図の描画（drawSection）

**Files:**
- Modify: `render.js`

- [ ] **Step 1: 断面図描画を実装**

`render.js` を次の内容に置き換える（`drawAll` から `drawSection` を呼ぶ）:
```js
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
    // くさび塗り
    svg.appendChild(el('polygon', {
      points: `${O.X},${O.Y} ${T.X},${T.Y} ${B.X},${B.Y}`,
      fill: '#ffe0b2', stroke: 'none',
    }));
    // 壁背面
    svg.appendChild(el('line', { x1: O.X, y1: O.Y, x2: T.X, y2: T.Y, stroke: '#234', 'stroke-width': 4 }));
    // 地表
    svg.appendChild(el('line', { x1: T.X, y1: T.Y, x2: B.X, y2: B.Y, stroke: '#386641', 'stroke-width': 2 }));
    // すべり面
    svg.appendChild(el('line', { x1: O.X, y1: O.Y, x2: B.X, y2: B.Y, stroke: '#b00', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    // ωラベル
    const lbl = el('text', { x: O.X + 14, y: O.Y - 8, 'font-size': 13, fill: '#b00' });
    lbl.textContent = `ω=${ctx.omega}°`;
    svg.appendChild(lbl);
  }

  function drawAll(ctx) {
    drawSection(document.getElementById('sectionSvg'), ctx);
  }
  window.Render = { drawAll, drawSection };
})();
```

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: 壁・地表・すべり面（赤破線）・くさび（橙）が描かれる。ωスライダーを動かすとすべり面とくさびの形がリアルタイムに変わる。β を 10 にすると地表が右上がりになる。

- [ ] **Step 3: コミット**

```bash
git add render.js
git commit -m "feat: 断面図SVG描画（くさび・すべり面・ω連動）"
```

---

## Task 7: render.js — 力の多角形の描画（drawForcePolygon）

**Files:**
- Modify: `render.js`

- [ ] **Step 1: 力の多角形描画を追加**

`render.js` の `drawAll` 前に追加し、`drawAll` から呼ぶ:
```js
  function drawForcePolygon(svg, ctx) {
    clear(svg);
    if (!ctx.wedge.valid) return;
    const vecs = ctx.wedge.vectors; // V, C, R, P
    const vb = svg.viewBox.baseVal;
    // tip-to-tail で座標列を作る（物理: x右,y上）
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
```
`drawAll` に `drawForcePolygon(document.getElementById('polySvg'), ctx);` を追加し、`window.Render` に `drawForcePolygon` を加える。

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: V→C→R→P が首尾連結して**閉じた多角形**になる（最後のPの終点が始点に戻る）。c=0 のときは三角形（Cの長さ0）に近づく。δ や ω を変えると形が変わる。

- [ ] **Step 3: コミット**

```bash
git add render.js
git commit -m "feat: 力の多角形SVG描画（V/C/R/P 首尾連結・閉合）"
```

---

## Task 8: render.js — P–ω 曲線の描画（drawCurve）

**Files:**
- Modify: `render.js`

- [ ] **Step 1: P–ω 曲線描画を追加**

`render.js` に追加し `drawAll` から呼ぶ:
```js
  function drawCurve(svg, ctx) {
    clear(svg);
    const s = ctx.sweepRes;
    if (!s.omegas.length) return;
    const vb = svg.viewBox.baseVal, pad = 34;
    const wMin = s.omegas[0], wMax = s.omegas[s.omegas.length - 1];
    const pMin = Math.min(0, ...s.Ps), pMax = Math.max(...s.Ps) || 1;
    const mapX = (w) => pad + (w - wMin) / ((wMax - wMin) || 1) * (vb.width - 2 * pad);
    const mapY = (P) => vb.height - pad - (P - pMin) / ((pMax - pMin) || 1) * (vb.height - 2 * pad);
    // 軸
    svg.appendChild(el('line', { x1: pad, y1: vb.height - pad, x2: vb.width - pad, y2: vb.height - pad, stroke: '#888' }));
    svg.appendChild(el('line', { x1: pad, y1: pad, x2: pad, y2: vb.height - pad, stroke: '#888' }));
    const ax = el('text', { x: vb.width - pad, y: vb.height - pad + 16, 'font-size': 11, fill: '#556', 'text-anchor': 'end' }); ax.textContent = 'ω (°)';
    const ay = el('text', { x: pad - 4, y: pad - 6, 'font-size': 11, fill: '#556' }); ay.textContent = 'P (kN/m)';
    svg.appendChild(ax); svg.appendChild(ay);
    // 曲線
    let d = '';
    for (let i = 0; i < s.omegas.length; i++) d += (i ? 'L' : 'M') + mapX(s.omegas[i]) + ' ' + mapY(s.Ps[i]) + ' ';
    svg.appendChild(el('path', { d, fill: 'none', stroke: '#0066b3', 'stroke-width': 2 }));
    // 最大点
    if (s.omegaCrit != null) {
      svg.appendChild(el('circle', { cx: mapX(s.omegaCrit), cy: mapY(s.PaRaw), r: 5, fill: '#b00' }));
      const t = el('text', { x: mapX(s.omegaCrit) + 6, y: mapY(s.PaRaw) - 6, 'font-size': 12, fill: '#b00', 'font-weight': 700 });
      t.textContent = `Pₐ=${s.Pa.toFixed(1)} (ω=${s.omegaCrit.toFixed(1)}°)`;
      svg.appendChild(t);
    }
    // 現在ω点
    const cur = TW_lookup(s, ctx.omega);
    if (cur != null) svg.appendChild(el('circle', { cx: mapX(ctx.omega), cy: mapY(cur), r: 4, fill: '#234', stroke: '#fff' }));
  }
  function TW_lookup(s, omega) {
    let best = null, bd = Infinity;
    for (let i = 0; i < s.omegas.length; i++) {
      const d = Math.abs(s.omegas[i] - omega);
      if (d < bd) { bd = d; best = s.Ps[i]; }
    }
    return best;
  }
```
`drawAll` に `drawCurve(document.getElementById('curveSvg'), ctx);` を追加。`window.Render` に `drawCurve` を加える。

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: 山なりの P–ω 曲線が描かれ、頂点に赤丸＋「Pₐ=… (ω=…)」表示。デフォルト（φ=30, δ=15）で頂点が現れる。ωスライダーを動かすと現在ω位置の黒点が曲線上を移動する。

- [ ] **Step 3: コミット**

```bash
git add render.js
git commit -m "feat: P-ω曲線SVG描画（最大点・現在点ハイライト）"
```

---

## Task 9: render.js — ステップ解説テキスト（explain）

**Files:**
- Modify: `render.js`

- [ ] **Step 1: 解説生成を追加**

`render.js` に追加し `drawAll` から呼ぶ:
```js
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
```
`drawAll` に `explain(document.getElementById('explain'), ctx);` を追加。`window.Render` に `explain` を加える。

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: 解説欄に幾何→W→C→つり合い→試行 の各値が数値入りで表示。ω や入力を変えると数値が追従。無効ωのとき注意文に切り替わる。

- [ ] **Step 3: コミット**

```bash
git add render.js
git commit -m "feat: ステップ解説テキスト（数値代入つき）"
```

---

## Task 10: 自動探索ボタン（アニメーションして最大値へ）

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 自動探索ロジックを追加**

`index.html` の `<script>`（recompute定義の後、`ids.forEach` の前）に追加:
```js
  let animId = null;
  function autoFind() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    readInputs();
    const p = params();
    const s = TW.sweep(p, { step: 0.25 });
    if (s.omegaCrit == null) return;
    const slider = document.getElementById('omega');
    const start = parseFloat(slider.value);
    const target = s.omegaCrit;
    const t0 = performance.now();
    const dur = 900;
    function frame(now) {
      const k = Math.min(1, (now - t0) / dur);
      const w = start + (target - start) * k;
      slider.value = w.toFixed(1);
      recompute();
      if (k < 1) animId = requestAnimationFrame(frame);
      else { animId = null; slider.value = target.toFixed(1); recompute(); }
    }
    animId = requestAnimationFrame(frame);
  }
  document.getElementById('autoBtn').addEventListener('click', autoFind);
```

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: 「最大値を自動で探す」を押すと ω スライダーが滑らかに臨界角へ移動し、断面・多角形・曲線・解説がすべて連動して最大点で止まる。曲線上の黒点が赤丸（Pₐ）に重なる。

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: 自動探索ボタン（臨界ωへアニメーション）"
```

---

## Task 11: ガイド付きステッパー（初回誘導）

**Files:**
- Modify: `index.html`

- [ ] **Step 1: ステッパーUIとロジックを追加**

`index.html` の `<header>` 直後に追加:
```html
<div id="stepper" class="panel" style="margin:16px;display:flex;align-items:center;gap:12px">
  <button id="prevStep">← 戻る</button>
  <div id="stepText" style="flex:1;font-size:13px"></div>
  <button id="nextStep">次へ →</button>
  <button id="freeBtn">自由モードへ</button>
</div>
```
`<script>` に追加:
```js
  const STEPS = [
    '【1】問題設定：擁壁が支える土から壁にかかる「主働土圧 Pₐ」を、試行楔法で求めます。',
    '【2】くさびを仮定：すべり面の角度 ω を1つ仮定します。スライダーを動かしてみましょう。',
    '【3】自重 W：くさび（橙の三角形）の重さを面積×γで計算します。',
    '【4】粘着力 C：すべり面に沿う抵抗 C = c·L（c=0なら0）。',
    '【5】力のつり合い：V・C・R・P が閉じる多角形（③）から P が決まります。',
    '【6】試行：ω を変えると P が変化（④の曲線）。最大が Pₐ です。「最大値を自動で探す」を押してみましょう。',
    '【7】完了：最大の P が主働土圧 Pₐ、その面が臨界すべり面。作用位置は下端から H/3 です。',
  ];
  let stepIdx = 0;
  function renderStep() {
    document.getElementById('stepText').textContent = STEPS[stepIdx];
    document.getElementById('prevStep').disabled = stepIdx === 0;
    document.getElementById('nextStep').disabled = stepIdx === STEPS.length - 1;
  }
  document.getElementById('nextStep').addEventListener('click', () => { if (stepIdx < STEPS.length - 1) { stepIdx++; renderStep(); } });
  document.getElementById('prevStep').addEventListener('click', () => { if (stepIdx > 0) { stepIdx--; renderStep(); } });
  document.getElementById('freeBtn').addEventListener('click', () => { document.getElementById('stepper').style.display = 'none'; });
  renderStep();
```

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: 上部に手順バーが出て「次へ／戻る」で説明が進み、「自由モードへ」で消える。各文が画面の操作と対応している。

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: ガイド付きステッパー（初回誘導）"
```

---

## Task 12: 入力バリデーションとエラー表示

**Files:**
- Modify: `index.html`

- [ ] **Step 1: バリデーションを追加**

`index.html` の `recompute` を次のように書き換える:
```js
  function validate(p) {
    const msgs = [];
    if (!(p.H > 0)) msgs.push('壁高 H は正の値にしてください。');
    if (!(p.gamma > 0)) msgs.push('単位体積重量 γ は正の値にしてください。');
    if (p.phi < 0 || p.phi > 45) msgs.push('内部摩擦角 φ は 0〜45° の範囲で。');
    if (p.delta < 0 || p.delta > p.phi) msgs.push('壁面摩擦角 δ は 0〜φ の範囲が一般的です。');
    if (p.c < 0) msgs.push('粘着力 c は 0 以上にしてください。');
    if (p.beta < 0 || p.beta >= p.phi) msgs.push('裏込め勾配 β は 0〜φ 未満にしてください。');
    return msgs;
  }
  function recompute() {
    readInputs();
    const p = params();
    const errBox = document.getElementById('err');
    const msgs = validate(p);
    errBox.textContent = msgs.join(' ');
    if (msgs.length) return;
    const sweepRes = TW.sweep(p, { step: 0.25 });
    const wedge = TW.solveWedge(p, state.omega);
    window.Render.drawAll({ p, omega: state.omega, wedge, sweepRes });
  }
```

- [ ] **Step 2: ブラウザで確認**

Run: `open index.html`
Expected: φに50を入れると赤字の注意が出て描画は止まる（クラッシュしない）。βをφ以上にすると注意。値を戻すと再描画される。δ>φでも注意が出る。

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: 入力バリデーションと日本語エラー表示"
```

---

## Task 13: ブラウザ内セルフテスト表示 + README + 最終検証

**Files:**
- Modify: `index.html`
- Create: `README.md`

- [ ] **Step 1: セルフテストパネルを追加**

`index.html` の `<script>` 末尾に追加:
```js
  // 開発用セルフテスト（c=0,δ=0,β=0,φ=30,γ=18,H=5 → Pₐ≈75, ω≈60）
  (function selfTest() {
    const s = TW.sweep({ H: 5, gamma: 18, phi: 30, delta: 0, c: 0, q: 0, beta: 0 }, { step: 0.25 });
    const okPa = Math.abs(s.Pa - 75) < 0.2;
    const okW = Math.abs(s.omegaCrit - 60) < 0.5;
    console.log(`[selfTest] Pa=${s.Pa.toFixed(2)} (期待75) ${okPa ? 'OK' : 'NG'}, ωcrit=${s.omegaCrit.toFixed(1)} (期待60) ${okW ? 'OK' : 'NG'}`);
  })();
```

- [ ] **Step 2: README を書く**

`README.md`:
```markdown
# 試行楔法による土圧計算ウォーク

土工指針の試行楔法（試行くさび法）で主働土圧を求める過程を、初学者が手を動かして
学べる学習アプリです。

## 使い方
`index.html` をブラウザでダブルクリックして開くだけ（ビルド不要）。
1. 土の条件（H, γ, φ, δ, c, q, β）を入力
2. くさび角 ω のスライダーを動かし、断面・力の多角形・P–ω曲線・解説が連動するのを見る
3. 「最大値を自動で探す」で主働土圧 Pₐ と臨界すべり面を確定

## 検証（理論値との一致）
`node --test` で計算コアのテストを実行できます（Node 18+）。
- c=0, δ=0, β=0, 鉛直壁, φ=30° で Pₐ = ½γH²·Kₐ（Kₐ=1/3）、臨界 ω = 45+φ/2 = 60° に一致。

## ファイル
- `index.html` … UI・SVG描画の起点
- `calc.js` … 純粋計算（geometry / solveWedge / sweep / rankineKa）
- `render.js` … SVG描画・解説生成
- `test/calc.test.js` … 計算コアのユニットテスト
```

- [ ] **Step 3: 全テストとブラウザ最終確認**

Run: `node --test`
Expected: 全テスト PASS（11+ tests）

Run: `open index.html`、ブラウザのコンソールを開く
Expected: `[selfTest] Pa=75.0x (期待75) OK, ωcrit=60.0 (期待60) OK`。手順: ①δを0にしてφ=30で自動探索→曲線頂点ω≈60、Pₐ≈75。②c=20に上げるとPₐが下がる。③β=10で地表が傾き曲線が変わる。④不正入力で注意表示。

- [ ] **Step 4: コミット**

```bash
git add index.html README.md
git commit -m "feat: セルフテスト表示・README・最終検証"
```

---

## Self-Review（記録）

- **Spec coverage:** 4ペイン連動(Task6-8)、ステップ解説(Task9)、手動探索→自動確定(Task5,10)、c対応・q・β(Task3,5)、検証=Rankine/臨界角(Task4,13)、エラー処理(Task12)、作用点H/3(Task9) — 仕様の各項に対応タスクあり。
- **スコープ調整（要確認）:** 仕様の「壁背面傾斜」入力は v1 では**鉛直固定**とし入力から外した（幾何が大幅に複雑化するため）。β（裏込め勾配）・c・q・δ は実装。傾斜壁は将来拡張。
- **Placeholder scan:** なし（全ステップに実コード）。
- **Type consistency:** `geometry`/`solveWedge`/`sweep` の戻り値プロパティ（`valid, geom, vectors{label,fx,fy}, Pa, PaRaw, omegaCrit, omegas, Ps`）は描画・解説タスクと一致。
