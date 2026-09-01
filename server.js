require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = Number(process.env.MAX_PLAYERS) || 20;
const KILL_TIMER_SECONDS = Number(process.env.KILL_TIMER_SECONDS) || 60;
const HEAL_TIMER_SECONDS = Number(process.env.HEAL_TIMER_SECONDS) || 45;
const DISCUSSION_SECONDS = Number(process.env.DISCUSSION_SECONDS) || 180;
const VOTE_TIMER_SECONDS = Number(process.env.VOTE_TIMER_SECONDS) || 60;
const RECONNECT_WINDOW_MS = Number(process.env.RECONNECT_WINDOW_MS) || 30000;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = {};

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/join/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  res.redirect(`/lobby.html?code=${encodeURIComponent(code)}`);
});

function generateCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
  } while (rooms[code]);
  return code;
}

function getRoleCount(playerCount) {
  if (playerCount <= 7) return { mafia: 1, doctor: 1 };
  if (playerCount <= 10) return { mafia: 2, doctor: 1 };
  if (playerCount <= 14) return { mafia: 2, doctor: 2 };
  if (playerCount <= 19) return { mafia: 3, doctor: 2 };
  return { mafia: 4, doctor: 3 };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .slice(0, 16)
    .replace(/[<>]/g, '');
}

function getRoomBySocket(socket) {
  const code = socket.data.code;
  return code ? rooms[code] : null;
}

function findPlayer(room, uuid) {
  return room.players.find((p) => p.uuid === uuid);
}

function playerBySocket(room, socket) {
  return room.players.find((p) => p.socketId === socket.id);
}

function living(room) {
  return room.players.filter((p) => p.isAlive);
}

function livingByRole(room, role) {
  return living(room).filter((p) => p.role === role);
}

function publicPlayers(room) {
  return room.players.map((p) => ({
    id: p.uuid,
    name: p.name,
    isAlive: p.isAlive,
    isHost: p.uuid === room.hostUuid,
    score: p.score,
    connected: Boolean(p.socketId),
    ready: Boolean(p.ready),
    revealedRole: p.revealedRole || null,
  }));
}

function scoresMap(room) {
  const scores = {};
  room.players.forEach((p) => {
    scores[p.uuid] = { name: p.name, score: p.score, role: p.role };
  });
  return scores;
}

function emitRoom(room, event, payload) {
  io.to(room.code).emit(event, payload);
}

function emitToPlayer(player, event, payload) {
  if (player.socketId) io.to(player.socketId).emit(event, payload);
}

function clearTimers(room) {
  Object.values(room.timers).forEach((t) => clearTimeout(t));
  room.timers = {};
}

function setPhaseTimer(room, key, seconds, fn) {
  if (room.timers[key]) clearTimeout(room.timers[key]);
  room.timers[key] = setTimeout(fn, seconds * 1000);
}

function createRoom(hostUuid, hostName, socketId) {
  const code = generateCode();
  rooms[code] = {
    code,
    hostUuid,
    phase: 'lobby',
    winner: null,
    round: 0,
    players: [
      {
        uuid: hostUuid,
        socketId,
        name: hostName,
        role: null,
        isAlive: true,
        score: 0,
        ready: false,
        revealedRole: null,
        disconnectedAt: null,
      },
    ],
    nightActions: emptyNightActions(),
    dayVotes: {},
    factionChat: { mafia: [], doctor: [] },
    timers: {},
    lastSaves: 0,
  };
  return rooms[code];
}

function emptyNightActions() {
  return {
    killVotes: {},
    healVotes: {},
    resolvedKill: null,
    resolvedHeal: null,
  };
}

function assignRoles(room) {
  const n = room.players.length;
  const { mafia, doctor } = getRoleCount(n);
  const roles = [
    ...Array(mafia).fill('mafia'),
    ...Array(doctor).fill('doctor'),
    ...Array(n - mafia - doctor).fill('innocent'),
  ];
  shuffle(roles).forEach((role, i) => {
    room.players[i].role = role;
    room.players[i].isAlive = true;
    room.players[i].revealedRole = null;
  });
}

function factionNames(room, role, exceptUuid) {
  return room.players
    .filter((p) => p.role === role && p.uuid !== exceptUuid)
    .map((p) => p.name);
}

function tallyVotes(votesMap, tieBreak) {
  const counts = {};
  Object.values(votesMap).forEach((id) => {
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  let max = 0;
  const winners = [];
  Object.entries(counts).forEach(([id, count]) => {
    if (count > max) {
      max = count;
      winners.length = 0;
      winners.push(id);
    } else if (count === max) {
      winners.push(id);
    }
  });
  if (!winners.length) return null;
  if (winners.length === 1) return winners[0];
  if (tieBreak === 'none') return null;
  return winners[Math.floor(Math.random() * winners.length)];
}

function checkWin(room) {
  const aliveMafia = livingByRole(room, 'mafia').length;
  const aliveNon = living(room).length - aliveMafia;
  if (aliveMafia === 0) return 'innocents';
  if (aliveMafia >= aliveNon) return 'mafia';
  return null;
}

function applyEndgameScores(room, winner) {
  room.players.forEach((p) => {
    if (!p.isAlive) return;
    if (p.role === 'mafia') p.score += 10;
    else p.score += 5;
  });
  if (winner === 'mafia') {
    room.players.filter((p) => p.role === 'mafia').forEach((p) => {
      p.score += 20;
    });
  } else {
    living(room)
      .filter((p) => p.role !== 'mafia')
      .forEach((p) => {
        p.score += 15;
      });
  }
}

function endGame(room, winner) {
  clearTimers(room);
  room.phase = 'gameover';
  room.winner = winner;
  applyEndgameScores(room, winner);
  emitRoom(room, 'audio:mute', {});
  emitRoom(room, 'game:over', {
    winner,
    scores: scoresMap(room),
    mafiaList: room.players
      .filter((p) => p.role === 'mafia')
      .map((p) => ({ id: p.uuid, name: p.name })),
    players: publicPlayers(room),
  });
}

function maybeEnd(room) {
  const winner = checkWin(room);
  if (winner) {
    endGame(room, winner);
    return true;
  }
  return false;
}

function pickNewHost(room) {
  const connected = room.players.find((p) => p.socketId);
  if (connected) {
    room.hostUuid = connected.uuid;
    emitRoom(room, 'host:changed', { hostId: connected.uuid, name: connected.name });
  }
}

function removePlayer(room, uuid) {
  const idx = room.players.findIndex((p) => p.uuid === uuid);
  if (idx === -1) return;
  const wasHost = room.hostUuid === uuid;
  room.players.splice(idx, 1);
  emitRoom(room, 'player:left', { playerId: uuid, players: publicPlayers(room) });
  if (!room.players.length) {
    clearTimers(room);
    delete rooms[room.code];
    return;
  }
  if (wasHost) pickNewHost(room);
  if (room.phase !== 'lobby' && room.phase !== 'gameover') {
    maybeEnd(room);
  }
}

function startNight(room) {
  if (maybeEnd(room)) return;
  room.round += 1;
  room.phase = 'night-mafia';
  room.nightActions = emptyNightActions();
  room.factionChat = { mafia: [], doctor: [] };
  emitRoom(room, 'audio:mute', {});
  emitRoom(room, 'phase:night', { round: room.round, players: publicPlayers(room) });
  startMafiaPhase(room);
}

function startMafiaPhase(room) {
  const mafia = livingByRole(room, 'mafia');
  const targets = living(room)
    .filter((p) => p.role !== 'mafia')
    .map((p) => ({ id: p.uuid, name: p.name }));

  room.phase = 'night-mafia';
  emitRoom(room, 'phase:mafia-active', {
    timeLimit: KILL_TIMER_SECONDS,
    targets,
  });

  if (!mafia.length || !targets.length) {
    room.nightActions.resolvedKill = null;
    startDoctorPhase(room);
    return;
  }

  setPhaseTimer(room, 'kill', KILL_TIMER_SECONDS, () => resolveMafiaVotes(room));
}

function resolveMafiaVotes(room) {
  if (room.phase !== 'night-mafia') return;
  const target = tallyVotes(room.nightActions.killVotes, 'random');
  room.nightActions.resolvedKill = target;
  startDoctorPhase(room);
}

function startDoctorPhase(room) {
  const doctors = livingByRole(room, 'doctor');
  const targets = living(room).map((p) => ({ id: p.uuid, name: p.name }));

  room.phase = 'night-doctor';
  emitRoom(room, 'phase:doctor-active', {
    timeLimit: HEAL_TIMER_SECONDS,
    targets,
  });

  if (!doctors.length) {
    room.nightActions.resolvedHeal = null;
    resolveNight(room);
    return;
  }

  setPhaseTimer(room, 'heal', HEAL_TIMER_SECONDS, () => resolveDoctorVotes(room));
}

function resolveDoctorVotes(room) {
  if (room.phase !== 'night-doctor') return;
  const target = tallyVotes(room.nightActions.healVotes, 'random');
  room.nightActions.resolvedHeal = target;
  resolveNight(room);
}

function resolveNight(room) {
  clearTimers(room);
  const killId = room.nightActions.resolvedKill;
  const healId = room.nightActions.resolvedHeal;
  let killedPlayer = null;
  let announcement;

  if (killId && healId === killId) {
    livingByRole(room, 'doctor').forEach((p) => {
      p.score += 15;
    });
    room.lastSaves = (room.lastSaves || 0) + 1;
    const saved = findPlayer(room, killId);
    announcement = `The city wakes — ${saved ? saved.name : 'someone'} was attacked but survived!`;
  } else if (killId) {
    const victim = findPlayer(room, killId);
    if (victim && victim.isAlive) {
      victim.isAlive = false;
      killedPlayer = { id: victim.uuid, name: victim.name };
      livingByRole(room, 'mafia').forEach((p) => {
        p.score += 5;
      });
      announcement = `The city wakes — ${victim.name} was found dead.`;
    } else {
      announcement = 'The city wakes — no one was taken in the night.';
    }
  } else {
    announcement = 'The city wakes — no one was taken in the night.';
  }

  emitRoom(room, 'score:update', { scores: scoresMap(room) });

  if (maybeEnd(room)) return;
  startDay(room, announcement, killedPlayer);
}

function startDay(room, announcement, killedPlayer) {
  room.phase = 'day-discuss';
  room.dayVotes = {};
  emitRoom(room, 'audio:unmute', {});
  emitRoom(room, 'phase:day', {
    announcement,
    killedPlayer,
    timeLimit: DISCUSSION_SECONDS,
    players: publicPlayers(room),
    peerIds: living(room).filter((p) => p.socketId).map((p) => p.uuid),
  });
  setPhaseTimer(room, 'discuss', DISCUSSION_SECONDS, () => startVote(room));
}

function startVote(room) {
  if (room.phase !== 'day-discuss') return;
  clearTimers(room);
  room.phase = 'day-vote';
  room.dayVotes = {};
  emitRoom(room, 'phase:vote', {
    timeLimit: VOTE_TIMER_SECONDS,
    players: publicPlayers(room),
  });
  setPhaseTimer(room, 'vote', VOTE_TIMER_SECONDS, () => resolveDayVote(room));
}

function resolveDayVote(room) {
  if (room.phase !== 'day-vote') return;
  clearTimers(room);
  const eliminatedId = tallyVotes(room.dayVotes, 'none');
  let eliminated = null;
  let wasRole = null;

  if (eliminatedId) {
    const player = findPlayer(room, eliminatedId);
    if (player && player.isAlive) {
      player.isAlive = false;
      player.revealedRole = player.role;
      wasRole = player.role;
      eliminated = { id: player.uuid, name: player.name };
      if (player.role === 'mafia') {
        Object.entries(room.dayVotes).forEach(([voterId, targetId]) => {
          if (targetId === eliminatedId) {
            const voter = findPlayer(room, voterId);
            if (voter) voter.score += 10;
          }
        });
      }
    }
  }

  emitRoom(room, 'vote:result', {
    eliminated,
    wasRole,
    players: publicPlayers(room),
    announcement: eliminated
      ? wasRole === 'mafia'
        ? `Justice served — ${eliminated.name} was Mafia.`
        : `${eliminated.name} was innocent. The mafia remains hidden.`
      : 'The vote was tied. No one is eliminated.',
  });
  emitRoom(room, 'score:update', { scores: scoresMap(room) });

  setTimeout(() => {
    if (!rooms[room.code] || room.phase === 'gameover') return;
    if (maybeEnd(room)) return;
    startNight(room);
  }, 8000);
}

function syncPhaseToPlayer(player, room) {
  emitToPlayer(player, 'room:joined', {
    players: publicPlayers(room),
    code: room.code,
    playerId: player.uuid,
    phase: room.phase,
    role: player.role,
    factionMembers: player.role && player.role !== 'innocent'
      ? factionNames(room, player.role, player.uuid)
      : [],
    isAlive: player.isAlive,
    round: room.round,
  });

  if (room.phase === 'role-reveal' && player.role) {
    emitToPlayer(player, 'role:assigned', {
      role: player.role,
      factionMembers: player.role === 'innocent' ? [] : factionNames(room, player.role, player.uuid),
    });
  } else if (room.phase === 'night-mafia') {
    emitToPlayer(player, 'phase:night', { round: room.round, players: publicPlayers(room) });
    emitToPlayer(player, 'phase:mafia-active', {
      timeLimit: KILL_TIMER_SECONDS,
      targets: living(room).filter((p) => p.role !== 'mafia').map((p) => ({ id: p.uuid, name: p.name })),
    });
  } else if (room.phase === 'night-doctor') {
    emitToPlayer(player, 'phase:night', { round: room.round, players: publicPlayers(room) });
    emitToPlayer(player, 'phase:doctor-active', {
      timeLimit: HEAL_TIMER_SECONDS,
      targets: living(room).map((p) => ({ id: p.uuid, name: p.name })),
    });
  } else if (room.phase === 'day-discuss') {
    emitToPlayer(player, 'phase:day', {
      announcement: 'Discussion continues.',
      killedPlayer: null,
      timeLimit: DISCUSSION_SECONDS,
      players: publicPlayers(room),
      peerIds: living(room).filter((p) => p.socketId).map((p) => p.uuid),
    });
  } else if (room.phase === 'day-vote') {
    emitToPlayer(player, 'phase:vote', {
      timeLimit: VOTE_TIMER_SECONDS,
      players: publicPlayers(room),
    });
    emitToPlayer(player, 'vote:update', { kind: 'day', votes: room.dayVotes });
  } else if (room.phase === 'gameover') {
    emitToPlayer(player, 'game:over', {
      winner: room.winner || 'innocents',
      scores: scoresMap(room),
      mafiaList: room.players.filter((p) => p.role === 'mafia').map((p) => ({ id: p.uuid, name: p.name })),
      players: publicPlayers(room),
    });
  }
}

function resetToLobby(room) {
  clearTimers(room);
  room.phase = 'lobby';
  room.winner = null;
  room.round = 0;
  room.nightActions = emptyNightActions();
  room.dayVotes = {};
  room.factionChat = { mafia: [], doctor: [] };
  room.lastSaves = 0;
  room.players.forEach((p) => {
    p.role = null;
    p.isAlive = true;
    p.ready = false;
    p.revealedRole = null;
  });
  emitRoom(room, 'audio:mute', {});
  emitRoom(room, 'room:reset', { players: publicPlayers(room), code: room.code });
}

function allFactionVoted(room, role, votesKey) {
  const members = livingByRole(room, role);
  if (!members.length) return false;
  return members.every((p) => room.nightActions[votesKey][p.uuid]);
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ playerName, uuid }) => {
    const name = sanitizeName(playerName);
    const id = String(uuid || '').slice(0, 64);
    if (!name || !id) {
      socket.emit('error', { message: 'Name is required.' });
      return;
    }
    const room = createRoom(id, name, socket.id);
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.uuid = id;
    socket.emit('room:created', {
      code: room.code,
      playerId: id,
      players: publicPlayers(room),
    });
  });

  socket.on('room:join', ({ code, playerName, uuid }) => {
    const name = sanitizeName(playerName);
    const id = String(uuid || '').slice(0, 64);
    const roomCode = String(code || '').toUpperCase().trim();
    const room = rooms[roomCode];

    if (!name || !id) {
      socket.emit('error', { message: 'Name is required.' });
      return;
    }
    if (!room) {
      socket.emit('error', { message: 'Room not found.' });
      return;
    }

    const existing = findPlayer(room, id);
    if (existing) {
      existing.socketId = socket.id;
      existing.disconnectedAt = null;
      if (name) existing.name = name;
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.uuid = id;
      syncPhaseToPlayer(existing, room);
      emitRoom(room, 'player:joined', {
        player: publicPlayers(room).find((p) => p.id === id),
        players: publicPlayers(room),
      });
      return;
    }

    if (room.phase !== 'lobby') {
      socket.emit('error', { message: 'Game already in progress.' });
      return;
    }
    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('error', { message: 'Room is full.' });
      return;
    }
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      socket.emit('error', { message: 'That name is taken in this room.' });
      return;
    }

    const player = {
      uuid: id,
      socketId: socket.id,
      name,
      role: null,
      isAlive: true,
      score: 0,
      ready: false,
      revealedRole: null,
      disconnectedAt: null,
    };
    room.players.push(player);
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.uuid = id;
    socket.emit('room:joined', {
      players: publicPlayers(room),
      code: room.code,
      playerId: id,
      phase: room.phase,
    });
    emitRoom(room, 'player:joined', {
      player: { id, name, isAlive: true, isHost: false, score: 0, connected: true, ready: false },
      players: publicPlayers(room),
    });
  });

  socket.on('player:ready', () => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'lobby') return;
    const player = playerBySocket(room, socket);
    if (!player) return;
    player.ready = !player.ready;
    emitRoom(room, 'player:joined', {
      player: publicPlayers(room).find((p) => p.id === player.uuid),
      players: publicPlayers(room),
    });
  });

  socket.on('game:start', () => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    const player = playerBySocket(room, socket);
    if (!player || player.uuid !== room.hostUuid) {
      socket.emit('error', { message: 'Only the host can start.' });
      return;
    }
    if (room.phase !== 'lobby') return;
    const connected = room.players.filter((p) => p.socketId);
    if (connected.length < 4) {
      socket.emit('error', { message: 'Need at least 4 players to start.' });
      return;
    }

    assignRoles(room);
    room.phase = 'role-reveal';
    room.round = 0;
    emitRoom(room, 'game:started', { playerCount: room.players.length });

    room.players.forEach((p) => {
      emitToPlayer(p, 'role:assigned', {
        role: p.role,
        factionMembers: p.role === 'innocent' ? [] : factionNames(room, p.role, p.uuid),
      });
    });

    setPhaseTimer(room, 'reveal', 10, () => startNight(room));
  });

  socket.on('mafia:kill', ({ targetId }) => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'night-mafia') return;
    const player = playerBySocket(room, socket);
    if (!player || !player.isAlive || player.role !== 'mafia') return;
    const target = findPlayer(room, targetId);
    if (!target || !target.isAlive || target.role === 'mafia') return;
    room.nightActions.killVotes[player.uuid] = target.uuid;
    livingByRole(room, 'mafia').forEach((p) => {
      emitToPlayer(p, 'vote:update', {
        kind: 'mafia',
        votes: sanitizeFactionVotes(room, 'mafia', room.nightActions.killVotes),
      });
    });
    if (allFactionVoted(room, 'mafia', 'killVotes')) resolveMafiaVotes(room);
  });

  socket.on('doctor:heal', ({ targetId }) => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'night-doctor') return;
    const player = playerBySocket(room, socket);
    if (!player || !player.isAlive || player.role !== 'doctor') return;
    const target = findPlayer(room, targetId);
    if (!target || !target.isAlive) return;
    room.nightActions.healVotes[player.uuid] = target.uuid;
    livingByRole(room, 'doctor').forEach((p) => {
      emitToPlayer(p, 'vote:update', {
        kind: 'doctor',
        votes: sanitizeFactionVotes(room, 'doctor', room.nightActions.healVotes),
      });
    });
    if (allFactionVoted(room, 'doctor', 'healVotes')) resolveDoctorVotes(room);
  });

  socket.on('faction:message', ({ faction, text }) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    const player = playerBySocket(room, socket);
    const side = faction === 'doctor' ? 'doctor' : 'mafia';
    if (!player || !player.isAlive || player.role !== side) return;
    if (room.phase !== 'night-mafia' && room.phase !== 'night-doctor') return;
    const msgText = String(text || '').trim().slice(0, 280);
    if (!msgText) return;
    const msg = { playerId: player.uuid, name: player.name, text: msgText, ts: Date.now() };
    room.factionChat[side].push(msg);
    livingByRole(room, side).forEach((p) => emitToPlayer(p, 'faction:message', msg));
  });

  socket.on('vote:cast', ({ targetId }) => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'day-vote') return;
    const player = playerBySocket(room, socket);
    if (!player || !player.isAlive) return;
    const target = findPlayer(room, targetId);
    if (!target || !target.isAlive || target.uuid === player.uuid) return;
    room.dayVotes[player.uuid] = target.uuid;
    emitRoom(room, 'vote:update', { kind: 'day', votes: room.dayVotes });
    const voters = living(room);
    if (voters.every((p) => room.dayVotes[p.uuid])) resolveDayVote(room);
  });

  socket.on('discussion:skip', () => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'day-discuss') return;
    const player = playerBySocket(room, socket);
    if (!player || player.uuid !== room.hostUuid) return;
    startVote(room);
  });

  socket.on('game:playagain', () => {
    const room = getRoomBySocket(socket);
    if (!room || room.phase !== 'gameover') return;
    const player = playerBySocket(room, socket);
    if (!player || player.uuid !== room.hostUuid) return;
    resetToLobby(room);
  });

  socket.on('peer:signal', ({ peerId }) => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    const player = playerBySocket(room, socket);
    if (!player) return;
    emitRoom(room, 'peer:signal', { from: player.uuid, peerId });
  });

  socket.on('disconnect', () => {
    const room = getRoomBySocket(socket);
    if (!room) return;
    const player = playerBySocket(room, socket);
    if (!player) return;
    player.socketId = null;
    player.disconnectedAt = Date.now();
    emitRoom(room, 'player:left', { playerId: player.uuid, players: publicPlayers(room) });

    if (player.uuid === room.hostUuid) pickNewHost(room);

    setTimeout(() => {
      const current = rooms[room.code];
      if (!current) return;
      const p = findPlayer(current, player.uuid);
      if (!p || p.socketId) return;
      if (current.phase === 'lobby') {
        removePlayer(current, p.uuid);
      } else {
        removePlayer(current, p.uuid);
      }
    }, RECONNECT_WINDOW_MS);
  });
});

function sanitizeFactionVotes(room, role, votes) {
  const ids = new Set(livingByRole(room, role).map((p) => p.uuid));
  const out = {};
  Object.entries(votes).forEach(([voter, target]) => {
    if (ids.has(voter)) out[voter] = target;
  });
  return out;
}

server.listen(PORT, () => {
  console.log(`Mafia game listening on http://localhost:${PORT}`);
});
