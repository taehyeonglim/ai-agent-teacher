/*
 * 선택 기록을 나중에 되짚어 볼 수 있는 복기 항목으로 바꾼다.
 * 브라우저와 CommonJS 환경에서 모두 같은 객체를 노출한다.
 */
(function (root, factory) {
  const review = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = review;
  } else if (root) {
    root.Review = review;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const AXES = ['define', 'design', 'delegate', 'detect', 'decide', 'disclose'];
  const RISK_FLAGS = [
    'no_goal_defined', 'sources_unchecked', 'no_review_step', 'error_ignored',
    'roster_leaked', 'auto_send_enabled', 'promise_unchecked', 'grading_delegated',
  ];

  function numberValue(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  function chapterForScene(chapters, sceneId) {
    return chapters.find((chapter) => chapter && chapter.scenes
      && Object.prototype.hasOwnProperty.call(chapter.scenes, sceneId));
  }

  function buildReview(state, gameData) {
    if (!state || !Array.isArray(state.history) || state.history.length === 0) return [];

    const chapters = gameData && Array.isArray(gameData.chapters) ? gameData.chapters : [];

    return state.history.reduce((items, entry) => {
      if (!entry || typeof entry.sceneId !== 'string') return items;

      const sourceChapter = chapterForScene(chapters, entry.sceneId);
      const scene = sourceChapter && sourceChapter.scenes[entry.sceneId];
      if (!scene || scene.type !== 'decision' || !Array.isArray(scene.choices)) return items;

      const choice = scene.choices[entry.choiceIndex];
      if (!choice) return items;

      const d = choice.d || {};
      const flags = choice.flags || [];
      const weights = Object.keys(d);
      const total = weights.reduce((sum, axis) => sum + numberValue(d[axis]), 0);
      const hasSevereLoss = weights.some((axis) => numberValue(d[axis]) <= -2);
      const regret = total < 0 || hasSevereLoss;
      const weakAxes = regret
        ? AXES.filter((axis) => numberValue(d[axis]) < 0)
          .sort((left, right) => numberValue(d[left]) - numberValue(d[right]))
        : [];
      const riskFlags = Array.isArray(flags)
        ? flags.filter((flag) => RISK_FLAGS.indexOf(flag) !== -1)
        : [];

      items.push({
        sceneId: entry.sceneId,
        chapter: {
          id: sourceChapter.id,
          title: sourceChapter.title,
          month: sourceChapter.month,
        },
        prompt: scene.prompt,
        choiceText: choice.text,
        d,
        flags,
        regret,
        weakAxes,
        riskFlags,
      });
      return items;
    }, []);
  }

  return Object.freeze({ buildReview });
}));
