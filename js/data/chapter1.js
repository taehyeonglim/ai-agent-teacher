(function () {
  const CHAPTER = {
    id: "ch1",
    title: "새 학기",
    month: "3월",
    intro: "개학 첫 주, 5학년 2반에 교사용 AI 에이전트 온새미가 배정된다. 당신은 빈 교실과 새 명단 사이에서, 누구의 손으로 한 학기를 시작할지 생각한다.",
    start: "ch1_s01",
    scenes: {
      ch1_s01: {
        type: "narration",
        speaker: "narrator",
        text: "3월의 교실에는 새 책 냄새와 덜 닦인 창문 냄새가 함께 남아 있다. 책상 위에는 학생 명단, 학급 운영 계획서, 그리고 교육청에서 보낸 태블릿 한 대가 놓여 있다. 화면에는 낯선 이름이 떠 있다. 온새미.",
        next: "ch1_s02"
      },
      ch1_s02: {
        type: "decision",
        speaker: "onsaemi",
        text: "“선생님, 2학기 국어·사회 전체 수업 계획과 자료를 지금 다 만들어드릴까요? 작년 인기 자료를 바탕으로 하면 빠르게 시작할 수 있어요. 선생님 반 아이들 작년 성적 데이터도 연동하면 훨씬 정확해져요. 연동해 드릴까요?”",
        prompt: "학기 수업 설계를 어디서부터 맡길까?",
        choices: [
          {
            text: "반의 목표를 정리한 뒤 범위 안 초안을 요청한다",
            d: { define: 2, delegate: 1 },
            result: "당신은 성취기준 옆에 올해 반에서 꼭 지키고 싶은 장면들을 적는다. 온새미는 그 문장을 읽고 단원별 초안의 빈칸까지 표시해 보낸다.",
            next: "ch1_s03"
          },
          {
            text: "목표 설정까지 포함해 전체 자료를 맡긴다",
            d: { define: -2, delegate: -1 },
            flags: ["no_goal_defined"],
            result: "온새미의 화면에 단원표와 활동지가 빠르게 늘어난다. 당신은 완성된 표를 보며 안도하지만, 첫 시간에 아이들에게 무엇을 남기고 싶은지는 아직 말로 꺼내지 못한다.",
            next: "ch1_s03"
          },
          {
            text: "수업 계획은 직접 쓰고 온새미를 끈다",
            d: { define: 1, delegate: -1 },
            flags: ["fatigue_ch1"],
            result: "태블릿 화면이 어두워지고 교실이 조금 조용해진다. 당신은 익숙한 계획서 양식을 펼치지만, 빈 칸을 채우는 손목이 벌써 묵직하다.",
            next: "ch1_s03"
          },
          {
            text: "한 단원만 시험 삼아 맡겨본다",
            d: { design: 1, delegate: 1, define: 0 },
            result: "당신은 첫 사회 단원만 골라 온새미에게 넘긴다. 온새미는 활동지와 교사용 메모를 나란히 띄우며, 다음 단원은 결과를 보고 정하자고 말한다.",
            next: "ch1_s03"
          }
        ]
      },
      ch1_s03: {
        type: "narration",
        speaker: "narrator",
        text: "복도에서 아이들 발소리가 가까워진다. 당신은 계획서의 첫 장을 덮고, 오늘은 이름을 외우는 일부터 시작하자고 마음먹는다.",
        next: "ch1_s04"
      },
      ch1_s04: {
        type: "narration",
        speaker: "onsaemi",
        text: "“학급 안내문도 제가 정리해 둘게요. 문장 길이와 번역본까지 맞춰 드리면 보호자분들이 읽기 편할 거예요.” 당신은 파일 목록에 새로 생긴 ‘학습지_초안’을 연다. 도시 야경 사진과 인구 변화 그래프는 보기 좋지만, 사진 아래에는 출처가 없고 그래프의 연도는 잘려 있다.",
        next: "ch1_s05"
      },
      ch1_s05: {
        type: "decision",
        speaker: "onsaemi",
        text: "“이미지는 수업 흐름에 잘 맞고, 통계도 최근 자료와 비슷해 보여요. 원하시면 바로 인쇄 대기열에 넣어둘게요. 출처를 확인하는 과정까지 제가 맡아드릴까요?”",
        prompt: "AI가 만든 자료의 출처와 저작권을 어떻게 다룰까?",
        choices: [
          {
            text: "출처 목록을 함께 내는 절차를 추가한다",
            d: { detect: 2, design: 1 },
            result: "당신은 자료마다 출처와 확인 날짜를 붙이도록 요청한다. 온새미는 이미지 후보를 다시 추리고, 통계 원문으로 이어지는 목록을 학습지 끝에 덧붙인다.",
            next: "ch1_s06"
          },
          {
            text: "그대로 인쇄해 아이들에게 나눠준다",
            d: { detect: -2, disclose: -1 },
            flags: ["sources_unchecked"],
            result: "인쇄기는 쉬지 않고 종이를 뱉어 낸다. 당신은 색감 좋은 학습지를 책상마다 나눠 두지만, 잘린 연도와 출처 없는 사진도 그대로 교실에 들어온다.",
            next: "ch1_s06"
          },
          {
            text: "AI 자료는 참고만 하고 직접 다시 만든다",
            d: { detect: 1, delegate: -1 },
            flags: ["fatigue_ch1"],
            result: "당신은 초안을 옆에 두고 사진과 수치를 하나씩 다시 찾는다. 인쇄물은 늦어지지만, 마지막 줄의 출처는 당신이 확인한 이름으로 채워진다.",
            next: "ch1_s06"
          }
        ]
      },
      ch1_s06: {
        type: "narration",
        speaker: "student",
        text: "수아가 학습지의 야경 사진을 손가락으로 가리킨다. “선생님, 이거 진짜 우리나라예요? AI가 만든 거면 거짓말은 아닌 거예요?” 몇몇 아이가 고개를 든다. 질문은 사진 한 장보다 오래 교실에 남는다.",
        next: "ch1_s07"
      },
      ch1_s07: {
        type: "narration",
        speaker: "narrator",
        text: "당신은 사진의 진위보다, 아이들이 자료를 대하는 태도를 먼저 떠올린다. 창가의 이준은 이미 원고지 첫 줄 앞에서 연필을 멈춘 채 화면을 바라보고 있다.",
        next: "ch1_s08"
      },
      ch1_s08: {
        type: "decision",
        speaker: "onsaemi",
        text: "“이준이처럼 시작을 어려워하는 학생에게는 즉시 피드백이 도움이 돼요. 학생 글쓰기 첨삭도 실시간으로 다 해드릴 수 있어요.” 초고에서 멈추고 고쳐 보는 시간은 답답하다. 그러나 그 막힘이 아이가 자기 문장을 찾는 과정일 수도 있다.",
        prompt: "학생이 직접 겪어야 할 글쓰기의 구간을 정한다.",
        choices: [
          {
            text: "초고는 맨손, 퇴고만 AI 보조로 정한다",
            d: { define: 2, design: 2 },
            flags: ["handson_zone_set"],
            result: "당신은 초고 시간에는 화면을 덮고, 퇴고 시간에만 온새미를 열기로 한다. 온새미는 두 단계에 맞춘 안내 문구를 만들어 교실 화면에 띄운다.",
            next: "ch1_s09"
          },
          {
            text: "글쓰기 전 과정에 AI 보조를 허용한다",
            d: { define: -1, delegate: -1 },
            result: "온새미는 아이들 문장 옆에 곧바로 대안을 붙이기 시작한다. 이준은 잠시 망설이다가 제안된 문장을 따라 적고, 수아는 더 재미있는 표현을 달라고 화면에 묻는다.",
            next: "ch1_s09"
          },
          {
            text: "글쓰기 수업에서는 AI를 전면 금지한다",
            d: { define: 1, design: -1 },
            flags: ["fatigue_ch1"],
            result: "당신은 태블릿을 교탁 서랍에 넣고 원고지만 나눠 준다. 아이들은 제각기 연필을 굴리고, 당신은 교실을 천천히 돌며 막힌 문장마다 멈춰 선다.",
            next: "ch1_s09"
          }
        ]
      },
      ch1_s09: {
        type: "narration",
        speaker: "student",
        text: "이준은 한참 뒤에야 첫 문장을 쓴다. 수아는 종이를 들어 보이며 묻는다. “선생님, 이건 제가 쓴 거예요, 아니면 같이 쓴 거예요?” 당신은 종이와 화면 사이의 거리를 눈으로 잰다.",
        next: "ch1_s10"
      },
      ch1_s10: {
        type: "narration",
        speaker: "colleague",
        text: "퇴근 무렵, 서지원 부장이 문턱에 기대어 새 학습지를 훑는다. “김 선생, 그 자료 좋아 보이던데. 어디까지가 선생님 거고 어디까지가 그거, AI 거예요?” 온새미는 곧바로 답한다. “제가 한 일은 모두 기록으로 남길 수 있어요. 다음에는 순서까지 자동으로 연결해 드릴까요?”",
        next: "ch1_s11"
      },
      ch1_s11: {
        type: "branch",
        branches: [
          { ifFlags: ["handson_zone_set"], next: "ch1_s12" }
        ],
        default: "ch1_s13"
      },
      ch1_s12: {
        type: "narration",
        speaker: "narrator",
        text: "교실의 불을 끄자 복도 끝 비상등만 남는다. 당신은 내일 아이들이 혼자 써 볼 첫 문장을 떠올린다. 온새미의 화면에는 다음 할 일이 조용히 기다리지만, 그 앞에 넘지 않을 선도 함께 적혀 있다.",
        next: "END"
      },
      ch1_s13: {
        type: "narration",
        speaker: "narrator",
        text: "교실의 불을 끄자 복도 끝 비상등만 남는다. 새 학기는 늘 계획보다 먼저 시작된다. 당신은 내일의 수업을 위해 가방을 들고, 온새미의 화면에는 다음 할 일이 조용히 기다린다.",
        next: "END"
      }
    }
  };

  window.GAME_DATA = window.GAME_DATA || { chapters: [] };
  window.GAME_DATA.chapters[0] = CHAPTER;
})();
