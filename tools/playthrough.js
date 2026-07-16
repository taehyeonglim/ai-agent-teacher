// node tools/playthrough.js — 전략별 자동 플레이스루로 밸런스·엔딩을 점검한다.
'use strict';
global.window = {};
require('../js/data/chapters.js');
['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5'].forEach(f => require(`../js/data/${f}.js`));
require('../js/data/endings.js');
const Engine = require('../js/engine.js');
const Scoring = require('../js/scoring.js');

const data = global.window.GAME_DATA;

function dSum(choice) {
  return Object.values(choice.d || {}).reduce((a, b) => a + b, 0);
}

const STRATEGIES = {
  '모범 위임': (choices) => choices.reduce((bi, c, i, arr) => (dSum(c) > dSum(arr[bi]) ? i : bi), 0),
  '전부 위임': (choices) => choices.reduce((bi, c, i, arr) => {
    const bad = ch => (ch.d && (ch.d.delegate < 0 || ch.d.decide < 0 || ch.d.detect < 0) ? dSum(ch) : dSum(ch) + 10);
    return bad(c) < bad(arr[bi]) ? i : bi;
  }, 0),
  '전부 회피': (choices) => {
    const fat = choices.findIndex(c => (c.flags || []).some(f => f.startsWith('fatigue_')));
    return fat >= 0 ? fat : choices.reduce((bi, c, i, arr) =>
      ((c.d && c.d.delegate || 0) < ((arr[bi].d && arr[bi].d.delegate) || 0) ? i : bi), 0);
  },
};

for (const [name, pick] of Object.entries(STRATEGIES)) {
  let view = null; let finished = null; let steps = 0; let decisions = 0;
  const inst = Engine.create(data, {
    render: v => { view = v; },
    onEnd: s => { finished = s; },
  });
  inst.start();
  while (!finished && steps < 500) {
    steps += 1;
    if (view.kind === 'scene' && view.scene.type === 'decision') {
      decisions += 1;
      inst.choose(pick(view.scene.choices));
    } else {
      inst.continue_();
    }
  }
  if (!finished) { console.error(`[${name}] 500스텝 내 종료 실패 — 무한 루프 의심`); process.exit(1); }
  const normalized = Scoring.normalize(finished.scores, data.maxPerAxis);
  const verdict = Scoring.evaluate(normalized, finished.flags, data.endings);
  console.log(`\n=== ${name} (결정 ${decisions}회, ${steps}스텝) ===`);
  console.log('원점수:', JSON.stringify(finished.scores));
  console.log('정규화:', JSON.stringify(normalized));
  console.log('칭호:', verdict.title, '| 최저축:', verdict.weakest.join(', '));
  console.log('플래그:', finished.flags.join(', ') || '(없음)');
}
console.log('\n플레이스루 3종 완료');
