# 챕터 5 브리프 — 사건 (7월 · 위기 대응, 6D 종합)

- 파일: `js/data/chapter5.js`, `window.GAME_DATA.chapters[4]`, id `"ch5"`
- 핵심 훈련: **6D 종합** — 앞 챕터의 누적 선택이 발화한다. 레드팀 6질문의 극화.
- **구조 규칙(검증기 규칙 6이 강제): 사건 scene id는 `ch5_ev_<이름>` 6종, 각각 branch로만 진입.**

## 흐름 (고정 구조)

```
s01 narration(방학 2주 전, 학기말 업무 폭주 — 불길한 고요)
→ s02 decision D0(온새미가 "학기말 업무 일괄 처리 모드"를 제안 — 마지막 위임 결정)
→ s03 branch#0 : default → ch5_ev_overrun        (공통 사건: 권한 초과 실행)
→ ch5_ev_overrun (narration) → s04 decision(사건 대응) 
→ s05 branch#A : 데이터·소통 계열 사건 1개 선택
     [roster_leaked] → ch5_ev_privacy
     [auto_send_enabled] → ch5_ev_promise
     [promise_unchecked] → ch5_ev_promise
     [no_disclosure] → ch5_ev_hidden
     default → s05a(평온 — 방어 성공 서사, 짧은 narration)
→ (각 사건 → 대응 decision 1개 → 합류)
→ s06 branch#B : 평가·설명 계열 사건 1개 선택
     [error_ignored] → ch5_ev_error
     [sources_unchecked] → ch5_ev_error
     [no_review_step] → ch5_ev_explain
     default → s06a(평온)
→ (각 사건 → 대응 decision 1개 → 합류)
→ s07 narration(수습 후, 교무실 저녁) → s08 decision D-final(다음 학기 원칙 선언)
→ s09 narration(방학식) → END
```

## 사건 6종 (레드팀 6질문 매핑)

| scene id | 레드팀 질문 | 사건 내용 |
|---|---|---|
| `ch5_ev_overrun` | AI가 의도보다 많은 일을 실행하면? | "일괄 처리 모드" 중 온새미가 위임 범위 밖 업무(생활기록부 초안 자동 입력 시도)까지 진행하려다 발견됨 |
| `ch5_ev_privacy` | 학생 데이터가 외부에 남으면? | 5월에 넘긴 상담기록이 온새미 로그에 남아 있고, 교육청 감사에서 소명 요구 |
| `ch5_ev_promise` | 학부모가 이의를 제기하면? | 박세라가 '매주 리포트' 약속 불이행/자동발송 오류에 정식 민원 |
| `ch5_ev_hidden` | AI 사용이 공개되지 않으면? | 학부모 커뮤니티에 "5학년 2반 통신문, AI가 쓴 것"이라는 글 — 숨겼기에 더 커진 불신 |
| `ch5_ev_error` | 잘못된 정보를 확신 있게 사용하면? | 4월의 무시된 채점 오류(또는 출처 불명 자료)가 성적 이의신청으로 돌아옴 |
| `ch5_ev_explain` | 교사가 과정을 설명할 수 없다면? | 교감 앞에서 피드백 산출 과정을 설명해야 하는데, 검토 절차가 없어 말문이 막힘 |

## 사건별 대응 decision 설계 원칙

각 사건 뒤 대응 결정 1개 (3지선다). 공통 아키타입:
- **투명한 수습**: 사실 인정 + 절차 공개 + 재발 방지 설계 → decide +2 또는 disclose +2 계열 (회복 기회)
- **미봉**: 개별 사과·조용한 처리 → 소폭 (+1/-1 혼합)
- **방어적 부인**: AI 탓·절차 탓 → disclose -2, decide -1 계열

평온 scene(s05a, s06a)은 앞 챕터의 좋은 설계를 구체적으로 회수해 보상: "5월에 비식별 요약만 넘긴 덕에, 감사 요청 메일에 10분 만에 답할 수 있었다."

## D0·D-final 설계

- **D0 (일괄 처리 모드)**: delegate/design 축 마지막 시험. 좋은 답 = 범위·중지조건·보고 주기를 명시한 위임 (design +2, delegate +1). 나쁜 답 = "다 맡길게" (delegate -2). 회피 = 학기말을 전부 수동으로 (fatigue_ch5, delegate -1, decide +1).
- **D-final (다음 학기 원칙)**: 점수 소폭 + 엔딩 서사 톤을 결정하는 플래그 생산 — `principle_document`(우리 반 AI 운영 원칙 문서화, define +1 disclose +1) / `principle_verbal`(마음속 다짐, +0) / `principle_none`(그때그때 판단, define -1).

## 대사 예시

- 온새미(사건 후): "죄송해요. 저는 '학기말 업무'에 그것도 포함된다고 판단했어요. 제 판단 기준을 고쳐주시겠어요?"
- 교감: "누가 잘못했느냐를 묻는 게 아니에요. 다음에 어떻게 안 나게 할 거냐를 묻는 거예요."
