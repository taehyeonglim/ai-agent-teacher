// 부트스트랩: Engine의 render 뷰를 DOM으로 그린다. 게임 로직은 넣지 않는다.
(function () {
  'use strict';

  var app = document.getElementById('app');
  var data = window.GAME_DATA || {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function paras(text) {
    return String(text || '').split(/\n\n+/).map(function (p) {
      return '<p>' + esc(p) + '</p>';
    }).join('');
  }

  // 삽화: art 매핑에 있으면 <img> 태그 문자열 반환, 로드 실패 시 자기 자신을 숨긴다.
  function artTag(key) {
    var src = (data.art || {})[key];
    if (!src) return '';
    return '<div class="scene-art"><img src="' + esc(src) + '" alt="" decoding="async" ' +
      'onerror="this.parentNode.removeChild(this)"></div>';
  }

  var SPEAKER_LABEL = {
    narrator: '', onsaemi: '온새미', student: '학생', parent: '학부모',
    colleague: '서지원 부장', principal: '교감',
  };

  function speakerTag(speaker) {
    var label = SPEAKER_LABEL[speaker] || '';
    return label ? '<div class="speaker speaker-' + esc(speaker) + '">' + esc(label) + '</div>' : '';
  }

  var engine = Engine.create(data, {
    render: function (view) {
      if (view.kind === 'chapterIntro') return showIntro(view);
      if (view.kind === 'scene') return showScene(view);
      if (view.kind === 'choiceResult') return showResult(view);
    },
    onEnd: function (state) { showEnding(state); },
  });

  function btn(label, cls, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls || 'btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function screen(html) {
    app.innerHTML = html;
    app.scrollTop = 0;
    window.scrollTo(0, 0);
    return app.querySelector('.actions');
  }

  function showTitle() {
    var actions = screen(
      '<div class="screen title-screen">' +
      '<div class="kicker">교사 AI 리터러시 시뮬레이션</div>' +
      '<h1>위임의 기술</h1>' +
      '<p class="subtitle">6D로 살아남는 한 학기</p>' +
      '<p class="lead">당신은 한별초 5학년 2반 담임. 올해, 스스로 행동하는 AI 에이전트 <b>온새미</b>가 학급에 배정되었다.<br>무엇을 맡기고, 어디서 멈추게 하고, 누가 책임질 것인가.</p>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    var saved = Engine.load();
    if (saved && saved.phase !== 'ended') {
      actions.appendChild(btn('이어하기', 'btn btn-primary', function () { engine.start(saved); }));
      actions.appendChild(btn('처음부터', 'btn', function () { engine.start(); }));
    } else {
      actions.appendChild(btn('시작하기', 'btn btn-primary', function () { engine.start(); }));
    }
  }

  function showIntro(view) {
    var ch = view.chapter;
    var actions = screen(
      '<div class="screen intro-screen">' +
      '<div class="kicker">' + esc(ch.month) + '</div>' +
      '<h2>' + esc(ch.title) + '</h2>' +
      artTag(ch.id + ':intro') +
      paras(ch.intro) +
      '<div class="actions"></div>' +
      '</div>'
    );
    actions.appendChild(btn('계속', 'btn btn-primary', function () { engine.continue_(); }));
  }

  function showScene(view) {
    var scene = view.scene || {};
    var isDecision = scene.type === 'decision';
    var actions = screen(
      '<div class="screen scene-screen">' +
      '<div class="chapter-tag">' + esc(view.chapter.month) + ' · ' + esc(view.chapter.title) + '</div>' +
      artTag(view.sceneId) +
      speakerTag(scene.speaker) +
      paras(scene.text) +
      (isDecision ? '<div class="prompt">' + esc(scene.prompt) + '</div>' : '') +
      '<div class="actions' + (isDecision ? ' choices' : '') + '"></div>' +
      '</div>'
    );
    if (isDecision) {
      (scene.choices || []).forEach(function (c, i) {
        actions.appendChild(btn(c.text, 'btn btn-choice', function () { engine.choose(i); }));
      });
    } else {
      actions.appendChild(btn('계속', 'btn btn-primary', function () { engine.continue_(); }));
    }
  }

  function showResult(view) {
    var actions = screen(
      '<div class="screen result-screen">' +
      '<div class="chosen">▸ ' + esc(view.choice.text) + '</div>' +
      paras(view.choice.result) +
      '<div class="actions"></div>' +
      '</div>'
    );
    actions.appendChild(btn('계속', 'btn btn-primary', function () { engine.continue_(); }));
  }

  var AXIS_LABEL = {
    define: 'Define 정의', design: 'Design 설계', delegate: 'Delegate 위임',
    detect: 'Detect 탐지', decide: 'Decide 결정', disclose: 'Disclose 공개',
  };

  // 복기 화면: 한 학기 동안의 결정을 되짚는다. 점수 대신 축 영향과 되돌아볼 지점만 보여 준다.
  function showReview(state) {
    var items = Review.buildReview(state, data);
    var rows = items.map(function (it, idx) {
      var chips = Object.keys(it.d).map(function (a) {
        var v = it.d[a];
        return '<span class="axis-chip ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : '') + '">' +
          esc(AXIS_LABEL[a] || a) + ' ' + (v > 0 ? '+' + v : v) + '</span>';
      }).join('');
      var notes = '';
      if (it.regret) {
        var weak = it.weakAxes.map(function (a) { return AXIS_LABEL[a] || a; }).join(', ');
        notes += '<p class="review-note">되돌아볼 지점 — ' + esc(weak) + ' 관점에서 다른 길이 있었을지 생각해 보세요.</p>';
      }
      if (it.riskFlags.length) {
        notes += '<p class="review-note risk">이 선택의 흔적은 7월의 사건으로 이어졌습니다.</p>';
      }
      return '<div class="review-item' + (it.regret ? ' regret' : '') + '">' +
        '<div class="review-meta">' + esc(it.chapter.month) + ' · ' + esc(it.chapter.title) +
        ' · 결정 ' + (idx + 1) + '</div>' +
        '<div class="review-prompt">' + esc(it.prompt) + '</div>' +
        '<div class="chosen">▸ ' + esc(it.choiceText) + '</div>' +
        '<div class="axis-chips">' + chips + '</div>' + notes +
        '</div>';
    }).join('');
    var regretCount = items.filter(function (it) { return it.regret; }).length;
    var actions = screen(
      '<div class="screen review-screen">' +
      '<div class="kicker">복기 — 한 학기의 결정들</div>' +
      '<h2>' + items.length + '번의 결정, 되돌아볼 지점 ' + regretCount + '곳</h2>' +
      '<p class="lead">어떤 선택이 틀렸다는 뜻이 아닙니다. 같은 상황이 다시 온다면 어디에 승인 지점을 둘지, 한 번 더 생각해 볼 자리입니다.</p>' +
      rows +
      '<div class="actions"></div>' +
      '</div>'
    );
    actions.appendChild(btn('결과로 돌아가기', 'btn btn-primary', function () { showEnding(state); }));
  }

  function showEnding(state) {
    var endings = data.endings || { prescriptions: {}, titles: {} };
    var maxPerAxis = data.maxPerAxis || Scoring.AXES.reduce(function (m, a) { m[a] = 10; return m; }, {});
    var normalized = Scoring.normalize(state.scores, maxPerAxis);
    var verdict = Scoring.evaluate(normalized, state.flags, endings);
    var rx = verdict.prescriptions.map(function (p) {
      var name = p.axis.charAt(0).toUpperCase() + p.axis.slice(1);
      return '<div class="rx"><h4>' + esc(name) + '</h4><p>' + esc(p.summary || '') + '</p>' +
        '<p class="action30">30일 실천: ' + esc(p.action30 || '') + '</p></div>';
    }).join('');
    var actions = screen(
      '<div class="screen ending-screen">' +
      '<div class="kicker">방학식 — 한 학기 결산</div>' +
      '<h2 class="ending-title">' + esc(verdict.title) + '</h2>' +
      '<p class="title-desc">' + esc(verdict.titleDesc || '') + '</p>' +
      '<div class="radar" id="radar-box">' + Scoring.radarSVG(normalized, { size: 320 }) + '</div>' +
      '<div class="rx-list">' + rx + '</div>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    actions.appendChild(btn('복기하기 — 나의 결정 되돌아보기', 'btn', function () { showReview(state); }));
    actions.appendChild(btn('다시 하기', 'btn btn-primary', function () { engine.reset(); showTitle(); }));
  }

  if (!data.chapters || !data.chapters.length) {
    app.innerHTML = '<div class="error-screen"><h1>콘텐츠를 불러오지 못했어요</h1><p>시나리오 데이터가 없습니다. 새로고침해 주세요.</p></div>';
    return;
  }
  showTitle();
})();
