// node --test tools/scoring.test.js
// js/scoring.js 의 수락 기준.
const test = require('node:test');
const assert = require('node:assert');
const Scoring = require('../js/scoring.js');

const AXES = ['define', 'design', 'delegate', 'detect', 'decide', 'disclose'];

function norm(over) {
  const base = { define: 50, design: 50, delegate: 50, detect: 50, decide: 50, disclose: 50 };
  return Object.assign(base, over || {});
}

const ENDINGS = {
  prescriptions: Object.fromEntries(AXES.map(a => [a, { summary: `${a} 요약`, action30: `${a} 실천` }])),
  titles: {}, // evaluate는 칭호 문자열을 자체 규칙으로 산출
};

test('AXES 상수', () => {
  assert.deepStrictEqual(Scoring.AXES, AXES);
});

test('zero()는 6축 0', () => {
  const z = Scoring.zero();
  AXES.forEach(a => assert.strictEqual(z[a], 0));
});

test('add는 불변이며 누적된다', () => {
  const s0 = Scoring.zero();
  const s1 = Scoring.add(s0, { delegate: 2, detect: -1 });
  assert.strictEqual(s0.delegate, 0, '원본 불변');
  assert.strictEqual(s1.delegate, 2);
  assert.strictEqual(s1.detect, -1);
  const s2 = Scoring.add(s1, { delegate: 1 });
  assert.strictEqual(s2.delegate, 3);
});

test('normalize: 0~100 클램프', () => {
  const maxPerAxis = Object.fromEntries(AXES.map(a => [a, 10]));
  const n = Scoring.normalize(
    { define: -3, design: 5, delegate: 10, detect: 15, decide: 0, disclose: 2 },
    maxPerAxis
  );
  assert.strictEqual(n.define, 0, '음수는 0');
  assert.strictEqual(n.design, 50);
  assert.strictEqual(n.delegate, 100);
  assert.strictEqual(n.detect, 100, '상한 클램프');
  assert.strictEqual(n.decide, 0);
  assert.strictEqual(n.disclose, 20);
});

test('radarSVG: svg 문자열과 폴리곤 포함', () => {
  const svg = Scoring.radarSVG(norm(), { size: 320 });
  assert.ok(svg.trimStart().startsWith('<svg'));
  assert.ok(svg.includes('polygon'));
});

// ----- evaluate: 칭호 규칙 (위→아래 첫 매칭) -----

test('칭호: 전축 60 이상 → 신중한 오케스트레이터', () => {
  const r = Scoring.evaluate(norm({ define: 60, design: 70, delegate: 65, detect: 80, decide: 60, disclose: 90 }), [], ENDINGS);
  assert.strictEqual(r.title, '신중한 오케스트레이터');
});

test('칭호: delegate≤30 + fatigue 2개 → 고독한 장인', () => {
  const r = Scoring.evaluate(norm({ delegate: 20 }), ['fatigue_ch1', 'fatigue_ch2'], ENDINGS);
  assert.strictEqual(r.title, '고독한 장인');
});

test('칭호: delegate≥70 + detect≤40 → 브레이크 없는 위임러', () => {
  const r = Scoring.evaluate(norm({ delegate: 80, detect: 30 }), [], ENDINGS);
  assert.strictEqual(r.title, '브레이크 없는 위임러');
});

test('칭호: disclose 단독 최저 → 그림자 속 혁신가', () => {
  const r = Scoring.evaluate(norm({ disclose: 10 }), [], ENDINGS);
  assert.strictEqual(r.title, '그림자 속 혁신가');
});

test('칭호: detect 단독 최저 → 믿음의 항해사', () => {
  const r = Scoring.evaluate(norm({ detect: 10 }), [], ENDINGS);
  assert.strictEqual(r.title, '믿음의 항해사');
});

test('칭호: 그 외 → 성장하는 설계자', () => {
  const r = Scoring.evaluate(norm({ define: 10 }), [], ENDINGS);
  assert.strictEqual(r.title, '성장하는 설계자');
});

test('evaluate: 최저 2축과 그 처방을 반환', () => {
  const r = Scoring.evaluate(norm({ define: 10, disclose: 20 }), [], ENDINGS);
  assert.deepStrictEqual(r.weakest, ['define', 'disclose']);
  assert.strictEqual(r.prescriptions.length, 2);
  assert.strictEqual(r.prescriptions[0].axis, 'define');
  assert.strictEqual(r.prescriptions[0].summary, 'define 요약');
  assert.strictEqual(r.prescriptions[0].action30, 'define 실천');
});
