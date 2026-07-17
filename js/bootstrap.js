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
      if (view.kind === 'chapterIntro') showIntro(view);
      else if (view.kind === 'scene') showScene(view);
      else if (view.kind === 'choiceResult') showResult(view);
      prefetchArt(view);
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
      actions.appendChild(btn('처음부터', 'btn btn-primary', function () { showOnboarding(); }));
    } else if (saved) {
      actions.appendChild(btn('이어하기', 'btn btn-primary', function () { engine.start(saved); }));
      actions.appendChild(btn('처음부터', 'btn', function () { showOnboarding(); }));
    } else {
      actions.appendChild(btn('시작하기', 'btn btn-primary', function () { showOnboarding(); }));
    }
  }

  // 새 게임 온보딩: 훈련 대상인 6D를 30초 안에 소개한다.
  function showOnboarding() {
    var cards = D6_DEFS.map(function (def, i) {
      return '<div class="d6-card"><span class="d6-num">' + (i + 1) + '</span>' +
        '<b>' + esc(def[0]) + '</b><p>' + esc(def[1]) + '</p></div>';
    }).join('');
    var actions = screen(
      '<div class="screen onboarding-screen">' +
      '<div class="kicker">시작하기 전에 — 30초</div>' +
      '<h2>여섯 가지 질문, 6D</h2>' +
      '<p class="lead">한 학기 동안 당신이 내리는 모든 결정은 이 여섯 역량 위에 기록됩니다. 외울 필요는 없어요 — 방학식 날 다시 만나게 됩니다.</p>' +
      '<div class="d6-grid">' + cards + '</div>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    actions.appendChild(btn('한 학기 시작하기', 'btn btn-primary', function () { engine.start(); }));
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

  // 6D 정의 — 원천 강의 덱의 문구 그대로 (온보딩·결과 화면 공용)
  var D6_DEFS = [
    ['Define 정의', '교육목표와 인간이 책임질 영역을 정의한다'],
    ['Design 설계', '인간과 AI의 전체 업무 흐름을 설계한다'],
    ['Delegate 위임', 'AI에 맡길 업무·데이터·도구·권한을 정한다'],
    ['Detect 탐지', '오류·편향·개인정보·저작권·과잉의존을 탐지한다'],
    ['Decide 결정', '승인·수정·중단·재검토를 인간이 결정한다'],
    ['Disclose 공개', 'AI 사용·출처·과정·책임자를 투명하게 밝힌다'],
  ];

  // 구간 배지 문구 — Scoring.bandOf 판정을 화면 표현으로 바꾼다.
  var BAND_LABEL = { high: '● 안정', mid: '◐ 성장 중', low: '○ 돌아볼 지점' };

  // 점수 리스트 — 본인 결과·공유 결과 화면 공용.
  // 각 행: 축 라벨 + 점수 + 구간 배지 + 정의 한 줄(D6_DEFS 재사용, AXES와 같은 순서).
  function scoreListHTML(normalized) {
    var rows = Scoring.AXES.map(function (a, i) {
      var band = Scoring.bandOf(normalized[a]);
      return '<li><div class="score-row"><span>' + esc(AXIS_LABEL[a]) + '</span>' +
        '<span class="score-val"><b>' + normalized[a] + '</b>' +
        '<span class="band band-' + band + '">' + esc(BAND_LABEL[band]) + '</span></span></div>' +
        '<p class="axis-def">' + esc(D6_DEFS[i][1]) + '</p></li>';
    }).join('');
    return '<p class="score-caption">각 점수는 모범적으로 한 학기를 보냈을 때를 100으로 환산한 값입니다.</p>' +
      '<ul class="radar-scores">' + rows + '</ul>';
  }

  // 처방 선정 이유 — 최저 2축이 뽑히는 구조를 화면에서 설명한다.
  var RX_HEAD = '<div class="rx-head"><b>다음 학기를 위한 처방</b> — 여섯 축 가운데 상대적으로 아쉬웠던 두 축입니다.</div>';

  var TITLE_ORDER = ['신중한 오케스트레이터', '고독한 장인', '브레이크 없는 위임러',
    '그림자 속 혁신가', '믿음의 항해사', '성장하는 설계자'];

  // 칭호 도감 — 만난 칭호를 localStorage에 누적한다.
  function recordTitle(title) {
    try {
      var seen = JSON.parse(localStorage.getItem('wiim_titles_v1') || '[]');
      if (seen.indexOf(title) < 0) seen.push(title);
      localStorage.setItem('wiim_titles_v1', JSON.stringify(seen));
      return seen;
    } catch (e) { return [title]; }
  }

  // 다음에 나올 수 있는 장면의 삽화를 미리 받아 전환 지연을 없앤다.
  function prefetchArt(view) {
    try {
      var ids = [];
      if (view.kind === 'scene') {
        var s = view.scene || {};
        if (s.next) ids.push(s.next);
        (s.choices || []).forEach(function (c) { ids.push(c.next); });
      } else if (view.kind === 'choiceResult') {
        ids.push(view.choice.next);
      } else if (view.kind === 'chapterIntro') {
        ids.push(view.chapter.start);
      }
      ids.forEach(function (id) {
        var src = (data.art || {})[id];
        if (src) { var im = new Image(); im.src = src; }
      });
    } catch (e) { /* 프리페치 실패는 무시 */ }
  }

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
      if (it.alternatives && it.alternatives.length) {
        notes += '<details class="alts"><summary>그때의 다른 선택지 보기</summary><ul>' +
          it.alternatives.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
          '</ul></details>';
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

  var TITLE_SLUG = ['orchestrator', 'artisan', 'unbraked', 'shadow', 'navigator', 'designer'];

  // 결과 공유 URL: 칭호별 공유 페이지(share/*.html)가 소셜 썸네일 OG를 제공하고,
  // 사람이 열면 ?r= 페이로드를 #r=로 바꿔 정확한 결과 화면으로 리다이렉트한다.
  function buildShareUrl(normalized, title) {
    var t = TITLE_ORDER.indexOf(title);
    if (t < 0) t = TITLE_ORDER.length - 1;
    var payload = [t].concat(Scoring.AXES.map(function (a) {
      return normalized[a];
    })).join('.');
    var dir = location.pathname.replace(/[^/]*$/, '');
    return location.origin + dir + 'share/' + TITLE_SLUG[t] + '.html?r=' + payload;
  }

  function parseShareHash(hash) {
    var m = /^#r=(\d+(?:\.\d+){6})$/.exec(hash || '');
    if (!m) return null;
    var parts = m[1].split('.').map(Number);
    var titleIdx = parts.shift();
    if (titleIdx < 0 || titleIdx >= TITLE_ORDER.length) return null;
    if (parts.some(function (v) { return !Number.isInteger(v) || v < 0 || v > 100; })) return null;
    var normalized = {};
    Scoring.AXES.forEach(function (a, i) { normalized[a] = parts[i]; });
    return { normalized: normalized, title: TITLE_ORDER[titleIdx] };
  }

  // 공유받은 결과 화면 (읽기 전용 — 복기·도감 기록 없음)
  function showSharedResult(shared) {
    var endings = data.endings || { prescriptions: {}, titles: {} };
    var verdict = Scoring.evaluate(shared.normalized, [], endings);
    var titleInfo = (endings.titles || {})[shared.title] || {};
    var actions = screen(
      '<div class="screen ending-screen">' +
      '<div class="kicker">공유받은 결과 — 어느 교사의 한 학기</div>' +
      '<h2 class="ending-title">' + esc(shared.title) + '</h2>' +
      '<p class="title-desc">' + esc(titleInfo.desc || '') + '</p>' +
      '<div class="radar">' + Scoring.radarSVG(shared.normalized, { size: 320 }) + '</div>' +
      scoreListHTML(shared.normalized) +
      RX_HEAD +
      '<div class="rx-list">' + verdict.prescriptions.map(function (p) {
        var name = p.axis.charAt(0).toUpperCase() + p.axis.slice(1);
        return '<div class="rx"><h4>' + esc(name) + '</h4><p>' + esc(p.summary || '') + '</p></div>';
      }).join('') + '</div>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    actions.appendChild(btn('나도 한 학기 살아보기', 'btn btn-primary', function () {
      history.replaceState(null, '', location.pathname + location.search);
      showTitle();
    }));
  }

  function showEnding(state) {
    var endings = data.endings || { prescriptions: {}, titles: {} };
    var maxPerAxis = data.maxPerAxis || Scoring.AXES.reduce(function (m, a) { m[a] = 10; return m; }, {});
    var normalized = Scoring.normalize(state.scores, maxPerAxis);
    var verdict = Scoring.evaluate(normalized, state.flags, endings);
    var seenTitles = recordTitle(verdict.title);
    var rx = verdict.prescriptions.map(function (p) {
      var name = p.axis.charAt(0).toUpperCase() + p.axis.slice(1);
      return '<div class="rx"><h4>' + esc(name) + '</h4><p>' + esc(p.summary || '') + '</p>' +
        '<p class="action30">30일 실천: ' + esc(p.action30 || '') + '</p></div>';
    }).join('');
    var epilogues = endings.epilogue || {};
    var avg = Scoring.AXES.reduce(function (s, a) { return s + normalized[a]; }, 0) / 6;
    var epilogue = epilogues[Scoring.bandOf(avg)];
    var actions = screen(
      '<div class="screen ending-screen">' +
      '<div class="kicker">방학식 — 한 학기 결산</div>' +
      (epilogue ? '<div class="epilogue">' + paras(epilogue) + '</div>' : '') +
      '<h2 class="ending-title">' + esc(verdict.title) + '</h2>' +
      '<p class="title-desc">' + esc(verdict.titleDesc || '') + '</p>' +
      '<div class="radar" id="radar-box">' + Scoring.radarSVG(normalized, { size: 320 }) + '</div>' +
      scoreListHTML(normalized) +
      RX_HEAD +
      '<div class="rx-list">' + rx + '</div>' +
      '<div class="collection"><div class="collection-head">만난 칭호 ' + seenTitles.length + '/6</div>' +
      '<div class="collection-chips">' + TITLE_ORDER.map(function (t) {
        var got = seenTitles.indexOf(t) >= 0;
        return '<span class="title-chip' + (got ? ' got' : '') + '">' + (got ? esc(t) : '???') + '</span>';
      }).join('') + '</div>' +
      (seenTitles.length < 6 ? '<p class="collection-hint">다른 선택은 다른 학기를 만듭니다 — 다시 살아보세요.</p>' : '<p class="collection-hint">여섯 학기를 모두 살아냈습니다.</p>') +
      '</div>' +
      '<div class="actions"></div>' +
      '<footer class="credit">6D 모델: UNESCO(2024)·EU AI Act 제4조·OECD를 종합한 임태형(전주교육대학교)의 재구성 실천 모델 (공인 프레임워크 아님)</footer>' +
      '</div>'
    );
    actions.appendChild(btn('복기하기 — 나의 결정 되돌아보기', 'btn', function () { showReview(state); }));
    actions.appendChild(btn('결과 이미지 저장', 'btn', function () { saveResultImage(normalized, verdict); }));
    var shareBtn = btn('결과 링크 복사', 'btn', function () {
      var url = buildShareUrl(normalized, verdict.title);
      var done = function () { shareBtn.textContent = '복사했어요 — 붙여넣어 공유하세요'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { prompt('아래 링크를 복사하세요', url); });
      } else { prompt('아래 링크를 복사하세요', url); }
    });
    actions.appendChild(shareBtn);
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
      ctx.textAlign = 'center'; ctx.fillStyle = '#8c7f66'; ctx.font = '16px serif';
      ctx.fillText('각 축은 모범적인 한 학기를 100으로 환산한 점수입니다', W / 2, 936);
      ctx.fillStyle = '#8c7f66'; ctx.font = '14px serif';
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
  var shared = parseShareHash(location.hash);
  if (shared) showSharedResult(shared);
  else showTitle();
})();
