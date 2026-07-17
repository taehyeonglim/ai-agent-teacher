// node tools/montecarlo.js — 무작위 플레이 1000회로 밸런스 분포를 점검한다.
'use strict';
global.window = {};
require('../js/data/chapters.js');
['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5'].forEach(f => require(`../js/data/${f}.js`));
require('../js/data/endings.js');
const Engine = require('../js/engine.js');
const Scoring = require('../js/scoring.js');
const data = global.window.GAME_DATA;

const N = 1000;
const titles = {}, axisMin = {}, axisMax = {}, axisSum = {};
const eventHits = {}; let clamped100 = 0, decisionsTotal = 0;
Scoring.AXES.forEach(a => { axisMin[a] = 101; axisMax[a] = -1; axisSum[a] = 0; });

for (let run = 0; run < N; run++) {
  let view = null, fin = null, guard = 0;
  const inst = Engine.create(data, { render: v => { view = v; }, onEnd: s => { fin = s; } });
  inst.start();
  const seen = new Set();
  while (!fin && guard++ < 400) {
    if (view.kind === 'scene') seen.add(view.sceneId);
    if (view.kind === 'scene' && view.scene.type === 'decision') {
      decisionsTotal++;
      inst.choose(Math.floor(Math.random() * view.scene.choices.length));
    } else inst.continue_();
  }
  if (!fin) { console.error('미종료 런 발견'); process.exit(1); }
  const n = Scoring.normalize(fin.scores, data.maxPerAxis);
  const v = Scoring.evaluate(n, fin.flags, data.endings);
  titles[v.title] = (titles[v.title] || 0) + 1;
  Scoring.AXES.forEach(a => {
    axisMin[a] = Math.min(axisMin[a], n[a]); axisMax[a] = Math.max(axisMax[a], n[a]);
    axisSum[a] += n[a]; if (n[a] === 100) clamped100++;
  });
  seen.forEach(id => { if (id.startsWith('ch5_ev_')) eventHits[id] = (eventHits[id] || 0) + 1; });
}

console.log('=== 칭호 분포 (' + N + '회 무작위) ===');
Object.entries(titles).sort((a, b) => b[1] - a[1]).forEach(([t, c]) =>
  console.log(`${t}: ${(c / N * 100).toFixed(1)}%`));
console.log('\n=== 정규화 점수 축별 [min/평균/max] ===');
Scoring.AXES.forEach(a =>
  console.log(`${a}: ${axisMin[a]} / ${(axisSum[a] / N).toFixed(0)} / ${axisMax[a]}`));
console.log('\n=== ch5 사건 발화율 ===');
Object.entries(eventHits).sort().forEach(([e, c]) =>
  console.log(`${e}: ${(c / N * 100).toFixed(1)}%`));
console.log(`\n결정 수/런 평균: ${(decisionsTotal / N).toFixed(1)}, 100 클램프 발생 축-런: ${clamped100}`);
