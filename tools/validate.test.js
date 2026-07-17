// node --test tools/validate.test.js
// validateGame(chapters, opts) 의 수락 기준.
// 반환: { errors: [{rule, msg}], warnings: [{rule, msg}] }  (rule: 1~6 정수)
const test = require('node:test');
const assert = require('node:assert');
const { validateGame } = require('./validate.js');

function rules(list) { return list.map(v => v.rule); }

// 최소 유효 챕터 생성기
function mkChapter(id, over) {
  return Object.assign({
    id, title: '테스트', month: '3월', intro: '도입.',
    start: `${id}_s01`,
    scenes: {
      [`${id}_s01`]: {
        type: 'decision', speaker: 'narrator', text: '상황', prompt: '어떻게?',
        choices: [
          { text: 'ㄱ', d: { define: 1 }, flags: [`${id}_flag`], result: '결과.', next: `${id}_s02` },
          { text: 'ㄴ', d: { delegate: 2, detect: -1 }, result: '결과.', next: `${id}_s02` },
          { text: 'ㄷ', d: { decide: 1, disclose: 1, design: 1 }, result: '결과.', next: `${id}_s02` },
        ],
      },
      [`${id}_s02`]: { type: 'narration', speaker: 'narrator', text: '끝.', next: 'END' },
    },
  }, over || {});
}

test('유효한 게임은 에러 없음', () => {
  const r = validateGame([mkChapter('ch1')], { minAxisDecisions: 1 });
  assert.deepStrictEqual(r.errors, []);
});

test('규칙1: 존재하지 않는 next 참조 검출', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s01'].choices[0].next = 'ch1_s99';
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(1));
});

test('규칙1: start가 존재하지 않는 scene이면 검출', () => {
  const ch = mkChapter('ch1', { start: 'ch1_s99' });
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(1));
});

test('규칙1: 다른 챕터의 scene을 next로 참조하면 에러 (엔진은 챕터 내부만 조회)', () => {
  const a = mkChapter('ch1');
  const b = mkChapter('ch2');
  a.scenes['ch1_s01'].choices[0].next = 'ch2_s01';
  const r = validateGame([a, b], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(1));
});

test('규칙3: 알 수 없는 scene.type은 에러', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s02'] = { type: 'cutscene', speaker: 'narrator', text: '끝.', next: 'END' };
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(3));
});

test('규칙2: 고아 scene은 경고', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s50'] = { type: 'narration', speaker: 'narrator', text: '고아.', next: 'END' };
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.warnings).includes(2));
});

test('규칙3: 선택지 2개는 에러', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s01'].choices = ch.scenes['ch1_s01'].choices.slice(0, 2);
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(3));
});

test('규칙3: 가중치 범위 초과(+3)와 축 키 오타 검출', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s01'].choices[0].d = { define: 3 };
  ch.scenes['ch1_s01'].choices[1].d = { deleg: 1 };
  const r = validateGame([ch], { minAxisDecisions: 1 });
  const msgs = r.errors.filter(e => e.rule === 3);
  assert.ok(msgs.length >= 2);
});

test('규칙4: 축별 최소 결정 수 미달 검출', () => {
  // mkChapter 하나에는 각 축이 1회씩만 등장 → 기본 임계값 4에서 실패해야 함
  const r = validateGame([mkChapter('ch1')]); // opts 생략 = minAxisDecisions 4
  assert.ok(rules(r.errors).includes(4));
});

test('규칙5: 생산되지 않는 플래그를 branch가 참조하면 에러', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s02'] = {
    type: 'branch',
    branches: [{ ifFlags: ['ghost_flag'], next: 'ch1_s03' }],
    default: 'ch1_s03',
  };
  ch.scenes['ch1_s03'] = { type: 'narration', speaker: 'narrator', text: '끝.', next: 'END' };
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(5));
});

test('규칙5: "!" 접두사 플래그도 생산 여부를 검사', () => {
  const ch = mkChapter('ch1');
  ch.scenes['ch1_s02'] = {
    type: 'branch',
    branches: [{ ifFlags: ['!ghost_flag'], next: 'ch1_s03' }],
    default: 'ch1_s03',
  };
  ch.scenes['ch1_s03'] = { type: 'narration', speaker: 'narrator', text: '끝.', next: 'END' };
  const r = validateGame([ch], { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(5));
});

// ----- 규칙 6: 5챕터 구성일 때만 검사 -----
function mkFiveChapters() {
  const chs = [mkChapter('ch1'), mkChapter('ch2'), mkChapter('ch3'), mkChapter('ch4')];
  const ch5 = mkChapter('ch5');
  // 사건 6종 + 각각을 게이트하는 branch
  const evNames = ['privacy', 'promise', 'hidden', 'error', 'explain', 'overrun'];
  const branches = evNames.slice(0, 5).map((n, i) => ({ ifFlags: [`ch${i + 1}_flag`], next: `ch5_ev_${n}` }));
  ch5.scenes['ch5_s02'] = { type: 'branch', branches, default: 'ch5_ev_overrun' };
  ch5.scenes['ch5_s01'].choices[0].next = 'ch5_s02';
  evNames.forEach(n => {
    ch5.scenes[`ch5_ev_${n}`] = { type: 'narration', speaker: 'narrator', text: `사건 ${n}.`, next: 'END' };
  });
  // ch1_flag~ch4_flag는 각 챕터에서 생산됨(mkChapter가 `${id}_flag` 생산). ch5_flag도 생산됨.
  chs.push(ch5);
  return chs;
}

test('규칙6: 사건 6종이 모두 있으면 통과', () => {
  const r = validateGame(mkFiveChapters(), { minAxisDecisions: 1 });
  assert.deepStrictEqual(r.errors.filter(e => e.rule === 6), []);
});

test('규칙6: 사건 scene이 6종 미만이면 에러', () => {
  const chs = mkFiveChapters();
  delete chs[4].scenes['ch5_ev_privacy'];
  chs[4].scenes['ch5_s02'].branches = chs[4].scenes['ch5_s02'].branches.slice(1);
  const r = validateGame(chs, { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(6));
});

test('규칙6: branch가 게이트하지 않는 사건 scene은 에러', () => {
  const chs = mkFiveChapters();
  // privacy 사건을 branch 게이트 없이 일반 next로만 연결
  chs[4].scenes['ch5_s02'].branches = chs[4].scenes['ch5_s02'].branches.slice(1);
  chs[4].scenes['ch5_s01'].choices[1].next = 'ch5_ev_privacy';
  const r = validateGame(chs, { minAxisDecisions: 1 });
  assert.ok(rules(r.errors).includes(6));
});
