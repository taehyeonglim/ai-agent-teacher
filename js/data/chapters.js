// GAME_DATA 네임스페이스 초기화 — 모든 chapter*.js / endings.js 보다 먼저 로드된다.
(function () {
  window.GAME_DATA = window.GAME_DATA || {};
  window.GAME_DATA.chapters = window.GAME_DATA.chapters || [];
})();
