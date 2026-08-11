/* ============ 打地鼠游戏核心逻辑 ============ */
(() => {
  // ---- 未登录拦截 ----
  const user = getUser();
  if (!user || !getToken()) { window.location.href = '/'; return; }

  // ---- 难度配置 ----
  const CONFIG = {
    '简单': { duration: 60, moleTime: 1400, spawnGap: 1000, maxActive: 3 },
    '中等': { duration: 60, moleTime: 900, spawnGap: 700, maxActive: 4 },
    '困难': { duration: 60, moleTime: 600, spawnGap: 480, maxActive: 5 },
  };

  const state = {
    running: false,
    paused: false,
    score: 0,
    timeLeft: 60,
    best: 0,
    active: new Set(),
    spawnTimer: null,
    countdownTimer: null,
  };

  const $ = (id) => document.getElementById(id);
  const cells = []; // { wrap, mole, fx, star }

  // ---- 初始化页面 ----
  function initUI() {
    $('avatar').textContent = (user.username || '?')[0].toUpperCase();
    $('uname').textContent = user.username;
    $('btnLogout').addEventListener('click', logout);

    // 生成 3x3 棋盘
    const board = $('board');
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerHTML = `
        <div class="hole-wrap" data-i="${i}">
          <div class="mole">${MOLE_SVG}</div>
          <div class="hole"></div>
        </div>
        <div class="fx">+1</div>
        <div class="fx-star">💥</div>`;
      board.appendChild(cell);
      const wrap = cell.querySelector('.hole-wrap');
      wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); whack(i); });
      cells.push({ wrap, fx: cell.querySelector('.fx'), star: cell.querySelector('.fx-star') });
    }

    $('btnStart').addEventListener('click', startGame);
    $('btnPause').addEventListener('click', togglePause);
    $('btnAgain').addEventListener('click', () => { closeModal(); startGame(); });
    $('btnClose').addEventListener('click', closeModal);
    $('endMask').addEventListener('click', (e) => { if (e.target === $('endMask')) closeModal(); });

    loadProfile();
  }

  // ---- 数据加载 ----
  async function loadProfile() {
    try {
      const mine = await api('/scores/mine');
      state.best = mine.scores.length ? Math.max(...mine.scores.map(s => s.score)) : 0;
      $('best').textContent = state.best;
      renderMyScores(mine.scores);
    } catch (e) {
      if (e.status === 401) { clearToken(); localStorage.removeItem('dadishu_user'); window.location.href = '/'; }
    }
    loadLeaderboard();
  }

  async function loadLeaderboard() {
    try {
      const data = await api('/leaderboard');
      renderLeaderboard(data.board);
    } catch (e) { /* 忽略 */ }
  }

  const MEDALS = ['🥇', '🥈', '🥉'];
  function renderLeaderboard(board) {
    const ul = $('lbList');
    if (!board.length) { ul.innerHTML = '<li class="empty-tip">还没有人上榜，快来拿下第一名！</li>'; return; }
    ul.innerHTML = '';
    board.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'lb-item' + (item.username === user.username ? ' lb-me' : '');
      const rankCls = i < 3 ? ' top' + (i + 1) : '';
      li.innerHTML = `
        <span class="lb-rank${rankCls}">${i < 3 ? MEDALS[i] : i + 1}</span>
        <span class="lb-name">${escapeHtml(item.username)}</span>
        <span class="lb-score">${item.best} 分</span>`;
      ul.appendChild(li);
    });
  }

  function renderMyScores(scores) {
    const ul = $('myList');
    if (!scores.length) { ul.innerHTML = '<li class="empty-tip">还没有成绩，快去打一局吧！</li>'; return; }
    ul.innerHTML = '';
    scores.slice(0, 10).forEach(s => {
      const li = document.createElement('li');
      li.className = 'my-item';
      li.innerHTML = `<span>${escapeHtml(s.difficulty)}</span><b>${s.score} 分</b><span class="my-date">${(s.created_at || '').slice(0, 10)}</span>`;
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- 游戏流程 ----
  function startGame() {
    const cfg = CONFIG[$('difficulty').value];
    state.running = true;
    state.paused = false;
    state.score = 0;
    state.timeLeft = cfg.duration;

    $('score').textContent = '0';
    $('time').textContent = state.timeLeft;
    $('btnStart').disabled = true;
    $('btnPause').disabled = false;
    $('btnPause').textContent = '⏸ 暂停';
    $('difficulty').disabled = true;

    clearAllMoles();
    sStart();

    state.countdownTimer = setInterval(() => {
      if (state.paused) return;
      state.timeLeft--;
      $('time').textContent = Math.max(0, state.timeLeft);
      if (state.timeLeft <= 0) endGame();
    }, 1000);

    state.spawnTimer = setInterval(() => {
      if (state.paused) return;
      spawnMole();
    }, cfg.spawnGap);
  }

  function spawnMole() {
    const cfg = CONFIG[$('difficulty').value];
    if (state.active.size >= cfg.maxActive) return;
    const free = [];
    cells.forEach((c, i) => { if (!state.active.has(i)) free.push(i); });
    if (!free.length) return;
    const idx = free[Math.floor(Math.random() * free.length)];
    state.active.add(idx);
    cells[idx].wrap.classList.add('active');
    setTimeout(() => {
      if (state.active.has(idx) && !state.paused) hideMole(idx);
    }, cfg.moleTime);
  }

  function hideMole(idx) {
    if (!state.active.has(idx)) return;
    state.active.delete(idx);
    cells[idx].wrap.classList.remove('active');
  }

  function clearAllMoles() {
    state.active.forEach(i => cells[i].wrap.classList.remove('active'));
    state.active.clear();
  }

  function whack(i) {
    if (!state.running || state.paused) return;
    if (!state.active.has(i)) { sMiss(); return; }
    hideMole(i);
    state.score++;
    state.best = Math.max(state.best, state.score);

    const c = cells[i];
    c.wrap.classList.add('hit');
    setTimeout(() => c.wrap.classList.remove('hit'), 220);
    c.fx.classList.remove('show'); void c.fx.offsetWidth; c.fx.classList.add('show');
    c.star.classList.remove('show'); void c.star.offsetWidth; c.star.classList.add('show');

    const scoreEl = $('score');
    scoreEl.textContent = state.score;
    scoreEl.classList.remove('score-bump'); void scoreEl.offsetWidth; scoreEl.classList.add('score-bump');
    if (state.score > state.best) $('best').textContent = state.score;
    sHit();
  }

  function togglePause() {
    if (!state.running || state.timeLeft <= 0) return;
    state.paused = !state.paused;
    $('btnPause').textContent = state.paused ? '▶ 继续' : '⏸ 暂停';
    if (state.paused) {
      clearAllMoles();
    }
  }

  async function endGame() {
    state.running = false;
    clearInterval(state.countdownTimer);
    clearInterval(state.spawnTimer);
    clearAllMoles();
    $('btnStart').disabled = false;
    $('btnPause').disabled = true;
    $('difficulty').disabled = false;

    sEnd();
    const isRecord = state.score > 0 && state.score >= state.best && state.score >= 5;
    $('medal').textContent = state.score >= 30 ? '🏆' : state.score >= 15 ? '🥇' : state.score > 0 ? '🎉' : '😅';
    $('endTitle').textContent = isRecord ? '🎊 新纪录！' : '游戏结束！';
    $('endSub').textContent = `难度：${$('difficulty').value} · 本局得分`;
    $('finalScore').textContent = state.score;
    $('endMask').classList.add('show');

    // 保存成绩
    try {
      await api('/scores', { method: 'POST', body: JSON.stringify({ score: state.score, difficulty: $('difficulty').value }) });
    } catch (e) { /* 忽略保存失败 */ }
    loadProfile();
  }

  function closeModal() { $('endMask').classList.remove('show'); }

  // 键盘快捷键：空格开始/暂停
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    e.preventDefault();
    if (state.running) togglePause(); else startGame();
  });

  initUI();
})();
