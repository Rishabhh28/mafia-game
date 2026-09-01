const GameState = {
  uuid: null,
  name: '',
  code: '',
  playerId: null,
  isHost: false,
  role: null,
  factionMembers: [],
  isAlive: true,
  phase: 'lobby',
  round: 0,
  players: [],
  announcement: '',
  votes: {},
  scores: {},
  peerIds: [],
  timeLimit: 0,
  timerStartedAt: 0,
  nightTargets: [],
  selectedTarget: null,
};

function getOrCreateUuid() {
  let id = sessionStorage.getItem('mafia-uuid');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem('mafia-uuid', id);
  }
  return id;
}

function saveSession() {
  sessionStorage.setItem('mafia-session', JSON.stringify({
    uuid: GameState.uuid,
    name: GameState.name,
    code: GameState.code,
    playerId: GameState.playerId,
    role: GameState.role,
    factionMembers: GameState.factionMembers,
  }));
}

function loadSession() {
  GameState.uuid = getOrCreateUuid();
  try {
    const raw = sessionStorage.getItem('mafia-session');
    if (!raw) return;
    const data = JSON.parse(raw);
    GameState.name = data.name || '';
    GameState.code = data.code || '';
    GameState.playerId = data.playerId || GameState.uuid;
    GameState.role = data.role || null;
    GameState.factionMembers = data.factionMembers || [];
  } catch (_) { /* ignore */ }
}

function applyPlayers(players) {
  GameState.players = players || [];
  const me = GameState.players.find((p) => p.id === GameState.playerId);
  if (me) {
    GameState.isHost = me.isHost;
    GameState.isAlive = me.isAlive !== false;
  }
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
