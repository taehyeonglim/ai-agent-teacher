# 시나리오 데이터 스키마 v1

《위임의 기술》 챕터 데이터 파일의 계약서. 챕터 집필자는 이 문서를 어길 수 없다.
구조 위반은 `node tools/validate.js`가 기계적으로 검출한다.

## 등록 형식

각 챕터 파일은 다음 형식으로 자신을 등록한다:

```js
(function () {
  window.GAME_DATA = window.GAME_DATA || { chapters: [] };
  window.GAME_DATA.chapters[N] = CHAPTER; // N: 0-based 챕터 인덱스 (chapter1.js → 0)
})();
```

Node 환경(검증기)에서도 로드되므로 `window` 외의 전역은 절대 만들지 않는다.

## CHAPTER 객체

```js
{
  id: "ch1",            // "ch1"~"ch5"
  title: "새 학기",      // 챕터 표지 제목
  month: "3월",
  intro: "챕터 도입 문단 (2~3문장)",
  start: "ch1_s01",     // 시작 scene id
  scenes: { /* <sceneId>: SCENE, ... */ }
}
```

## SCENE 객체 — type별 3종

```js
// 1) 서술 scene
{ type: "narration",
  speaker: "narrator" | "onsaemi" | "student" | "parent" | "colleague" | "principal",
  text: "본문. \n\n 으로 문단 구분.",
  next: "sceneId" | "END" }        // "END" = 챕터 종료

// 2) 결정 scene
{ type: "decision",
  speaker: "...", text: "상황 제시",
  prompt: "결정 질문 한 줄",
  choices: [ /* CHOICE 3~4개 */ ] }

// 3) 조건 분기 scene (본문 없음, 즉시 라우팅)
{ type: "branch",
  branches: [ { ifFlags: ["flagA", "!flagB"], next: "sceneId" } /* , ... */ ],
  default: "sceneId" }              // "!" 접두사 = 플래그 부재 조건
```

## CHOICE 객체

```js
{ text: "선택지 문구 (행동 문장, 40자 이내)",
  d: { delegate: 2, detect: -1 },  // 6D 가중치, 정수 -2~+2, 1~3개 축만
  flags: ["roster_protected"],      // 이 선택이 남기는 플래그 (선택적)
  result: "선택 직후 서사적 결과 2~4문장. 점수·정답 언급 금지.",
  next: "sceneId" | "END" }
```

6D 축 키(정확히 이 철자만): `define`, `design`, `delegate`, `detect`, `decide`, `disclose`

## 작성 규칙

- scene id는 `ch<챕터번호>_s<2자리>` (예: `ch3_s07`). 결과 전용 scene은 `ch1_s03a`처럼 접미사 허용. 챕터 5의 레드팀 사건 scene은 `ch5_ev_<이름>` 형식.
- 모든 decision은 "잘 설계된 위임 / 무분별한 위임 / 과잉 회피" 스펙트럼을 포함할 것.
  과잉 회피 선택지에는 `fatigue_ch<N>` 플래그를 남겨 비용을 표현.
- 어떤 선택지도 전 축 만점이 되지 않게: 좋은 선택도 보통 1개 축은 0 또는 -1.
- 온새미(AI 에이전트)의 말투: 유능하고 적극적, 항상 더 많은 권한을 제안하지만 악의는 없음. 해요체.
- 텍스트에 "정답", "점수", "올바른" 같은 평가 단어 금지.
- 플래그명은 브리프에 명시된 철자를 그대로 사용한다. 새 플래그를 임의로 만들지 않는다.
