// node --test tools/review.test.js
// js/review.js — buildReview(state, gameData) 의 수락 기준.
const test = require('node:test');
const assert = require('node:assert');
const Review = require('../js/review.js');

const GAME = {
  chapters: [{
    id: 'ch1', title: '테스트장', month: '3월', start: 'ch1_s01',
    scenes: {
      ch1_s01: {
        type: 'decision', speaker: 'onsaemi', text: '상황', prompt: '어떻게 할까?',
        choices: [
          { text: '무분별', d: { delegate: -2, detect: -1 }, flags: ['roster_leaked'], result: 'r', next: 'END' },
          { text: '소폭 아쉬움', d: { design: 1, detect: -2 }, result: 'r', next: 'END' },
          { text: '균형', d: { define: 2, delegate: 1 }, result: 'r', next: 'END' },
        ],
      },
    },
  }],
};

function st(history) { return { history, flags: [], scores: {} }; }

test('history를 결정 목록으로 변환하고 챕터 메타를 붙인다', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 2 }]), GAME);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].prompt, '어떻게 할까?');
  assert.strictEqual(items[0].choiceText, '균형');
  assert.strictEqual(items[0].chapter.title, '테스트장');
  assert.strictEqual(items[0].chapter.month, '3월');
});

test('가중치 합이 음수면 regret', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 0 }]), GAME);
  assert.strictEqual(items[0].regret, true);
});

test('합이 음수가 아니어도 -2 축이 있으면 regret', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 1 }]), GAME);
  assert.strictEqual(items[0].regret, true);
});

test('균형 선택은 regret 아님', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 2 }]), GAME);
  assert.strictEqual(items[0].regret, false);
});

test('regret 항목은 음수 축 목록(weakAxes)을 낮은 값부터 담는다', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 0 }]), GAME);
  assert.deepStrictEqual(items[0].weakAxes, ['delegate', 'detect']);
});

test('위험 플래그(무분별 위임 계열)는 riskFlags로 표시', () => {
  const items = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 0 }]), GAME);
  assert.deepStrictEqual(items[0].riskFlags, ['roster_leaked']);
  const clean = Review.buildReview(st([{ sceneId: 'ch1_s01', choiceIndex: 2 }]), GAME);
  assert.deepStrictEqual(clean[0].riskFlags, []);
});

test('존재하지 않는 scene/choice는 조용히 건너뛴다', () => {
  const items = Review.buildReview(st([
    { sceneId: 'ghost', choiceIndex: 0 },
    { sceneId: 'ch1_s01', choiceIndex: 9 },
    { sceneId: 'ch1_s01', choiceIndex: 2 },
  ]), GAME);
  assert.strictEqual(items.length, 1);
});

test('state가 비어도 빈 배열 반환', () => {
  assert.deepStrictEqual(Review.buildReview(null, GAME), []);
  assert.deepStrictEqual(Review.buildReview({}, GAME), []);
});
