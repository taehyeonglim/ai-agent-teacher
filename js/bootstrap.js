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

  // 삽화: webp 실패 시 jpg로 폴백, 그것도 실패하면 조용히 숨긴다.
  function artTag(key) {
    var src = (data.art || {})[key];
    if (!src) return '';
    return '<div class="scene-art"><img src="' + esc(src) + '" alt="" decoding="async" ' +
      'onerror="if(this.src.slice(-5)===\'.webp\'){this.src=this.src.slice(0,-5)+\'.jpg\';}else{this.parentNode.removeChild(this);}"></div>';
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
    // 접근성: 화면 교체 후 포커스를 새 화면 컨테이너로 옮겨
    // 키보드·스크린리더 사용자가 문서 처음부터 다시 탐색하지 않게 한다.
    var sc = app.querySelector('.screen');
    if (sc) {
      sc.setAttribute('tabindex', '-1');
      sc.focus({ preventScroll: true });
    }
    return app.querySelector('.actions');
  }

  // 게임 중 재시작: 네이티브 confirm 없이 2단계 버튼으로 확인한다.
  function restartControl() {
    var wrap = document.createElement('span');
    wrap.className = 'restart-ctl';
    var b = btn('⟲ 처음부터', 'btn-inline', function () {
      if (b.dataset.armed === '1') { engine.reset(); showTitle(); return; }
      b.dataset.armed = '1';
      b.textContent = '저장을 지우고 처음부터? (한 번 더 누르면 실행)';
      setTimeout(function () { b.dataset.armed = ''; b.textContent = '⟲ 처음부터'; }, 4000);
    });
    wrap.appendChild(b);
    return wrap;
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
    if (saved && saved.phase === 'ended') {
      actions.appendChild(btn('지난 결과 보기', 'btn', function () { engine.start(saved); }));
      actions.appendChild(btn('처음부터', 'btn btn-primary', function () { engine.start(); }));
    } else if (saved) {
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
      '<div class="screen-top"><div class="chapter-tag">' + esc(view.chapter.month) + ' · ' + esc(view.chapter.title) + '</div></div>' +
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
    var top = app.querySelector('.screen-top');
    if (top) top.appendChild(restartControl());
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
    var epilogues = endings.epilogue || {};
    var avg = Scoring.AXES.reduce(function (s, a) { return s + normalized[a]; }, 0) / 6;
    var epilogue = avg >= 60 ? epilogues.high : avg >= 35 ? epilogues.mid : epilogues.low;
    var scoreList = Scoring.AXES.map(function (a) {
      return '<li><span>' + esc(AXIS_LABEL[a]) + '</span><b>' + normalized[a] + '</b></li>';
    }).join('');
    var actions = screen(
      '<div class="screen ending-screen">' +
      '<div class="kicker">방학식 — 한 학기 결산</div>' +
      (epilogue ? '<div class="epilogue">' + paras(epilogue) + '</div>' : '') +
      '<h2 class="ending-title">' + esc(verdict.title) + '</h2>' +
      '<p class="title-desc">' + esc(verdict.titleDesc || '') + '</p>' +
      '<div class="radar" id="radar-box">' + Scoring.radarSVG(normalized, { size: 320 }) + '</div>' +
      '<ul class="radar-scores" aria-label="6D 축별 점수 (100점 만점)">' + scoreList + '</ul>' +
      '<div class="rx-list">' + rx + '</div>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    actions.appendChild(btn('복기하기 — 나의 결정 되돌아보기', 'btn', function () { showReview(state); }));
    actions.appendChild(btn('결과 이미지 저장', 'btn', function () { saveResultImage(normalized, verdict); }));
    actions.appendChild(btn('다시 하기', 'btn btn-primary', function () { engine.reset(); showTitle(); }));
  }

  // 결과 카드를 PNG로 저장 — 연수장에서 서로 비교하는 활동용.
  function saveResultImage(normalized, verdict) {
    var W = 800, H = 1060;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0e8d2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(40, 40, W - 80, H - 80);
    ctx.strokeStyle = '#cdbf95'; ctx.strokeRect(40.5, 40.5, W - 81, H - 81);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5f6b3a'; ctx.font = '22px serif';
    ctx.fillText('위임의 기술 — 한 학기 결산', W / 2, 110);
    ctx.fillStyle = '#2b241d'; ctx.font = 'bold 44px serif';
    ctx.fillText(verdict.title, W / 2, 170);
    var svg = Scoring.radarSVG(normalized, { size: 460 });
    var img = new Image();
    img.onload = function () {
      ctx.drawImage(img, (W - 460) / 2, 200, 460, 460);
      ctx.font = '20px serif'; ctx.textAlign = 'left';
      Scoring.AXES.forEach(function (a, i) {
        var y = 720 + i * 34;
        ctx.fillStyle = '#4a4030';
        ctx.fillText(AXIS_LABEL[a], 120, y);
        ctx.fillStyle = '#5f6b3a';
        ctx.fillRect(320, y - 14, normalized[a] * 3.4, 16);
        ctx.fillStyle = '#2b241d';
        ctx.fillText(String(normalized[a]), 320 + normalized[a] * 3.4 + 10, y);
      });
      ctx.textAlign = 'center'; ctx.fillStyle = '#8c7f66'; ctx.font = '14px serif';
      ctx.fillText('6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD 종합, 임태형(전주교육대학교) 재구성', W / 2, 980);
      ctx.fillText('taehyeonglim.github.io/ai-agent-teacher', W / 2, 1004);
      var a = document.createElement('a');
      a.download = 'wiim-6d-result.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  if (!data.chapters || !data.chapters.length) {
    app.innerHTML = '<div class="error-screen"><h1>콘텐츠를 불러오지 못했어요</h1><p>시나리오 데이터가 없습니다. 새로고침해 주세요.</p></div>';
    return;
  }
  showTitle();
})();
