/*
 * 게임 진행 상태와 장면 전이를 담당한다.
 * 화면 표현은 모두 hooks.render에 맡겨 DOM에 의존하지 않는다.
 */
(function (root, factory) {
  const scoring = typeof module === 'object' && module.exports
    ? require('./scoring.js')
    : root && root.Scoring;
  const engine = factory(scoring);

  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  } else if (root) {
    root.Engine = engine;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Scoring) {
  'use strict';

  const SAVE_KEY = 'wiim_save_v1';

  function emptyScores() {
    return Scoring && typeof Scoring.zero === 'function' ? Scoring.zero() : {};
  }

  // 저장소 접근 실패는 사생활 모드 등의 환경에서도 게임을 멈추지 않게 무시한다.
  function save(state) {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      }
    } catch (error) {
      // 저장은 부가 기능이므로 실패해도 진행한다.
    }
  }

  function removeSave() {
    try {
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.removeItem(SAVE_KEY);
      }
    } catch (error) {
      // 저장 삭제 실패도 게임 진행에는 영향을 주지 않는다.
    }
  }

  function load() {
    try {
      if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
      const raw = globalThis.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function create(gameData, hooks) {
    const chapters = gameData && Array.isArray(gameData.chapters) ? gameData.chapters : [];
    const callbacks = hooks || {};
    let state = initialState();

    function chapter() {
      return chapters[state.chapterIndex];
    }

    function initialState() {
      return {
        chapterIndex: 0,
        sceneId: null,
        scores: emptyScores(),
        flags: new Set(),
        history: [],
        phase: 'chapterIntro',
      };
    }

    function serializableState() {
      return {
        chapterIndex: state.chapterIndex,
        sceneId: state.sceneId,
        scores: Object.assign({}, state.scores),
        flags: Array.from(state.flags),
        history: state.history.map((entry) => Object.assign({}, entry)),
        phase: state.phase,
      };
    }

    function render(view, shouldSave) {
      if (shouldSave !== false) save(serializableState());
      if (typeof callbacks.render === 'function') callbacks.render(view);
    }

    function renderIntro(shouldSave) {
      const current = chapter();
      if (!current) return finish();
      state.sceneId = null;
      state.phase = 'chapterIntro';
      render({ kind: 'chapterIntro', chapter: current }, shouldSave);
    }

    function renderScene(sceneId) {
      const current = chapter();
      const scene = current && current.scenes && current.scenes[sceneId];
      state.sceneId = sceneId;
      state.phase = 'scene';
      render({ kind: 'scene', chapter: current, scene, sceneId });
    }

    function choiceFromState() {
      const current = chapter();
      const scene = current && current.scenes && current.scenes[state.sceneId];
      const last = state.history[state.history.length - 1];
      if (!scene || scene.type !== 'decision' || !last || last.sceneId !== state.sceneId) return null;
      return scene.choices && scene.choices[last.choiceIndex];
    }

    function renderChoiceResult() {
      const choice = choiceFromState();
      if (!choice) {
        // 손상된 저장 상태는 원래 장면으로 되돌려 사용자가 다시 선택하게 한다.
        return renderScene(state.sceneId);
      }
      state.phase = 'choiceResult';
      render({ kind: 'choiceResult', chapter: chapter(), choice, sceneId: state.sceneId });
    }

    function finish() {
      state.phase = 'ended';
      // 완주 상태도 저장해 두어야 새로고침 후 '이어하기'가 마지막 장면으로 되돌리지 않는다.
      save(serializableState());
      if (typeof callbacks.onEnd === 'function') callbacks.onEnd(serializableState());
    }

    function flagsMatch(ifFlags) {
      return Array.isArray(ifFlags) && ifFlags.every((condition) => {
        if (typeof condition !== 'string') return false;
        return condition.startsWith('!')
          ? !state.flags.has(condition.slice(1))
          : state.flags.has(condition);
      });
    }

    // branch는 표시하지 않고, 일반 장면 또는 END까지 즉시 따라간다.
    function go(target) {
      const current = chapter();
      if (target === 'END') {
        if (state.chapterIndex + 1 < chapters.length) {
          state.chapterIndex += 1;
          return renderIntro();
        }
        return finish();
      }

      let sceneId = target;
      const visited = new Set();
      while (true) {
        const activeChapter = chapter();
        let scene = activeChapter && activeChapter.scenes && activeChapter.scenes[sceneId];
        if (!scene) {
          console.warn('존재하지 않는 scene 참조:', sceneId);
          sceneId = activeChapter && activeChapter.start;
          scene = activeChapter && activeChapter.scenes && activeChapter.scenes[sceneId];
          if (!scene) return;
        }

        if (scene.type !== 'branch') return renderScene(sceneId);
        if (visited.has(sceneId)) {
          console.warn('순환 branch 참조:', sceneId);
          return renderScene(activeChapter.start);
        }
        visited.add(sceneId);

        const matched = Array.isArray(scene.branches)
          ? scene.branches.find((branch) => branch && flagsMatch(branch.ifFlags))
          : null;
        sceneId = matched ? matched.next : scene.default;
        if (sceneId === 'END') return go('END');
      }
    }

    function restore(saved) {
      const candidate = saved && typeof saved === 'object' ? saved : {};
      const index = Number.isInteger(candidate.chapterIndex) && candidate.chapterIndex >= 0
        && candidate.chapterIndex < chapters.length ? candidate.chapterIndex : 0;
      const restoredScores = Scoring && typeof Scoring.add === 'function'
        ? Scoring.add(emptyScores(), candidate.scores)
        : Object.assign({}, candidate.scores);
      state = {
        chapterIndex: index,
        sceneId: typeof candidate.sceneId === 'string' ? candidate.sceneId : null,
        scores: restoredScores,
        flags: new Set(Array.isArray(candidate.flags) ? candidate.flags : []),
        history: Array.isArray(candidate.history) ? candidate.history.map((entry) => Object.assign({}, entry)) : [],
        phase: candidate.phase,
      };
    }

    return {
      start(saved) {
        if (saved) {
          restore(saved);
          if (state.phase === 'choiceResult') return renderChoiceResult();
          if (state.phase === 'scene' && state.sceneId) return go(state.sceneId);
          if (state.phase === 'ended') return finish();
          return renderIntro();
        }
        state = initialState();
        return renderIntro();
      },

      choose(index) {
        if (!state || state.phase !== 'scene') return;
        const current = chapter();
        const scene = current && current.scenes && current.scenes[state.sceneId];
        if (!scene || scene.type !== 'decision' || !Array.isArray(scene.choices)) return;
        if (!Number.isInteger(index) || index < 0) return;
        const choice = scene.choices[index];
        if (!choice) return;

        state.scores = Scoring.add(state.scores, choice.d);
        if (Array.isArray(choice.flags)) choice.flags.forEach((flag) => state.flags.add(flag));
        state.history.push({ sceneId: state.sceneId, choiceIndex: index });
        state.phase = 'choiceResult';
        render({ kind: 'choiceResult', chapter: current, choice, sceneId: state.sceneId });
      },

      continue_() {
        if (!state) return;
        if (state.phase === 'chapterIntro') return go(chapter() && chapter().start);
        if (state.phase === 'choiceResult') {
          const choice = choiceFromState();
          if (choice) return go(choice.next);
          return;
        }
        if (state.phase === 'scene') {
          const current = chapter();
          const scene = current && current.scenes && current.scenes[state.sceneId];
          if (scene && scene.type === 'narration') return go(scene.next);
        }
      },

      getState() {
        return state ? serializableState() : null;
      },

      reset() {
        removeSave();
        state = initialState();
        // reset은 저장 슬롯을 비운 상태로 시작 화면만 다시 보여 준다.
        return renderIntro(false);
      },
    };
  }

  return Object.freeze({ SAVE_KEY, create, load });
}));
