# 결과창 설명 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결과창(본인·공유)에 점수 기준 문구, 구간 해석 배지, 축별 정의, 처방 선정 이유를 추가한다.

**Architecture:** 구간 판정(`bandOf`)은 계산 계층인 `js/scoring.js`에 순수 함수로 두고 Node 테스트로 검증한다. 화면 표현은 `js/bootstrap.js`에 공용 헬퍼 `scoreListHTML()`로 추출해 본인 결과(`showEnding`)와 공유 결과(`showSharedResult`)가 공유한다. 에필로그 분기(60/35)와 배지 구간이 같은 `Scoring.BANDS` 상수를 쓴다.

**Tech Stack:** 바닐라 JS (IIFE, ES5 스타일 bootstrap / ES6 scoring), `node:test`, GitHub Pages 정적 배포.

**Spec:** `docs/superpowers/specs/2026-07-17-ending-explain-design.md`

## Global Constraints

- 시나리오 데이터·`maxPerAxis` 변경 금지 (검증기 재튜닝 불필요 상태 유지).
- 칭호 판정 기준은 화면에 공개하지 않는다.
- 문구 확정본 (그대로 사용):
  - 캡션: `각 점수는 모범적으로 한 학기를 보냈을 때를 100으로 환산한 값입니다.`
  - 배지: high `● 안정` / mid `◐ 성장 중` / low `○ 돌아볼 지점`
  - 처방 소제목: `다음 학기를 위한 처방 — 여섯 축 가운데 상대적으로 아쉬웠던 두 축입니다.` (`다음 학기를 위한 처방`은 bold)
  - PNG 기준 문구: `각 축은 모범적인 한 학기를 100으로 환산한 점수입니다`
- 정의 문구는 기존 `D6_DEFS` 배열을 그대로 재사용 (새 문구 작성 금지).
- 마지막 태스크에서 `index.html`의 캐시버스팅 `?v=4` → `?v=5` (css·js 전부 13곳).
- 테스트 실행은 CI와 같은 명령을 쓴다: `node --test tools/scoring.test.js tools/engine.test.js tools/validate.test.js tools/review.test.js` (`node --test tools/`는 비테스트 스크립트까지 실행돼 실패하므로 금지). 베이스라인 49개 통과.
- HTML 삽입 문자열은 반드시 `esc()`를 거친다 (bootstrap.js 기존 규칙).
- 커밋 메시지는 기존 한국어 컨벤션 (`feat:`, `docs:` 등) + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: scoring.js — BANDS 상수와 bandOf() 구간 판정

**Files:**
- Modify: `js/scoring.js` (마지막 `return Object.freeze(...)` 및 상수 영역)
- Test: `tools/scoring.test.js` (파일 끝에 추가)

**Interfaces:**
- Consumes: 없음 (독립).
- Produces: `Scoring.BANDS` → `{ high: 60, mid: 35 }` (frozen 객체의 프로퍼티), `Scoring.bandOf(value: number) => 'high' | 'mid' | 'low'`. Task 2가 `Scoring.bandOf(normalized[a])`와 `epilogues[Scoring.bandOf(avg)]`로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tools/scoring.test.js` 파일 맨 끝에 추가:

```js

// ----- bandOf: 점수 구간 해석 (결과창 배지·에필로그 공용) -----

test('bandOf: 구간 경계 60/35', () => {
  assert.strictEqual(Scoring.bandOf(100), 'high');
  assert.strictEqual(Scoring.bandOf(60), 'high');
  assert.strictEqual(Scoring.bandOf(59), 'mid');
  assert.strictEqual(Scoring.bandOf(35), 'mid');
  assert.strictEqual(Scoring.bandOf(34), 'low');
  assert.strictEqual(Scoring.bandOf(0), 'low');
  assert.strictEqual(Scoring.bandOf(undefined), 'low', '비수치는 low');
});

test('BANDS 상수 노출 (에필로그 임계값과 동일)', () => {
  assert.deepStrictEqual(Scoring.BANDS, { high: 60, mid: 35 });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tools/scoring.test.js`
Expected: FAIL 2건 — `Scoring.bandOf is not a function` 류의 TypeError.

- [ ] **Step 3: 구현**

`js/scoring.js`에서 `const RECKLESS_FLAGS = [` 바로 앞에 추가:

```js
  // 점수 해석 구간 — 축별 배지와 에필로그(평균) 분기가 같은 기준을 쓴다.
  const BANDS = Object.freeze({ high: 60, mid: 35 });

  function bandOf(value) {
    const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    if (v >= BANDS.high) return 'high';
    if (v >= BANDS.mid) return 'mid';
    return 'low';
  }
```

같은 파일 마지막 줄의 공개 객체를 교체:

```js
  return Object.freeze({ AXES, BANDS, zero, add, normalize, radarSVG, evaluate, bandOf });
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tools/scoring.test.js`
Expected: `pass 15` / `fail 0` (기존 13 + 신규 2).

- [ ] **Step 5: 커밋**

```bash
git add js/scoring.js tools/scoring.test.js
git commit -m "feat: 점수 구간 판정 bandOf·BANDS 추가 (배지·에필로그 공용 기준)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: bootstrap.js 점수 리스트 공통화 + 설명 표시 + CSS

**Files:**
- Modify: `js/bootstrap.js` (`AXIS_LABEL`~`D6_DEFS` 부근, `showSharedResult`, `showEnding`)
- Modify: `css/game.css` (`.radar-scores` 규칙 및 그 아래)

**Interfaces:**
- Consumes: Task 1의 `Scoring.bandOf(value)`, `Scoring.BANDS`.
- Produces: `scoreListHTML(normalized) => string` (bootstrap IIFE 내부 함수 — 캡션 `<p>` + `<ul class="radar-scores">` HTML 반환), 모듈 스코프 상수 `BAND_LABEL`, `RX_HEAD`. 외부 공개 없음.

- [ ] **Step 1: 헬퍼 추가**

`js/bootstrap.js`에서 `D6_DEFS` 배열 정의(`];`로 끝나는 부분, `var TITLE_ORDER` 직전)에 이어서 추가:

```js
  // 구간 배지 문구 — Scoring.bandOf 판정을 화면 표현으로 바꾼다.
  var BAND_LABEL = { high: '● 안정', mid: '◐ 성장 중', low: '○ 돌아볼 지점' };

  // 점수 리스트 — 본인 결과·공유 결과 화면 공용.
  // 각 행: 축 라벨 + 점수 + 구간 배지 + 정의 한 줄(D6_DEFS 재사용, AXES와 같은 순서).
  function scoreListHTML(normalized) {
    var rows = Scoring.AXES.map(function (a, i) {
      var band = Scoring.bandOf(normalized[a]);
      return '<li><div class="score-row"><span>' + esc(AXIS_LABEL[a]) + '</span>' +
        '<span class="score-val"><b>' + normalized[a] + '</b>' +
        '<span class="band band-' + band + '">' + esc(BAND_LABEL[band]) + '</span></span></div>' +
        '<p class="axis-def">' + esc(D6_DEFS[i][1]) + '</p></li>';
    }).join('');
    return '<p class="score-caption">각 점수는 모범적으로 한 학기를 보냈을 때를 100으로 환산한 값입니다.</p>' +
      '<ul class="radar-scores">' + rows + '</ul>';
  }

  // 처방 선정 이유 — 최저 2축이 뽑히는 구조를 화면에서 설명한다.
  var RX_HEAD = '<div class="rx-head"><b>다음 학기를 위한 처방</b> — 여섯 축 가운데 상대적으로 아쉬웠던 두 축입니다.</div>';
```

- [ ] **Step 2: showSharedResult 적용**

`showSharedResult` 안에서 아래 블록을 삭제:

```js
    var scoreList = Scoring.AXES.map(function (a) {
      return '<li><span>' + esc(AXIS_LABEL[a]) + '</span><b>' + shared.normalized[a] + '</b></li>';
    }).join('');
```

같은 함수의 HTML에서 아래 두 줄을:

```js
      '<ul class="radar-scores" aria-label="6D 축별 점수 (100점 만점)">' + scoreList + '</ul>' +
      '<div class="rx-list">' + verdict.prescriptions.map(function (p) {
```

다음으로 교체 (`scoreListHTML` 호출은 `'<div class="radar">...'` 줄 다음 위치):

```js
      scoreListHTML(shared.normalized) +
      RX_HEAD +
      '<div class="rx-list">' + verdict.prescriptions.map(function (p) {
```

- [ ] **Step 3: showEnding 적용**

`showEnding` 안에서 아래 블록을 삭제:

```js
    var scoreList = Scoring.AXES.map(function (a) {
      return '<li><span>' + esc(AXIS_LABEL[a]) + '</span><b>' + normalized[a] + '</b></li>';
    }).join('');
```

에필로그 선택식을 교체 — 기존:

```js
    var epilogue = avg >= 60 ? epilogues.high : avg >= 35 ? epilogues.mid : epilogues.low;
```

교체:

```js
    var epilogue = epilogues[Scoring.bandOf(avg)];
```

같은 함수의 HTML에서 아래 두 줄을:

```js
      '<ul class="radar-scores" aria-label="6D 축별 점수 (100점 만점)">' + scoreList + '</ul>' +
      '<div class="rx-list">' + rx + '</div>' +
```

다음으로 교체:

```js
      scoreListHTML(normalized) +
      RX_HEAD +
      '<div class="rx-list">' + rx + '</div>' +
```

- [ ] **Step 4: CSS 반영**

`css/game.css`에서 기존 규칙 두 개를 교체 — 기존:

```css
.radar-scores {
  list-style: none;
  padding: 0;
  margin: var(--space-4, 16px) auto var(--space-6, 24px);
  max-width: 340px;
}
.radar-scores li {
  display: flex;
  justify-content: space-between;
  padding: 4px 2px;
  border-bottom: 1px dotted var(--rule-line, #cdbf95);
  font-size: 0.9rem;
  color: var(--ink-600, #5c5140);
}
```

교체 (행 내부 정렬은 `.score-row`가 담당하므로 li는 블록 흐름):

```css
.radar-scores {
  list-style: none;
  padding: 0;
  margin: 6px auto var(--space-6, 24px);
  max-width: 340px;
}
.radar-scores li {
  padding: 6px 2px;
  border-bottom: 1px dotted var(--rule-line, #cdbf95);
  font-size: 0.9rem;
  color: var(--ink-600, #5c5140);
}
```

`.radar-scores li b { ... }` 줄 바로 아래에 추가:

```css
.score-caption {
  margin: var(--space-4, 16px) auto 4px;
  max-width: 340px;
  font-size: 0.82rem;
  color: var(--ink-500, #6f634e);
}
.score-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.score-val { display: flex; align-items: baseline; gap: 8px; }
.band { font-size: 0.76rem; white-space: nowrap; color: var(--ink-500, #6f634e); }
.band-high { color: var(--olive-700, #4b5528); }
.band-low { color: var(--wax-red-600, #9a3a2a); }
.axis-def { margin: 2px 0 4px; font-size: 0.8rem; line-height: 1.5; color: var(--ink-500, #6f634e); }
.rx-head { margin: 0 0 12px; font-size: 0.92rem; color: var(--ink-700, #4a4030); }
```

- [ ] **Step 5: 회귀 테스트 + 브라우저 스모크**

Run: `node --test tools/scoring.test.js tools/engine.test.js tools/validate.test.js tools/review.test.js`
Expected: `pass 51` / `fail 0`.

Run: `python3 -m http.server 8000` (저장소 루트, 백그라운드) 후 브라우저에서
`http://localhost:8000/#r=0.72.45.30.80.60.55` 접속.
Expected: 공유 결과 화면에 ① 캡션 문구, ② 각 축 행에 점수+배지(72 ● 안정 / 45 ◐ 성장 중 / 30 ○ 돌아볼 지점)+정의 한 줄, ③ 처방 위 소제목이 보인다. 콘솔 오류 없음. 확인 후 서버 종료.

- [ ] **Step 6: 커밋**

```bash
git add js/bootstrap.js css/game.css
git commit -m "feat: 결과창 점수 기준·구간 배지·축 정의·처방 이유 표시 (본인·공유 공통)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: PNG 기준 문구 + 캐시버스팅 + 전체 검증

**Files:**
- Modify: `js/bootstrap.js` (`saveResultImage` 내부)
- Modify: `index.html` (`?v=4` 13곳)

**Interfaces:**
- Consumes: 없음 (Task 2와 독립인 캔버스 코드).
- Produces: 없음 (최종 태스크).

- [ ] **Step 1: PNG 캔버스에 기준 문구 추가**

`js/bootstrap.js`의 `saveResultImage` 안, 아래 기존 코드 직전에:

```js
      ctx.textAlign = 'center'; ctx.fillStyle = '#8c7f66'; ctx.font = '14px serif';
      ctx.fillText('6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD 종합, 임태형(전주교육대학교) 재구성', W / 2, 980);
```

다음을 삽입 (막대 목록 y≈890과 크레딧 y=980 사이):

```js
      ctx.textAlign = 'center'; ctx.fillStyle = '#8c7f66'; ctx.font = '16px serif';
      ctx.fillText('각 축은 모범적인 한 학기를 100으로 환산한 점수입니다', W / 2, 936);
```

- [ ] **Step 2: 캐시버스팅 버전 갱신**

Run: `sed -i '' 's/?v=4/?v=5/g' index.html`
확인: `grep -c "?v=5" index.html` → Expected: `13`, `grep -c "?v=4" index.html` → Expected: `0`.

- [ ] **Step 3: 전체 검증 (CI와 동일 3단계)**

```bash
node tools/validate.js
node --test tools/scoring.test.js tools/engine.test.js tools/validate.test.js tools/review.test.js
node tools/playthrough.js
```

Expected: 검증기 통과, `pass 51`, 플레이스루 칭호 3종 정상 출력.

- [ ] **Step 4: PNG 스모크 (수동)**

`python3 -m http.server 8000` 재기동 → `http://localhost:8000/#r=0.72.45.30.80.60.55`는 공유 화면이라 저장 버튼이 없으므로, 저장 버튼 검증은 실제 플레이 결과 화면에서만 가능. 대신 브라우저 콘솔에서 오류 없이 로드되는지만 재확인 (PNG 코드는 문구 1줄 추가라 위험도 낮음).

- [ ] **Step 5: 커밋 & 푸시**

```bash
git add js/bootstrap.js index.html
git commit -m "feat: 결과 PNG에 점수 기준 문구 + 캐시버스팅 v5

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

푸시 후 `gh run watch` 또는 Actions에서 CI(검증기+테스트+플레이스루) 통과 확인.
