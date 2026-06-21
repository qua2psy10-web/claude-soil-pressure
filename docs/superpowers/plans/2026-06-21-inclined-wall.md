# 傾斜壁（壁背面傾斜）対応 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の試行楔法土圧アプリに壁背面傾斜角 θ を導入し、傾斜壁の主働土圧を扱えるようにする（θ=0で現状と完全一致）。

**Architecture:** `calc.js` の `geometry`/`solveWedge` を θ 一般化（壁天端 T=(H·tanθ,H)、有効ω上限 λ、土圧Pの向き＝壁面法線+δ）。θ は未指定時 0 にデフォルトし、既存の全テスト・呼び出しを不変に保つ。`index.html` に入力1つ、`render.js` に1行の描画域修正を加える。

**Tech Stack:** 素のHTML/CSS/JavaScript、SVG、`node:test`。外部依存なし。

---

## 符号規約（確認済み・全タスク共通）

- θ = 壁背面の鉛直からの傾斜角（度）、**正 = 壁天端が裏込め（土）側に倒れる**。xT = H·tanθ ≥ 0、T=(xT,H)。
- 有効ω範囲は `β < ω < λ`、λ = atan2(H, xT) を度にした値。θ=0 で λ=90°（現行に一致）。
- 土圧Pの向き角 `pAng = nWall + δ`、nWall = atan2(−xT, H) を度にした値。θ=0 で nWall=0 → pAng=δ。
- 検証: **本アプリの θ(+) は Coulomb(Das)一般式の −θ に対応**。
  数値確認済み: θ=0→Pₐ=67.819、θ=10→Pₐ=53.362（=½γH²·Ka_Das(φ,δ,β,−10)）。物理的にも θ↑で Pₐ↓。

## ファイル構成（変更点）

- Modify: `calc.js` — `geometry`（theta対応・λ判定・xT返却）、`solveWedge`（Q・pAng一般化）、`coulombKa`（検証用ヘルパ追加）
- Modify: `index.html` — θ入力欄、`ids`/`params`/`validate` 拡張、README行
- Modify: `render.js` — `makeMap` の x範囲に T.x を追加
- Modify: `test/calc.test.js` — θ=0回帰、Coulomb一致、単調性
- Modify: `README.md` — θ対応を1行追記

---

## Task 1: geometry() の θ 一般化

**Files:** Modify `calc.js`, Modify `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く** — `test/calc.test.js` に追記:
```js
test('geometry: θ=0 は従来と不変（回帰）', () => {
  const g = TW.geometry({ H: 5, beta: 0 }, 45); // theta未指定→0
  assert.ok(g.valid);
  assert.ok(Math.abs(g.xB - 5) < 1e-9);
  assert.ok(Math.abs(g.A - 12.5) < 1e-9);
  assert.deepStrictEqual(g.T, { x: 0, y: 5 });
  assert.ok(Math.abs(g.xT - 0) < 1e-12);
});

test('geometry: θ=10 で壁天端が土側へ寄り xT=H·tanθ', () => {
  const g = TW.geometry({ H: 5, beta: 0, theta: 10 }, 45);
  assert.ok(g.valid);
  assert.ok(Math.abs(g.xT - 5 * Math.tan(Math.PI / 18)) < 1e-9); // 5*tan10°
  assert.ok(Math.abs(g.T.x - g.xT) < 1e-12 && g.T.y === 5);
  // xB = H(1 - tanθ·tanβ)/(tanω - tanβ), β=0 → xB = H/tanω = 5
  assert.ok(Math.abs(g.xB - 5) < 1e-9);
});

test('geometry: θ>0 で有効ω上限が λ=atan(H/xT) になる', () => {
  // θ=10, H=5 → xT=0.8816..., λ=atan2(5,0.8816)≈80°
  assert.strictEqual(TW.geometry({ H: 5, beta: 0, theta: 10 }, 85).valid, false); // ω>λ → 無効
  assert.strictEqual(TW.geometry({ H: 5, beta: 0, theta: 10 }, 70).valid, true);
});
```

- [ ] **Step 2: テストが失敗することを確認** — Run `node --test` — Expected: 新テストのうち θ=10 系が FAIL（xT undefined / λ未対応）

- [ ] **Step 3: 実装** — `calc.js` の `geometry` 関数を次に置き換える:
```js
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
    return {
      valid: true,
      O: { x: 0, y: 0 },
      T: { x: xT, y: H },
      B: { x: xB, y: yB },
      xT, xB, yB, A, L,
    };
  }
```

- [ ] **Step 4: テストが通ることを確認** — Run `node --test` — Expected: 既存テスト＋新テストが全 PASS

- [ ] **Step 5: コミット** —
```bash
git add calc.js test/calc.test.js
git commit -m "feat: geometry() を壁背面傾斜θに一般化（θ=0は不変）"
```

---

## Task 2: solveWedge() の θ 一般化 と coulombKa() 検証

**Files:** Modify `calc.js`, Modify `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く** — `test/calc.test.js` に追記:
```js
test('solveWedge: θ=0 は従来と不変（Rankine P=75 回帰）', () => {
  assert.ok(Math.abs(TW.solveWedge(P_BASE, 60).P - 75.0) < 1e-6); // P_BASEはtheta無し→0
});

test('coulombKa: θ=0,δ=0,β=0,φ=30 で 1/3', () => {
  assert.ok(Math.abs(TW.coulombKa(30, 0, 0, 0) - 1 / 3) < 1e-9);
});

test('傾斜壁: 試行楔法スイープの最大が Coulomb 一般式と一致（θ=10）', () => {
  const p = { H: 5, gamma: 18, phi: 30, delta: 15, c: 0, q: 0, beta: 0, theta: 10 };
  const s = TW.sweep(p, { step: 0.05 });
  const theory = 0.5 * 18 * 25 * TW.coulombKa(30, 15, 0, -10); // 本アプリのθ(+)=Dasの−θ
  assert.ok(Math.abs(s.Pa - theory) / theory < 0.01, `Pa=${s.Pa} theory=${theory}`);
});

test('傾斜壁: θを増やすと Pₐ が減る（土側に倒れる壁）', () => {
  const p0 = { H: 5, gamma: 18, phi: 30, delta: 15, c: 0, q: 0, beta: 0, theta: 0 };
  const p10 = { ...p0, theta: 10 };
  assert.ok(TW.sweep(p10, { step: 0.1 }).Pa < TW.sweep(p0, { step: 0.1 }).Pa);
});
```

- [ ] **Step 2: テストが失敗することを確認** — Run `node --test` — Expected: `coulombKa`系・傾斜壁系が FAIL（coulombKa未定義 / θ未反映）

- [ ] **Step 3: 実装** —
(a) `calc.js` の `solveWedge` 関数を次に置き換える:
```js
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
```
(b) `calc.js` に `coulombKa` を追加（`rankineKa` の近くでよい）:
```js
  function coulombKa(phi, delta, beta, theta) {
    const num = Math.pow(cosDeg(phi - theta), 2);
    const root = Math.sqrt(sinDeg(phi + delta) * sinDeg(phi - beta) / (cosDeg(delta + theta) * cosDeg(theta - beta)));
    const den = Math.pow(cosDeg(theta), 2) * cosDeg(delta + theta) * Math.pow(1 + root, 2);
    return num / den;
  }
```
(c) `api` オブジェクトに `coulombKa` を追加する。

- [ ] **Step 4: テストが通ることを確認** — Run `node --test` — Expected: 全テスト PASS

- [ ] **Step 5: コミット** —
```bash
git add calc.js test/calc.test.js
git commit -m "feat: solveWedge() を傾斜壁に一般化＋coulombKaで理論検証"
```

---

## Task 3: index.html に θ 入力とバリデーション

**Files:** Modify `index.html`, Modify `README.md`

- [ ] **Step 1: θ入力欄を追加** — `index.html` の `.grid4` 内、裏込め勾配 β の `<label>` の直後に追加:
```html
      <label><span>壁背面傾斜 θ (°)</span><input type="number" id="theta" value="0" step="1" min="0" max="25"></label>
```

- [ ] **Step 2: state配線に theta を追加** — インライン `<script>` の `ids` 配列に `'theta'` を追加:
```js
  const ids = ['H', 'gamma', 'phi', 'delta', 'c', 'q', 'beta', 'theta', 'omega'];
```
（注: `'omega'` は配列末尾のまま。`'theta'` を `'beta'` と `'omega'` の間に入れる。）
そして `params()` の返却に `theta` を追加:
```js
  function params() {
    return { H: state.H, gamma: state.gamma, phi: state.phi,
             delta: state.delta, c: state.c, q: state.q, beta: state.beta, theta: state.theta };
  }
```

- [ ] **Step 3: バリデーションを追加** — `validate(p)` の `return msgs;` の直前に追加:
```js
    if (p.theta < 0 || p.theta > 25) msgs.push('壁背面傾斜 θ は 0〜25° の範囲で。');
    if (TW.tanDeg(p.theta) * TW.tanDeg(p.beta) >= 1) msgs.push('θ と β の組み合わせが幾何的に成立しません。');
```

- [ ] **Step 4: READMEに追記** — `README.md` の入力条件の記述（`H, γ, φ, δ, c, q, β`）に `θ`（壁背面傾斜）を加える。該当行を次に置き換える:
```markdown
1. 土の条件（H, γ, φ, δ, c, q, β, θ）を入力（θ=壁背面傾斜角、0で鉛直壁）
```

- [ ] **Step 5: コミット** —
```bash
git add index.html README.md
git commit -m "feat: θ（壁背面傾斜）入力欄とバリデーション追加"
```

---

## Task 4: render.js の描画域修正とブラウザ実証

**Files:** Modify `render.js`

- [ ] **Step 1: makeMap の x範囲に T.x を含める** — `render.js` の `makeMap` 内の該当行を置き換える:
```js
    const xs = [0, geom.T.x, geom.B.x], ys = [0, geom.T.y, geom.B.y];
```
（元は `const xs = [0, geom.B.x], ...`。傾斜壁で xT>0 のとき壁天端を描画域に確実に含めるため。）

- [ ] **Step 2: 構文確認** — Run `node --check render.js` — Expected: SYNTAX OK

- [ ] **Step 3: ブラウザ実証** — ローカルサーバを起動し（`python3 -m http.server 8731` をバックグラウンドで）、`http://localhost:8731/index.html` を Playwright で開く。次を確認:
  - コンソールに `[selfTest] ... OK`（θ=0系の回帰）、エラーは favicon 404 のみ
  - θ入力に 15 を設定 → 断面図の壁背面（左の太線）が斜めになり、くさび・力の多角形・P–ω曲線・解説が連動して更新される
  - θ=15 設定時、解説パネルの「現在の最大 Pₐ」が、`node -e` で計算した `0.5*18*25*TW.coulombKa(30,15,0,-15)` と概ね一致（数%以内）
  - θに 30 を入れると（max=25超）赤字バリデーションが出て描画が止まる
  スクリーンショットを撮り、4ペイン連動と壁傾斜を目視確認する。

- [ ] **Step 4: コミット** —
```bash
git add render.js
git commit -m "fix: 傾斜壁で壁天端を描画域に含める（makeMap）"
```

---

## Self-Review（記録）

- **Spec coverage:** 角度定義(Task共通)、geometry一般化(Task1)、solveWedge一般化+Coulomb検証(Task2)、UI入力+validate(Task3)、render描画域(Task4)、θ=0回帰(Task1,2)、単調性(Task2)、ブラウザ実証(Task4) — 仕様の各項に対応。
- **Placeholder scan:** なし（全コード実体）。
- **Type consistency:** `geometry` 戻り値に `xT` 追加、`solveWedge` は `g.xT`/`p.H`/`nWall`/`pAng` を使用、`coulombKa(phi,delta,beta,theta)` の引数順は Task2 のテスト・ブラウザ確認で一致。θは全箇所 `p.theta || 0` で未指定時0に統一（回帰安全）。
- **回帰安全性:** 既存テストは theta 無しの `p` を渡すため θ=0 に既定化され、geometry/solveWedge とも従来計算に一致。Task1/Task2 のStep1で明示的に回帰テストを追加。
