// node --test tools/engine.test.js
// js/engine.js 의 수락 기준.
const test = require('node:test');
const assert = require('node:assert');

// localStorage 모킹 (각 테스트에서 초기화)
function mockStorage() {
  const store = {};
  globalThis.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    _store: store,
  };
  return store;
}

const Engine = require('../js/engine.js');

function fixture() {
  return {
    chapters: [
      {
        id: 'chA', title: 'A장', month: '3월', intro: 'A 도입.', start: 'a_s01',
        scenes: {
          a_s01: {
            type: 'decision', speaker: 'narrator', text: '상황.', prompt: '어떻게?',
            choices: [
              { text: 'ㄱ', d: { delegate: 1 }, flags: ['tookA'], result: '결과ㄱ.', next: 'a_br' },
              { text: 'ㄴ', d: { detect: 1 }, result: '결과ㄴ.', next: 'a_br' },
              { text: 'ㄷ', d: { define: 1 }, result: '결과ㄷ.', next: 'a_missing' },
            ],
          },
          a_br: {
            type: 'branch',
            branches: [
              { ifFlags: ['tookA'], next: 'a_s02' },
              { ifFlags: ['!tookA'], next: 'a_s03' },
            ],
            default: 'a_s03',
          },
          a_s02: { type: 'narration', speaker: 'narrator', text: 'A2.', next: 'END' },
          a_s03: { type: 'narration', speaker: 'narrator', text: 'A3.', next: 'END' },
        },
      },
      {
        id: 'chB', title: 'B장', month: '4월', intro: 'B 도입.', start: 'b_s01',
        scenes: {
          b_s01: { type: 'narration', speaker: 'narrator', text: 'B1.', next: 'END' },
        },
      },
    ],
  };
}

function harness(data) {
  const views = [];
  let ended = null;
  const inst = Engine.create(data || fixture(), {
    render: v => views.push(v),
    onEnd: s => { ended = s; },
  });
  return { inst, views, last: () => views[views.length - 1], ended: () => ended };
}

test('start()는 챕터 인트로를 렌더한다', () => {
  mockStorage();
  const h = harness();
  h.inst.start();
  assert.strictEqual(h.last().kind, 'chapterIntro');
  assert.strictEqual(h.last().chapter.id, 'chA');
});

test('인트로에서 continue_() → 시작 scene', () => {
  mockStorage();
  const h = harness();
  h.inst.start();
  h.inst.continue_();
  assert.strictEqual(h.last().kind, 'scene');
  assert.strictEqual(h.last().sceneId, 'a_s01');
});

test('choose()는 점수·플래그를 누적하고 choiceResult를 렌더한다', () => {
  mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(0);
  assert.strictEqual(h.last().kind, 'choiceResult');
  assert.strictEqual(h.last().choice.text, 'ㄱ');
  const st = h.inst.getState();
  assert.strictEqual(st.scores.delegate, 1);
  assert.ok(st.flags.includes('tookA'));
  assert.strictEqual(st.history.length, 1);
});

test('branch는 입력 없이 플래그로 라우팅된다 (양성 조건)', () => {
  mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(0);      // tookA 생산, next: a_br
  h.inst.continue_();    // branch 통과
  assert.strictEqual(h.last().kind, 'scene');
  assert.strictEqual(h.last().sceneId, 'a_s02');
});

test('branch의 "!" 부재 조건 라우팅', () => {
  mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(1);      // 플래그 없음
  h.inst.continue_();
  assert.strictEqual(h.last().sceneId, 'a_s03');
});

test('END → 다음 챕터 인트로, 마지막 챕터 END → onEnd(state)', () => {
  mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(0); h.inst.continue_();   // a_s02
  h.inst.continue_();                      // END → chB 인트로
  assert.strictEqual(h.last().kind, 'chapterIntro');
  assert.strictEqual(h.last().chapter.id, 'chB');
  h.inst.continue_();                      // b_s01
  h.inst.continue_();                      // END → 게임 종료
  assert.ok(h.ended(), 'onEnd 호출됨');
  assert.strictEqual(h.ended().scores.delegate, 1);
});

test('깨진 next 참조 → console.warn + 현재 챕터 start로 폴백', () => {
  mockStorage();
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    const h = harness();
    h.inst.start(); h.inst.continue_();
    h.inst.choose(2);      // next: a_missing
    h.inst.continue_();
    assert.strictEqual(h.last().sceneId, 'a_s01', '챕터 시작점 폴백');
    assert.ok(warns.length >= 1);
  } finally {
    console.warn = origWarn;
  }
});

test('전이마다 저장되고 Engine.load()로 이어하기 가능', () => {
  const store = mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(0);
  assert.ok(store['wiim_save_v1'], '저장됨');
  const saved = Engine.load();
  assert.ok(saved);
  const h2 = harness();
  h2.inst.start(saved);
  const st = h2.inst.getState();
  assert.strictEqual(st.scores.delegate, 1);
  assert.ok(st.flags.includes('tookA'));
});

test('게임 종료 시 ended 상태가 저장된다', () => {
  const store = mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_();
  h.inst.choose(0); h.inst.continue_();   // a_s02
  h.inst.continue_();                      // END → chB 인트로
  h.inst.continue_(); h.inst.continue_();  // b_s01 → END → 종료
  assert.ok(h.ended());
  const saved = JSON.parse(store['wiim_save_v1']);
  assert.strictEqual(saved.phase, 'ended');
});

test('reset()은 저장을 지우고 처음으로 돌아간다', () => {
  const store = mockStorage();
  const h = harness();
  h.inst.start(); h.inst.continue_(); h.inst.choose(0);
  h.inst.reset();
  assert.strictEqual(store['wiim_save_v1'], undefined);
  assert.strictEqual(h.last().kind, 'chapterIntro');
  assert.strictEqual(h.last().chapter.id, 'chA');
  assert.strictEqual(h.inst.getState().scores.delegate, 0);
});

test('localStorage가 없어도 예외 없이 진행된다', () => {
  delete globalThis.localStorage;
  const h = harness();
  assert.doesNotThrow(() => {
    h.inst.start(); h.inst.continue_(); h.inst.choose(0); h.inst.continue_();
  });
  assert.strictEqual(Engine.load(), null);
});
