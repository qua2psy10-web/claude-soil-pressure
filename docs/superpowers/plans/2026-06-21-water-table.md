# 水位・水圧対応 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 裏込めの地下水位を導入し、簡易有効応力法で有効主働土圧 P′ と静水圧 Pw を分けて扱えるようにする（Hw=0で現状と完全一致）。

**Architecture:** `calc.js` の `geometry` に水位以下面積 `Aw` を、`solveWedge` に有効自重 `W_eff=γA−γw·Aw` と静水圧 `Pw=½γw·Hw²` を追加（力の多角形の解法は不変、自重のみ有効化）。`sweep` は不変（Pwはω非依存）。UIに入力2つ＋解説、`render.js` に水位線を追加。

**Tech Stack:** 素のHTML/CSS/JavaScript、SVG、`node:test`。外部依存なし。

---

## 数式の要（検証済み・全タスク共通）

- 水位以下のくさび面積 `Aw = 0.5·Hw²·|tanθ − cotω|`（cotω=1/tanω）。βに非依存。Hwは `min(p.Hw||0, H)`。
- 有効自重 `W_eff = γ·A − γw·Aw`。`V = W_eff + Q`、Q=q·(xB−xT)。
- 静水圧 `Pw = 0.5·γw·Hw²`（水平、下端からHw/3）。
- 全水平土圧 = 臨界ωでの P の水平成分 `P.fx` + Pw。
- 数値検証済み（H=5,γ=18,φ=30,δ=0,β=0,θ=0,γw=9.8）:
  Hw=0→P′=75.000（無水と一致）; Hw=5(完全水没)→P′=34.167=½γ′H²·(1/3), Pw=122.50=½γwH²。

## ファイル構成（変更点）

- Modify: `calc.js` — `geometry`（Aw追加）、`solveWedge`（W_eff/Pw/Aw/Weff追加）
- Modify: `index.html` — 入力2つ、`ids`/`params`/`validate` 拡張
- Modify: `render.js` — `drawSection`（水位線）、`explain`（水関連表示）
- Modify: `test/calc.test.js` — Hw=0回帰、完全水没の理論一致、単調性
- Modify: `README.md` — 水位対応の追記

---

## Task 1: geometry() に水位以下面積 Aw を追加

**Files:** Modify `calc.js`, Modify `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く** — `test/calc.test.js` に追記:
```js
test('geometry: Hw=0 は Aw=0（無水・回帰）', () => {
  const g = TW.geometry({ H: 5, beta: 0 }, 45);
  assert.ok(Math.abs(g.Aw - 0) < 1e-12, `Aw=${g.Aw}`);
});

test('geometry: 完全水没 Hw=H, θ=0 で Aw=全面積 A', () => {
  const g = TW.geometry({ H: 5, beta: 0, Hw: 5 }, 45);
  assert.ok(Math.abs(g.Aw - g.A) < 1e-9, `Aw=${g.Aw} A=${g.A}`);
});

test('geometry: 部分水没 Hw<H で 0 < Aw < A', () => {
  const g = TW.geometry({ H: 5, beta: 0, Hw: 2.5 }, 45);
  assert.ok(g.Aw > 0 && g.Aw < g.A, `Aw=${g.Aw} A=${g.A}`);
  // Aw = 0.5*Hw^2*cotω = 0.5*2.5^2*(1/tan45) = 3.125
  assert.ok(Math.abs(g.Aw - 3.125) < 1e-9, `Aw=${g.Aw}`);
});
```

- [ ] **Step 2: テストが失敗することを確認** — Run `node --test` — Expected: 新テストが FAIL（`g.Aw` is undefined → NaN比較で fail）

- [ ] **Step 3: 実装** — `calc.js` の `geometry` 関数を次に置き換える（`Aw` 計算と返却を追加、それ以外は現行どおり）:
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
```

- [ ] **Step 4: テストが通ることを確認** — Run `node --test` — Expected: 既存20＋新3＝23 全 PASS

- [ ] **Step 5: コミット** —
```bash
git add calc.js test/calc.test.js
git commit -m "feat: geometry() に水位以下面積 Aw を追加（Hw=0は不変）"
```

---

## Task 2: solveWedge() に有効自重と静水圧を追加

**Files:** Modify `calc.js`, Modify `test/calc.test.js`

- [ ] **Step 1: 失敗するテストを書く** — `test/calc.test.js` に追記:
```js
test('solveWedge: Hw=0 は従来と不変（Rankine P=75 回帰）', () => {
  assert.ok(Math.abs(TW.solveWedge(P_BASE, 60).P - 75.0) < 1e-6);
  assert.ok(Math.abs(TW.solveWedge(P_BASE, 60).Pw - 0) < 1e-12);
});

test('完全水没: スイープ最大 P′ = ½γ′H²Ka（γ′=γ−γw）', () => {
  const p = { H: 5, gamma: 18, phi: 30, delta: 0, c: 0, q: 0, beta: 0, Hw: 5, gammaw: 9.8 };
  const s = TW.sweep(p, { step: 0.05 });
  const theory = 0.5 * (18 - 9.8) * 25 * TW.rankineKa(30); // ½γ′H²·(1/3)
  assert.ok(Math.abs(s.Pa - theory) < 0.1, `Pa=${s.Pa} theory=${theory}`);
});

test('完全水没: 静水圧 Pw = ½γw·H²', () => {
  const p = { H: 5, gamma: 18, phi: 30, delta: 0, c: 0, q: 0, beta: 0, Hw: 5, gammaw: 9.8 };
  const r = TW.solveWedge(p, 60);
  assert.ok(Math.abs(r.Pw - 0.5 * 9.8 * 25) < 1e-9, `Pw=${r.Pw}`);
});

test('部分水没: Hw↑ で P′↓・Pw↑', () => {
  const base = { H: 5, gamma: 18, phi: 30, delta: 15, c: 0, q: 0, beta: 0, gammaw: 9.8 };
  const dry = TW.sweep({ ...base, Hw: 0 }, { step: 0.1 });
  const wet = TW.sweep({ ...base, Hw: 3 }, { step: 0.1 });
  assert.ok(wet.Pa < dry.Pa, `wetPa=${wet.Pa} dryPa=${dry.Pa}`);
  const PwDry = TW.solveWedge({ ...base, Hw: 0 }, 55).Pw;
  const PwWet = TW.solveWedge({ ...base, Hw: 3 }, 55).Pw;
  assert.ok(PwWet > PwDry, `PwWet=${PwWet} PwDry=${PwDry}`);
});
```

- [ ] **Step 2: テストが失敗することを確認** — Run `node --test` — Expected: `Pw`未定義・水没系が FAIL

- [ ] **Step 3: 実装** — `calc.js` の `solveWedge` 関数を次に置き換える:
```js
  function solveWedge(p, omega) {
    const g = geometry(p, omega);
    if (!g.valid) return { valid: false };
    const { gamma, phi, delta, c, q } = p;
    const gammaw = p.gammaw || 0;
    const Hw = Math.min(p.Hw || 0, p.H);

    const W = gamma * g.A;            // 総自重（解説で対比用に保持）
    const Weff = W - gammaw * g.Aw;   // 有効自重（水位以下は浮力を差し引く）
    const Q = q * (g.xB - g.xT);
    const V = Weff + Q;
    const C = c * g.L;

    const rAng = omega + 90 - phi; // R の向き（度）
    const nWall = Math.atan2(-g.xT, p.H) * 180 / Math.PI; // 壁面法線角（度）
    const pAng = nWall + delta; // P の向き（度）

    const a1 = cosDeg(pAng), b1 = cosDeg(rAng), d1 = -C * cosDeg(omega);
    const a2 = sinDeg(pAng), b2 = sinDeg(rAng), d2 = V - C * sinDeg(omega);
    const det = a1 * b2 - a2 * b1;
    const P = (d1 * b2 - d2 * b1) / det;
    const R = (a1 * d2 - a2 * d1) / det;

    const Pw = 0.5 * gammaw * Hw * Hw; // 壁への静水圧合力（水平）

    const vectors = [
      { label: 'V', fx: 0, fy: -V },
      { label: 'C', fx: C * cosDeg(omega), fy: C * sinDeg(omega) },
      { label: 'R', fx: R * cosDeg(rAng), fy: R * sinDeg(rAng) },
      { label: 'P', fx: P * cosDeg(pAng), fy: P * sinDeg(pAng) },
    ];

    return { valid: true, geom: g, W, Weff, Q, V, C, L: g.L, A: g.A, Aw: g.Aw, P, R, Pw, omega, vectors };
  }
```

- [ ] **Step 4: テストが通ることを確認** — Run `node --test` — Expected: 全テスト PASS

- [ ] **Step 5: コミット** —
```bash
git add calc.js test/calc.test.js
git commit -m "feat: solveWedge() に有効自重W_effと静水圧Pwを追加（簡易有効応力法）"
```

---

## Task 3: index.html に水位入力とバリデーション

**Files:** Modify `index.html`, Modify `README.md`

- [ ] **Step 1: 入力欄を追加** — `index.html` の `.grid4` 内、θ の `<label>` 行の直後に追加:
```html
      <label><span>地下水位 Hw (m)</span><input type="number" id="Hw" value="0" step="0.5" min="0"></label>
      <label><span>水の単位体積重量 γw (kN/m³)</span><input type="number" id="gammaw" value="9.8" step="0.1" min="0"></label>
```

- [ ] **Step 2: state配線を拡張** — `ids` 配列に `'Hw'`, `'gammaw'` を追加（`'theta'` と `'omega'` の間）:
```js
  const ids = ['H', 'gamma', 'phi', 'delta', 'c', 'q', 'beta', 'theta', 'Hw', 'gammaw', 'omega'];
```
`params()` の返却に追加:
```js
  function params() {
    return { H: state.H, gamma: state.gamma, phi: state.phi,
             delta: state.delta, c: state.c, q: state.q, beta: state.beta, theta: state.theta,
             Hw: state.Hw, gammaw: state.gammaw };
  }
```

- [ ] **Step 3: バリデーションを追加** — `validate(p)` の `return msgs;` の直前に追加:
```js
    if (p.Hw < 0 || p.Hw > p.H) msgs.push('地下水位 Hw は 0〜H(壁高) の範囲で。');
    if (p.gammaw < 0) msgs.push('水の単位体積重量 γw は 0 以上で。');
```

- [ ] **Step 4: READMEに追記** — `README.md` の θ を含む入力説明行を次に置き換える:
```markdown
1. 土の条件（H, γ, φ, δ, c, q, β, θ, Hw, γw）を入力（θ=壁背面傾斜角/負=オーバーハング、Hw=地下水位、0で無水）
```

- [ ] **Step 5: calc テスト不変を確認とコミット** — Run `node --test`（全 PASS）。その後:
```bash
git add index.html README.md
git commit -m "feat: 地下水位 Hw・水の単位体積重量 γw の入力欄追加"
```

---

## Task 4: render.js に水位線と水圧の解説を追加

**Files:** Modify `render.js`

- [ ] **Step 1: drawSection に水位線を追加** — `render.js` の `drawSection` 関数内、`ωラベル`（`const lbl = el('text'...`）を追加している箇所の **直前** に、次のブロックを挿入する:
```js
    // 地下水位線（Hw>0 のとき）
    const Hw = Math.min(ctx.p.Hw || 0, ctx.p.H);
    if (Hw > 0) {
      const wl = m(0, Hw), wr = m(g.B.x, Hw);
      svg.appendChild(el('line', { x1: wl.X, y1: wl.Y, x2: wr.X, y2: wr.Y, stroke: '#1e88e5', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
      const wt = el('text', { x: wr.X - 70, y: wl.Y - 4, 'font-size': 11, fill: '#1e88e5' });
      wt.textContent = '地下水位';
      svg.appendChild(wt);
    }
```
（`m` は `drawSection` 内で既に定義済みの座標マッパ、`g` はくさび幾何、`ctx.p` は入力パラメータ。）

- [ ] **Step 2: explain に水関連を追記** — `render.js` の `explain` 関数の `div.innerHTML = ...` テンプレートで、自重の `<li>`（`<b>自重 W</b> = γ·A ...` の行）を次に置き換える:
```js
        <li><b>自重</b>：総自重 γ·A = ${f(w.W)} kN/m${p.Hw > 0 ? `、水位以下の浮力 −γw·Aw = −${f(p.gammaw * w.Aw)} kN/m → <b>有効自重 W_eff = ${f(w.Weff)} kN/m</b>` : ''}${p.q ? `、上載 Q = ${f(w.Q)} kN/m` : ''}（合計鉛直 V = <b>${f(w.V)} kN/m</b>）</li>
```
さらに、`<b>力のつり合い</b>` の `<li>` の **直後** に、水圧の `<li>` を挿入する（Hw>0のときのみ）:
```js
        ${p.Hw > 0 ? `<li><b>静水圧</b>：壁に作用する水圧 Pw = ½γw·Hw² = <b>${f(w.Pw)} kN/m</b>（下端から Hw/3）</li>` : ''}
```

- [ ] **Step 3: explain の合計表示に全水平土圧を追記** — `explain` 末尾の「現在の最大」を表示する `<p>` を次に置き換える（臨界ωでのPの水平成分とPwを合算）:
```js
      <p style="font-size:12px;color:#556">現在の最大：Pₐ = <b>${ctx.sweepRes.Pa.toFixed(2)} kN/m</b>（臨界 ω = ${ctx.sweepRes.omegaCrit?.toFixed(1)}°、作用位置 = 下端から H/3 = ${(p.H / 3).toFixed(2)} m）${p.Hw > 0 ? `<br>有効土圧の水平成分 ${critPh(ctx).toFixed(2)} ＋ 静水圧 ${w.Pw.toFixed(2)} = <b>全水平土圧 ${(critPh(ctx) + w.Pw).toFixed(2)} kN/m</b>` : ''}</p>`;
```
そして `explain` 関数の **直前** に、臨界ωでの有効土圧水平成分を求めるヘルパを追加する:
```js
  function critPh(ctx) {
    const wc = ctx.sweepRes.omegaCrit;
    if (wc == null) return 0;
    const r = window.TrialWedge.solveWedge(ctx.p, wc);
    if (!r.valid) return 0;
    return r.vectors[3].fx; // P の水平成分（vectors=[V,C,R,P]）
  }
```

- [ ] **Step 4: 構文確認** — Run `node --check render.js` — Expected: SYNTAX OK

- [ ] **Step 5: コミット** —
```bash
git add render.js
git commit -m "feat: 断面図に水位線、解説に有効自重・静水圧・全土圧を追加"
```

---

## Task 5: ブラウザ実証（コントローラが実施）

**Files:** なし（検証のみ）

このタスクは実装サブエージェントではなくコントローラが Playwright で実施する。

- [ ] **Step 1: サーバ起動とロード** — `python3 -m http.server 8731` をバックグラウンド起動、`http://localhost:8731/index.html` を開く。コンソールに `[selfTest] ... OK`、エラーは favicon 404 のみ。
- [ ] **Step 2: 無水の回帰** — 初期状態（Hw=0）で断面図に水位線が無く、解説に水関連行が出ないこと（現状どおり）。
- [ ] **Step 3: 水位設定** — Hw=2.5 を設定 → 断面図に水色破線の水位線「地下水位」が表示、解説に「有効自重 W_eff」「静水圧 Pw」「全水平土圧」が出る。表示値が `node -e` での計算と概ね一致。
- [ ] **Step 4: 完全水没の理論確認** — Hw=5, δ=0, θ=0 で 解説の Pₐ が `0.5*(18-9.8)*25*TW.rankineKa(30)`≈34.17、Pw が `0.5*9.8*25`=122.5 と一致。
- [ ] **Step 5: バリデーション** — Hw=6（H=5超）で「地下水位 Hw は 0〜H(壁高) の範囲で。」が出て描画停止。
- スクリーンショットで水位線と4ペイン連動を目視確認。

---

## Self-Review（記録）

- **Spec coverage:** Aw(Task1)、W_eff/Pw(Task2)、入力2つ/validate(Task3)、水位線/解説(Task4)、ブラウザ実証(Task5)、Hw=0回帰(Task1,2)、完全水没理論一致(Task2)、単調性(Task2)、README(Task3) — 仕様の各項に対応。
- **Placeholder scan:** なし（全コード実体）。
- **Type consistency:** `geometry` が `Aw` を返し、`solveWedge` が `W, Weff, Aw, Pw` を返す。`explain`/`drawSection` は `w.W/w.Weff/w.Aw/w.Pw`・`ctx.p.Hw/gammaw`・`vectors[3].fx` を参照（vectors順は V,C,R,P で固定）。`critPh` は `window.TrialWedge.solveWedge` を使用。すべて Task 間で整合。
- **回帰安全性:** `p.Hw||0`, `p.gammaw||0` 既定で Hw=0 → Aw=0, Weff=W, Pw=0。既存テストは水パラメータ無しのため不変。
