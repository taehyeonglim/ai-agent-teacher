'use strict';

// 시나리오 데이터 계약서(js/data/schema.md)를 검사하는 의존성 없는 검증기입니다.
const fs = require('node:fs');
const path = require('node:path');

const AXES = ['define', 'design', 'delegate', 'detect', 'decide', 'disclose'];
const AXIS_SET = new Set(AXES);

function location(chapter, sceneId) {
  return `챕터 ${chapter && chapter.id ? chapter.id : '(id 없음)'}${sceneId ? `, scene ${sceneId}` : ''}`;
}

function validateGame(chapters, opts) {
  const errors = [];
  const warnings = [];
  const minAxisDecisions = opts && opts.minAxisDecisions !== undefined
    ? opts.minAxisDecisions
    : 4;
  const chapterList = Array.isArray(chapters) ? chapters : [];

  const addError = (rule, msg) => errors.push({ rule, msg });
  const addWarning = (rule, msg) => warnings.push({ rule, msg });

  // scene id는 게임 전체에서 고유하다는 계약을 이용해 참조를 확인한다.
  const allSceneIds = new Set();
  for (const chapter of chapterList) {
    if (!chapter || !chapter.scenes || typeof chapter.scenes !== 'object') continue;
    for (const sceneId of Object.keys(chapter.scenes)) allSceneIds.add(sceneId);
  }

  const isValidTarget = (target) => target === 'END' ||
    (typeof target === 'string' && allSceneIds.has(target));
  const checkTarget = (target, chapter, sceneId, label) => {
    if (!isValidTarget(target)) {
      addError(1, `${location(chapter, sceneId)}의 ${label} 참조 '${String(target)}'가 존재하는 scene id 또는 END가 아닙니다.`);
    }
  };

  const axisDecisionCounts = Object.fromEntries(AXES.map(axis => [axis, 0]));
  const producedFlags = new Set();
  const consumedFlags = [];
  const branchTargets = new Set();

  for (const chapter of chapterList) {
    const scenes = chapter && chapter.scenes && typeof chapter.scenes === 'object'
      ? chapter.scenes
      : {};

    checkTarget(chapter && chapter.start, chapter, null, 'start');

    for (const [sceneId, scene] of Object.entries(scenes)) {
      if (!scene || typeof scene !== 'object') continue;

      if (scene.type === 'narration') {
        checkTarget(scene.next, chapter, sceneId, 'next');
      } else if (scene.type === 'decision') {
        const choices = scene.choices;
        if (!Array.isArray(choices) || choices.length < 3 || choices.length > 4) {
          addError(3, `${location(chapter, sceneId)}의 choices는 3~4개여야 합니다.`);
        }

        const mutableAxes = new Set();
        if (Array.isArray(choices)) {
          choices.forEach((choice, index) => {
            const choiceLocation = `${location(chapter, sceneId)}의 ${index + 1}번 선택지`;
            if (!choice || typeof choice !== 'object') {
              addError(3, `${choiceLocation}가 객체가 아닙니다.`);
              return;
            }

            checkTarget(choice.next, chapter, sceneId, `${index + 1}번 선택지 next`);

            const weights = choice.d;
            if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
              addError(3, `${choiceLocation}의 d는 1~3개 6D 축을 가진 객체여야 합니다.`);
            } else {
              const entries = Object.entries(weights);
              if (entries.length < 1 || entries.length > 3) {
                addError(3, `${choiceLocation}의 d 축 수는 1~3개여야 합니다.`);
              }
              for (const [axis, value] of entries) {
                if (!AXIS_SET.has(axis)) {
                  addError(3, `${choiceLocation}의 축 키 '${axis}'는 허용되지 않습니다.`);
                  continue;
                }
                if (!Number.isInteger(value) || value < -2 || value > 2) {
                  addError(3, `${choiceLocation}의 축 '${axis}' 가중치는 -2~+2 정수여야 합니다.`);
                } else if (value !== 0) {
                  mutableAxes.add(axis);
                }
              }
            }

            if (Array.isArray(choice.flags)) {
              for (const flag of choice.flags) {
                if (typeof flag === 'string') producedFlags.add(flag);
              }
            }
          });
        }
        for (const axis of mutableAxes) axisDecisionCounts[axis] += 1;
      } else if (scene.type === 'branch') {
        const branches = Array.isArray(scene.branches) ? scene.branches : [];
        branches.forEach((branch, index) => {
          if (!branch || typeof branch !== 'object') return;
          checkTarget(branch.next, chapter, sceneId, `branches[${index}].next`);
          if (typeof branch.next === 'string') branchTargets.add(branch.next);
          if (Array.isArray(branch.ifFlags)) {
            for (const flag of branch.ifFlags) {
              if (typeof flag === 'string') {
                consumedFlags.push({ flag: flag.startsWith('!') ? flag.slice(1) : flag, chapter, sceneId });
              }
            }
          }
        });
        checkTarget(scene.default, chapter, sceneId, 'default');
        if (typeof scene.default === 'string') branchTargets.add(scene.default);
      }
    }
  }

  // 규칙 2: 시작점에서 실제 참조만 따라가며 도달 가능한 scene을 찾는다.
  for (const chapter of chapterList) {
    const scenes = chapter && chapter.scenes && typeof chapter.scenes === 'object'
      ? chapter.scenes
      : {};
    const reachable = new Set();
    const pending = [];
    if (chapter && typeof chapter.start === 'string' && Object.prototype.hasOwnProperty.call(scenes, chapter.start)) {
      pending.push(chapter.start);
    }
    while (pending.length) {
      const sceneId = pending.pop();
      if (reachable.has(sceneId)) continue;
      reachable.add(sceneId);
      const scene = scenes[sceneId];
      if (!scene || typeof scene !== 'object') continue;
      const targets = [];
      if (scene.type === 'narration') targets.push(scene.next);
      if (scene.type === 'decision' && Array.isArray(scene.choices)) {
        for (const choice of scene.choices) if (choice && typeof choice === 'object') targets.push(choice.next);
      }
      if (scene.type === 'branch') {
        if (Array.isArray(scene.branches)) {
          for (const branch of scene.branches) if (branch && typeof branch === 'object') targets.push(branch.next);
        }
        targets.push(scene.default);
      }
      for (const target of targets) {
        if (typeof target === 'string' && Object.prototype.hasOwnProperty.call(scenes, target)) pending.push(target);
      }
    }
    for (const sceneId of Object.keys(scenes)) {
      if (!reachable.has(sceneId)) {
        addWarning(2, `${location(chapter, sceneId)}은(는) start에서 도달할 수 없는 고아 scene입니다.`);
      }
    }
  }

  for (const axis of AXES) {
    if (axisDecisionCounts[axis] < minAxisDecisions) {
      addError(4, `전체 게임에서 '${axis}' 축이 변동 가능한 decision은 ${axisDecisionCounts[axis]}개이며, 최소 ${minAxisDecisions}개가 필요합니다.`);
    }
  }

  for (const ref of consumedFlags) {
    if (!ref.flag || !producedFlags.has(ref.flag)) {
      addError(5, `${location(ref.chapter, ref.sceneId)}이(가) 참조하는 플래그 '${ref.flag}'가 어떤 choice.flags에서도 생산되지 않습니다.`);
    }
  }

  // 5챕터 게임에서만 레드팀 사건의 수와 branch 게이트 여부를 확인한다.
  if (chapterList.length === 5) {
    const lastChapter = chapterList[4];
    const scenes = lastChapter && lastChapter.scenes && typeof lastChapter.scenes === 'object'
      ? lastChapter.scenes
      : {};
    const eventIds = Object.keys(scenes).filter(sceneId => sceneId.startsWith('ch5_ev_'));
    if (eventIds.length < 6) {
      addError(6, `${location(lastChapter)}에 ch5_ev_로 시작하는 사건 scene이 ${eventIds.length}개이며, 최소 6개가 필요합니다.`);
    }
    for (const sceneId of eventIds) {
      if (!branchTargets.has(sceneId)) {
        addError(6, `${location(lastChapter, sceneId)}은(는) 어떤 branch의 branches[].next 또는 default에서도 참조되지 않습니다.`);
      }
    }
  }

  return { errors, warnings };
}

function printCliResult(result, chapters) {
  const sceneCount = chapters.reduce((count, chapter) => count +
    (chapter && chapter.scenes && typeof chapter.scenes === 'object' ? Object.keys(chapter.scenes).length : 0), 0);
  const axisCounts = Object.fromEntries(AXES.map(axis => [axis, 0]));
  const axisMax = Object.fromEntries(AXES.map(axis => [axis, 0]));

  for (const chapter of chapters) {
    for (const scene of Object.values((chapter && chapter.scenes) || {})) {
      if (!scene || scene.type !== 'decision' || !Array.isArray(scene.choices)) continue;
      for (const axis of AXES) {
        const values = scene.choices
          .map(choice => choice && choice.d && choice.d[axis])
          .filter(value => Number.isInteger(value) && value >= -2 && value <= 2 && value !== 0);
        if (values.length) axisCounts[axis] += 1;
        // 한 decision에서는 선택지 하나만 고를 수 있으므로 그중 최고점만 더한다.
        axisMax[axis] += Math.max(0, ...values);
      }
    }
  }

  if (result.errors.length) {
    console.error('검증 실패:');
    for (const item of result.errors) console.error(`[규칙 ${item.rule}] ${item.msg}`);
  } else {
    console.log('검증 성공');
  }
  console.table(AXES.map(axis => ({
    축: axis,
    '변동 가능 결정 수': axisCounts[axis],
    '이론 최대점': axisMax[axis],
  })));
  console.log(`챕터 수: ${chapters.length}, scene 수: ${sceneCount}`);
  for (const item of result.warnings) console.warn(`[경고 · 규칙 ${item.rule}] ${item.msg}`);
}

function runCli() {
  const dataDir = path.resolve(__dirname, '../js/data');
  global.window = {};
  require(path.join(dataDir, 'chapters.js'));
  const chapterFiles = fs.readdirSync(dataDir)
    .filter(file => /^chapter\d+\.js$/.test(file))
    .sort((a, b) => a.localeCompare(b, 'en'));
  for (const file of chapterFiles) require(path.join(dataDir, file));

  const chapters = global.window.GAME_DATA && Array.isArray(global.window.GAME_DATA.chapters)
    ? global.window.GAME_DATA.chapters
    : [];
  const result = validateGame(chapters);
  printCliResult(result, chapters);
  process.exitCode = result.errors.length ? 1 : 0;
}

module.exports = { validateGame };

if (require.main === module) runCli();
