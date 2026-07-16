/*
 * 점수 계산과 결과 표현을 한곳에서 제공한다.
 * 브라우저와 CommonJS 환경에서 모두 같은 객체를 노출한다.
 */
(function (root, factory) {
  const scoring = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = scoring;
  } else if (root) {
    root.Scoring = scoring;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const AXES = ['define', 'design', 'delegate', 'detect', 'decide', 'disclose'];
  const LABELS = {
    define: 'Define 정의',
    design: 'Design 설계',
    delegate: 'Delegate 위임',
    detect: 'Detect 탐지',
    decide: 'Decide 결정',
    disclose: 'Disclose 공개',
  };

  function valueOf(scores, axis) {
    const value = scores && scores[axis];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  function zero() {
    return Object.fromEntries(AXES.map((axis) => [axis, 0]));
  }

  function add(scores, weights) {
    const result = zero();

    AXES.forEach((axis) => {
      result[axis] = valueOf(scores, axis);
      // 지정된 축만 누적해 호출자의 객체를 바꾸지 않는다.
      if (weights && Object.prototype.hasOwnProperty.call(weights, axis)) {
        result[axis] += valueOf(weights, axis);
      }
    });

    return result;
  }

  function normalize(scores, maxPerAxis) {
    const result = zero();

    AXES.forEach((axis) => {
      const max = valueOf(maxPerAxis, axis);
      const percentage = max === 0 ? 0 : Math.round((valueOf(scores, axis) / max) * 100);
      result[axis] = Math.min(100, Math.max(0, percentage));
    });

    return result;
  }

  function pointFor(axisIndex, value, center, radius) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * axisIndex) / AXES.length;
    const distance = radius * (Math.min(100, Math.max(0, value)) / 100);
    return [
      center + Math.cos(angle) * distance,
      center + Math.sin(angle) * distance,
    ];
  }

  function pointsString(values, center, radius) {
    return AXES.map((axis, index) => {
      const point = pointFor(index, values[axis], center, radius);
      return `${point[0].toFixed(2)},${point[1].toFixed(2)}`;
    }).join(' ');
  }

  function radarSVG(normalized, opts) {
    const requestedSize = opts && Number(opts.size);
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? requestedSize : 320;
    const center = size / 2;
    const radius = size * 0.31;
    const labelRadius = radius + size * 0.095;
    const values = zero();

    AXES.forEach((axis) => {
      values[axis] = valueOf(normalized, axis);
    });

    const grid = [20, 40, 60, 80, 100].map((tick) => (
      `<polygon class="radar-grid radar-grid-${tick}" points="${pointsString(Object.fromEntries(AXES.map((axis) => [axis, tick])), center, radius)}" />`
    )).join('');

    const spokes = AXES.map((axis, index) => {
      const point = pointFor(index, 100, center, radius);
      return `<line class="radar-spoke" x1="${center}" y1="${center}" x2="${point[0].toFixed(2)}" y2="${point[1].toFixed(2)}" />`;
    }).join('');

    const labels = AXES.map((axis, index) => {
      const point = pointFor(index, 100, center, labelRadius);
      return `<text class="radar-label" x="${point[0].toFixed(2)}" y="${point[1].toFixed(2)}" text-anchor="middle" dominant-baseline="middle">${LABELS[axis]}</text>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="6축 역량 레이더 차트"><style>.radar-grid{fill:none;stroke:currentColor;stroke-opacity:.18}.radar-spoke{stroke:currentColor;stroke-opacity:.12}.radar-data{fill:var(--olive-600, #6b7a3f);fill-opacity:.25;stroke:var(--olive-600, #6b7a3f);stroke-width:2}.radar-label{fill:currentColor;font:12px sans-serif}</style>${grid}${spokes}<polygon class="radar-data" points="${pointsString(values, center, radius)}" />${labels}</svg>`;
  }

  // 무분별 위임을 나타내는 시나리오 플래그 — 3개 이상이면 점수와 무관하게 위임러 판정
  const RECKLESS_FLAGS = [
    'no_goal_defined', 'sources_unchecked', 'no_review_step', 'error_ignored',
    'roster_leaked', 'auto_send_enabled', 'promise_unchecked', 'grading_delegated',
  ];

  function isStrictWeakest(normalized, axis) {
    const axisValue = valueOf(normalized, axis);
    return AXES.every((otherAxis) => otherAxis === axis || axisValue < valueOf(normalized, otherAxis));
  }

  function evaluate(normalized, flags, ENDINGS) {
    const scores = normalized || zero();
    const activeFlags = Array.isArray(flags) ? flags : [];
    let title;

    if (AXES.every((axis) => valueOf(scores, axis) >= 60)) {
      title = '신중한 오케스트레이터';
    } else if (valueOf(scores, 'delegate') <= 30
      && activeFlags.filter((flag) => typeof flag === 'string' && flag.startsWith('fatigue_')).length >= 2) {
      title = '고독한 장인';
    } else if ((valueOf(scores, 'delegate') >= 70
      && (valueOf(scores, 'detect') <= 40 || valueOf(scores, 'decide') <= 40))
      || activeFlags.filter((flag) => RECKLESS_FLAGS.indexOf(flag) !== -1).length >= 3) {
      title = '브레이크 없는 위임러';
    } else if (isStrictWeakest(scores, 'disclose')) {
      title = '그림자 속 혁신가';
    } else if (isStrictWeakest(scores, 'detect')) {
      title = '믿음의 항해사';
    } else {
      title = '성장하는 설계자';
    }

    const weakest = AXES.slice().sort((left, right) => valueOf(scores, left) - valueOf(scores, right)).slice(0, 2);
    const titles = ENDINGS && ENDINGS.titles;
    const titleInfo = titles && titles[title];
    const prescriptionSource = ENDINGS && ENDINGS.prescriptions ? ENDINGS.prescriptions : {};
    const prescriptions = weakest.map((axis) => {
      const prescription = prescriptionSource[axis] || {};
      return {
        axis,
        summary: prescription.summary,
        action30: prescription.action30,
      };
    });

    return {
      title,
      titleDesc: titleInfo ? titleInfo.desc : '',
      weakest,
      prescriptions,
    };
  }

  return Object.freeze({ AXES, zero, add, normalize, radarSVG, evaluate });
}));
