# 시나리오 팩 제작 가이드

《위임의 기술》의 엔진과 콘텐츠는 완전히 분리되어 있어, `js/data/`의 챕터 파일만
교체하면 다른 대상(중등, 관리자, 예비교사 등)을 위한 시나리오 팩을 만들 수 있습니다.

## 구조

| 파일 | 역할 |
|---|---|
| `js/data/schema.md` | 데이터 계약서 — scene 3종(narration/decision/branch), 선택지, 6D 가중치 규칙 |
| `js/data/chapter1.js` ~ `chapter5.js` | 챕터 데이터 (`window.GAME_DATA.chapters[N]`에 등록) |
| `js/data/endings.js` | 축별 처방·칭호 설명·에필로그·`maxPerAxis` |
| `js/data/art.js` | scene id → 삽화 경로 매핑 (없는 scene은 텍스트만 표시) |

엔진(`js/engine.js`)·점수(`js/scoring.js`)·복기(`js/review.js`)·UI(`js/bootstrap.js`)는
시나리오 내용을 전혀 모릅니다 — 건드릴 필요가 없습니다.

## 새 팩을 만드는 순서

1. **브리프 작성** — `docs/superpowers/plans/chapter-briefs/`의 형식을 참고해
   챕터별 결정·플래그·가중치 방향을 먼저 설계합니다. 플래그 철자가 챕터 간 계약입니다.
2. **집필** — `schema.md`를 지키며 챕터 파일을 작성합니다. 규칙 요약:
   - 결정마다 "잘 설계된 위임 / 무분별한 위임 / 과잉 회피" 스펙트럼 포함
   - 과잉 회피에는 `fatigue_ch<N>` 플래그로 비용 부여
   - 마지막 챕터에 `ch5_ev_*` 사건 6종 (branch로만 진입)
3. **구조 검증** — `node tools/validate.js`
   (참조 무결성, 도달성, 축별 결정 수, 플래그 정합성, 사건 게이트를 기계 검사)
4. **만점 갱신** — 검증기가 출력하는 "이론 최대점"을 참고해
   `endings.js`의 `maxPerAxis`를 조정합니다 (사건 없는 모범 경로 기준 권장).
5. **밸런스 검증** —
   - `node tools/playthrough.js` : 모범/남용/회피 3전략이 의도한 칭호에 도달하는지
   - `node tools/montecarlo.js` : 무작위 1,000회에서 칭호 분포·사건 발화율이 고른지
6. **로직 회귀** — `node --test tools/*.test.js`

CI(GitHub Actions)가 push마다 3·6단계와 플레이스루를 자동 실행합니다.

## 캐시버스팅 규칙

`index.html`의 스크립트는 `?v=N` 쿼리로 캐시를 무효화합니다.
**js/css를 수정해 배포할 때는 v를 1 올려 주세요** (GitHub Pages가 JS를 10분 캐시하므로,
버전을 올리지 않으면 배포 직후 새 HTML + 옛 JS 조합이 생길 수 있습니다).

## 삽화

- 강의 덱 무드: 잉크+수채, 크림 종이, 올리브·세피아. `images/` 원본은 git 제외,
  웹에는 `img/scenes/*.webp`(960px) + jpg 폴백을 씁니다.
- 시리즈 일관성을 위한 스타일 잠금 문구는 이 저장소 히스토리의
  "order-ch*.md" 지시서 형식을 참고하세요 (온새미=올리브 구체, 교사=뒷모습/손, 텍스트 금지).
