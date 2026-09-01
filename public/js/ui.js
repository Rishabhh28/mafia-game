function $(id) {
  return document.getElementById(id);
}

function show(el, on) {
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function renderLobbyPlayers(listEl) {
  if (!listEl) return;
  listEl.innerHTML = GameState.players.map((p) => {
    const tags = [];
    if (p.isHost) tags.push('Host');
    if (p.ready) tags.push('Ready');
    if (!p.connected) tags.push('Away');
    return `<li>
      <span class="${p.connected ? '' : 'offline'}">${escapeHtml(p.name)}</span>
      <span class="tag">${tags.join(' · ')}</span>
    </li>`;
  }).join('');
}

let timerRaf = null;

function startTimerBar(seconds) {
  const bar = $('timer-bar');
  const readout = $('timer-readout');
  if (!seconds) {
    if (bar) bar.style.transform = 'scaleX(0)';
    if (readout) readout.textContent = '';
    return;
  }
  GameState.timeLimit = seconds;
  GameState.timerStartedAt = Date.now();
  if (timerRaf) cancelAnimationFrame(timerRaf);

  const tick = () => {
    const elapsed = (Date.now() - GameState.timerStartedAt) / 1000;
    const left = Math.max(0, seconds - elapsed);
    const ratio = seconds ? left / seconds : 0;
    if (bar) bar.style.transform = `scaleX(${ratio})`;
    if (readout) {
      const m = Math.floor(left / 60);
      const s = Math.floor(left % 60);
      readout.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }
    if (left > 0) timerRaf = requestAnimationFrame(tick);
  };
  tick();
}

function renderPlayerGrid(container, opts) {
  if (!container) return;
  const { showVote, votes, myVote } = opts || {};
  const voteCounts = {};
  if (votes) {
    Object.values(votes).forEach((tid) => {
      voteCounts[tid] = (voteCounts[tid] || 0) + 1;
    });
  }

  container.innerHTML = GameState.players.map((p) => {
    const dead = !p.isAlive;
    const teammate = GameState.factionMembers.includes(p.name);
    const isSelf = p.id === GameState.playerId;
    const selected = myVote === p.id;
    const dots = voteCounts[p.id]
      ? Array.from({ length: voteCounts[p.id] }, () => '<span class="vote-dot"></span>').join('')
      : '';
    const voteBtn = showVote && !dead && !isSelf && GameState.isAlive
      ? `<button class="btn vote-btn" data-target="${p.id}">Vote</button>`
      : '';
    return `<div class="player-card ${dead ? 'dead' : ''} ${selected ? 'voted-by-me' : ''} ${isSelf ? 'self' : ''} ${teammate ? 'teammate' : ''}" data-id="${p.id}">
      <div class="player-avatar">${escapeHtml(initials(p.name))}</div>
      <div class="player-name">${escapeHtml(p.name)}</div>
      <div class="speaking-indicator" id="speaking-${p.id}"></div>
      <div class="vote-dot-row">${dots}</div>
      ${voteBtn}
    </div>`;
  }).join('');
}

function renderTargets(container, targets, selectedId) {
  if (!container) return;
  container.innerHTML = (targets || []).map((t) => `
    <button type="button" class="target-chip ${selectedId === t.id ? 'selected' : ''}" data-target="${t.id}">
      ${escapeHtml(t.name)}
    </button>
  `).join('');
}

function showError(msg) {
  const el = document.querySelector('.error-banner');
  if (el) el.textContent = msg || '';
}
