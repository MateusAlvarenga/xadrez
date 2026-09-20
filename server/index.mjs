import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Chess } from 'chess.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const MAX_USERS = 20;
const RECONNECT_GRACE_MS = 15_000;
const CLOCK_INITIAL_MS = 5 * 60 * 1000;
const rooms = new Map();

function json(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function roomState(room) {
  const players = [...room.members.values()];
  return {
    type: 'ROOM_STATE',
    roomCode: room.code,
    ownerId: room.ownerId,
    players: players.filter((player) => player.color || player.role === 'owner'),
    spectators: players.filter((player) => player.role === 'spectator'),
    queue: players.filter((player) => player.role === 'queued'),
    fen: room.game.fen(),
    turn: room.game.turn(),
    status: (room.result || room.game.game_over()) ? 'finished' : 'playing',
    result: room.result,
    winnerId: room.winnerId,
    check: room.game.in_check(),
    history: room.history,
    clock: currentClock(room),
    tournament: room.tournament,
  };
}

function currentClock(room, now = Date.now()) {
  const clock = room.clock;
  const elapsed = clock.running && clock.lastUpdatedAt
    ? Math.max(0, now - clock.lastUpdatedAt)
    : 0;
  const active = room.game.turn();
  return {
    w: Math.max(0, Math.round(clock.w - (active === 'w' ? elapsed : 0))),
    b: Math.max(0, Math.round(clock.b - (active === 'b' ? elapsed : 0))),
    running: clock.running,
    lastUpdatedAt: clock.running ? now : null,
  };
}

function updateClock(room, now = Date.now()) {
  if (!room.clock.running || !room.clock.lastUpdatedAt) return;
  const active = room.game.turn();
  room.clock[active] = Math.max(0, room.clock[active] - (now - room.clock.lastUpdatedAt));
  room.clock.lastUpdatedAt = now;
}

function startClock(room) {
  if (!room.clock.running && room.members.size >= 2 && !room.result) {
    room.clock.running = true;
    room.clock.lastUpdatedAt = Date.now();
  }
}

function finishOnTimeout(room) {
  updateClock(room);
  const active = room.game.turn();
  if (room.clock[active] > 0 || room.result) return false;
  const winner = [...room.members.values()].find((member) => member.color === (active === 'w' ? 'b' : 'w'));
  finishGame(room, 'timeout', winner?.id || null);
  resolveTournamentMatch(room, winner?.id || null, 'timeout');
  room.clock.running = false;
  broadcast(room, {
    type: 'SYSTEM_MESSAGE',
    text: `Tempo esgotado! ${winner?.nickname || 'O adversário'} venceu.`,
  });
  broadcast(room, roomState(room));
  return true;
}

function broadcast(room, payload) {
  for (const client of room.clients) json(client, payload);
}

function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = {
      code,
      game: new Chess(),
      clients: new Set(),
      members: new Map(),
      history: [],
      ownerId: null,
      result: null,
      winnerId: null,
      clock: { w: CLOCK_INITIAL_MS, b: CLOCK_INITIAL_MS, running: false, lastUpdatedAt: null },
      tournament: null,
    };
    rooms.set(code, room);
  }
  return room;
}

function removeClient(ws) {
  const room = ws.room;
  if (!room) return;
  room.clients.delete(ws);
  if (ws.playerId) {
    const member = room.members.get(ws.playerId);
    if (!member || member.socket !== ws) return;
    member.connected = false;
    member.socket = null;
    member.expirationTimer = setTimeout(() => expireMember(room, member.id), RECONNECT_GRACE_MS);
    broadcast(room, {
      type: 'SYSTEM_MESSAGE',
      text: `${ws.nickname} desconectou. Aguardando reconexão...`,
    });
  }
  broadcast(room, roomState(room));
}

function expireMember(room, playerId) {
  const member = room.members.get(playerId);
  if (!member || member.connected) return;
  room.members.delete(playerId);
  if (room.ownerId === playerId) {
    const nextOwner = [...room.members.values()].find((candidate) => candidate.connected);
    room.ownerId = nextOwner?.id || null;
    if (nextOwner) nextOwner.role = nextOwner.color ? 'owner' : nextOwner.role;
  }
  promoteQueuedMember(room);
  if (room.clients.size === 0 && room.members.size === 0) rooms.delete(room.code);
  else {
    broadcast(room, { type: 'SYSTEM_MESSAGE', text: `${member.nickname} saiu da sala.` });
    broadcast(room, roomState(room));
  }
}

function normalizeNickname(nickname) {
  return nickname.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function promoteQueuedMember(room) {
  const freeColor = [...room.members.values()].some((member) => member.color === 'w')
    ? 'b'
    : 'w';
  const queued = [...room.members.values()].find((member) => member.role === 'queued' && member.connected);
  if (!queued) return;
  queued.color = freeColor;
  queued.role = 'player';
  broadcast(room, {
    type: 'SYSTEM_MESSAGE',
    text: `${queued.nickname} saiu da fila e assumiu as ${freeColor === 'w' ? 'brancas' : 'pretas'}.`,
  });
}

function finishGame(room, result, winnerId = null) {
  updateClock(room);
  room.result = result;
  room.winnerId = winnerId;
  room.clock.running = false;
  room.clock.lastUpdatedAt = null;
}

function resetGame(room) {
  room.game.reset();
  room.history = [];
  room.result = null;
  room.winnerId = null;
  room.clock = { w: CLOCK_INITIAL_MS, b: CLOCK_INITIAL_MS, running: false, lastUpdatedAt: null };
}

function createTournament(room, timeMinutes) {
  const players = [...room.members.values()]
    .filter((member) => member.connected)
    .map((member) => member.id);
  if (players.length < 2) return null;
  const firstRound = [];
  for (let index = 0; index < players.length; index += 2) {
    firstRound.push({
      id: `r0m${firstRound.length}`,
      p1: players[index],
      p2: players[index + 1] || 'BYE',
      winnerId: players[index + 1] ? null : players[index],
      result: players[index + 1] ? null : 'BYE',
    });
  }
  const rounds = [firstRound];
  let matches = firstRound.length;
  while (matches > 1) {
    const next = [];
    for (let index = 0; index < Math.ceil(matches / 2); index += 1) {
      next.push({ id: `r${rounds.length}m${index}`, p1: '', p2: '', winnerId: null, result: null });
    }
    rounds.push(next);
    matches = next.length;
  }
  room.tournament = {
    status: 'running',
    format: 'sequential',
    timeMinutes: timeMinutes === null ? null : Math.max(1, Math.min(60, timeMinutes)),
    currentRound: 0,
    currentMatch: 0,
    championId: null,
    rounds,
  };
  advanceTournament(room);
  return room.tournament;
}

function advanceTournament(room) {
  const tournament = room.tournament;
  if (!tournament) return;
  const round = tournament.rounds[tournament.currentRound];
  for (const match of round) {
    if (match.winnerId && tournament.currentRound + 1 < tournament.rounds.length) {
      const next = tournament.rounds[tournament.currentRound + 1][Math.floor(round.indexOf(match) / 2)];
      if (round.indexOf(match) % 2 === 0) next.p1 = match.winnerId;
      else next.p2 = match.winnerId;
    }
  }
  while (tournament.currentMatch < round.length && round[tournament.currentMatch].winnerId) {
    tournament.currentMatch += 1;
  }
  if (tournament.currentMatch >= round.length) {
    if (tournament.currentRound === tournament.rounds.length - 1) {
      tournament.status = 'finished';
      tournament.championId = round[0].winnerId;
      return;
    }
    tournament.currentRound += 1;
    tournament.currentMatch = 0;
    advanceTournament(room);
    return;
  }
  const match = tournament.rounds[tournament.currentRound][tournament.currentMatch];
  if (!match.p1 || !match.p2 || match.p2 === 'BYE') {
    match.winnerId = match.p1 || match.p2;
    match.result = 'BYE';
    advanceTournament(room);
    return;
  }
  activateTournamentMatch(room, match);
  resetGame(room);
  room.clock = {
    w: tournament.timeMinutes === null ? Number.POSITIVE_INFINITY : tournament.timeMinutes * 60 * 1000,
    b: tournament.timeMinutes === null ? Number.POSITIVE_INFINITY : tournament.timeMinutes * 60 * 1000,
    running: false,
    lastUpdatedAt: null,
  };
}

function activateTournamentMatch(room, match) {
  const first = room.members.get(match.p1);
  const second = room.members.get(match.p2);
  if (!first || !second) return;
  const whiteFirst = Math.random() >= 0.5;
  const white = whiteFirst ? first : second;
  const black = whiteFirst ? second : first;
  for (const member of room.members.values()) {
    if (member.id === white.id) {
      member.color = 'w';
      member.role = member.id === room.ownerId ? 'owner' : 'player';
    } else if (member.id === black.id) {
      member.color = 'b';
      member.role = member.id === room.ownerId ? 'owner' : 'player';
    } else if (member.role !== 'owner') {
      member.color = null;
      member.role = 'spectator';
    }
  }
  match.whitePlayerId = white.id;
  match.blackPlayerId = black.id;
}

function resolveTournamentMatch(room, winnerId, result) {
  const tournament = room.tournament;
  if (!tournament || tournament.status !== 'running') return;
  const match = tournament.rounds[tournament.currentRound][tournament.currentMatch];
  if (!match || match.winnerId) return;
  match.winnerId = winnerId;
  match.result = result;
  advanceTournament(room);
}

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (!existsSync(dist)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Build do frontend não encontrado. Execute npm run build.');
    return;
  }

  const requested = normalize(request.url === '/' ? '/index.html' : request.url.split('?')[0]);
  const candidate = join(dist, requested);
  const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(dist, 'index.html');
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
  }[extname(file)] || 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType });
  createReadStream(file).pipe(response);
});

const websocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
websocketServer.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      json(ws, { type: 'ERROR', message: 'Mensagem inválida.' });
      return;
    }

    if (message.type === 'JOIN_ROOM') {
      const code = String(message.roomCode || '').trim().toUpperCase();
      const nickname = String(message.nickname || '').trim().slice(0, 24);
      if (!/^[A-Z0-9_-]{1,16}$/.test(code) || !nickname) {
        json(ws, { type: 'ERROR', message: 'Sala ou nickname inválido.' });
        return;
      }

      const room = getOrCreateRoom(code);
      if (room.clients.size >= MAX_USERS) {
        json(ws, { type: 'ERROR', message: 'Sala cheia.' });
        return;
      }
      const sessionToken = String(message.sessionToken || '');
      const reconnectingMember = [...room.members.values()].find((member) => member.sessionToken === sessionToken);
      const nicknameKey = normalizeNickname(nickname);
      if (!reconnectingMember && [...room.members.values()].some((member) => member.connected && normalizeNickname(member.nickname) === nicknameKey)) {
        json(ws, { type: 'ERROR', message: 'Esse nickname já está em uso na sala.' });
        return;
      }
      const playerId = reconnectingMember?.id || crypto.randomUUID();
      const occupiedColors = new Set([...room.members.values()]
        .filter((player) => player.id !== reconnectingMember?.id)
        .map((player) => player.color));
      const color = reconnectingMember?.color ?? (occupiedColors.has('w') ? (occupiedColors.has('b') ? null : 'b') : 'w');
      const role = reconnectingMember?.role || (color ? 'player' : 'queued');
      ws.room = room;
      ws.playerId = playerId;
      ws.nickname = nickname;
      ws.room.clients.add(ws);
      if (!room.ownerId) room.ownerId = playerId;
      const member = reconnectingMember || {
        id: playerId,
        nickname,
        color,
        role: room.ownerId === playerId ? 'owner' : role,
        connected: true,
        sessionToken: crypto.randomUUID(),
        socket: null,
        expirationTimer: null,
      };
      if (member.expirationTimer) clearTimeout(member.expirationTimer);
      member.nickname = reconnectingMember ? member.nickname : nickname;
      member.connected = true;
      member.socket = ws;
      room.members.set(playerId, member);
      startClock(room);
      json(ws, { type: 'CONNECTED', playerId, sessionToken: member.sessionToken, color: member.color, role: member.role });
      broadcast(room, { type: 'SYSTEM_MESSAGE', text: `${nickname} ${reconnectingMember ? 'reconectou' : 'entrou'} na sala.` });
      broadcast(room, roomState(room));
      return;
    }

    const room = ws.room;
    if (!room) {
      json(ws, { type: 'ERROR', message: 'Conecte-se a uma sala primeiro.' });
      return;
    }

    if (message.type === 'MAKE_MOVE') {
      if (finishOnTimeout(room)) {
        json(ws, { type: 'MOVE_REJECTED', message: 'Seu tempo acabou.' });
        return;
      }
      const player = room.members.get(ws.playerId);
      if (!player || !player.color || player.color !== room.game.turn()) {
        json(ws, { type: 'MOVE_REJECTED', message: 'Não é a sua vez.' });
        return;
      }
      if (room.game.game_over() || room.result) {
        json(ws, { type: 'MOVE_REJECTED', message: 'A partida já terminou.' });
        return;
      }
      updateClock(room);
      if (finishOnTimeout(room)) {
        json(ws, { type: 'MOVE_REJECTED', message: 'Seu tempo acabou.' });
        return;
      }
      const move = room.game.move({
        from: String(message.from),
        to: String(message.to),
        promotion: ['q', 'r', 'b', 'n'].includes(message.promotion) ? message.promotion : 'q',
      });
      if (!move) {
        json(ws, { type: 'MOVE_REJECTED', message: 'Movimento inválido.' });
        return;
      }
      const moveRecord = {
        ply: room.history.length + 1,
        playerId: ws.playerId,
        from: move.from,
        to: move.to,
        promotion: move.promotion || null,
        san: move.san,
      };
      room.history.push(moveRecord);
      room.clock.lastUpdatedAt = Date.now();
      startClock(room);
      if (room.game.game_over()) {
        if (room.game.in_checkmate()) {
          finishGame(room, player.color === 'w' ? '1-0' : '0-1', player.id);
          resolveTournamentMatch(room, player.id, player.color === 'w' ? '1-0' : '0-1');
        } else {
          finishGame(room, 'draw');
          resolveTournamentMatch(room, null, 'draw');
        }
      }
      broadcast(room, {
        type: 'MOVE_ACCEPTED',
        move: moveRecord,
        fen: room.game.fen(),
      });
      broadcast(room, roomState(room));
      return;
    }

    if (message.type === 'CHAT_MESSAGE') {
      const text = String(message.text || '').trim().slice(0, 500);
      if (text) broadcast(room, { type: 'CHAT_MESSAGE', author: ws.nickname, text });
      return;
    }

    if (message.type === 'RESIGN_GAME') {
      const player = room.members.get(ws.playerId);
      if (player?.color && !room.result) {
        const winner = [...room.members.values()].find((member) => member.color && member.id !== player.id);
        finishGame(room, 'resignation', winner?.id || null);
        resolveTournamentMatch(room, winner?.id || null, 'resignation');
        broadcast(room, { type: 'SYSTEM_MESSAGE', text: `${player.nickname} desistiu da partida.` });
        broadcast(room, { ...roomState(room), status: 'finished' });
      }
    }

    if (message.type === 'RESET_GAME') {
      if (ws.playerId !== room.ownerId) {
        json(ws, { type: 'ERROR', message: 'Somente o dono da sala pode iniciar outra partida.' });
        return;
      }
      if (room.tournament?.status === 'running') {
        json(ws, { type: 'ERROR', message: 'O torneio está em andamento.' });
        return;
      }
      resetGame(room);
      broadcast(room, { type: 'SYSTEM_MESSAGE', text: 'Uma nova partida foi iniciada.' });
      broadcast(room, { type: 'GAME_RESET' });
      broadcast(room, roomState(room));
      return;
    }

    if (message.type === 'CREATE_TOURNAMENT') {
      if (ws.playerId !== room.ownerId) {
        json(ws, { type: 'ERROR', message: 'Somente o dono pode criar um torneio.' });
        return;
      }
      if (room.tournament?.status === 'running') {
        json(ws, { type: 'ERROR', message: 'Já existe um torneio em andamento.' });
        return;
      }
      const timeMinutes = message.timeMinutes === 'none' ? null : Number(message.timeMinutes || 5);
      const tournament = createTournament(room, timeMinutes);
      if (!tournament) {
        json(ws, { type: 'ERROR', message: 'São necessários dois jogadores conectados.' });
        return;
      }
      broadcast(room, { type: 'SYSTEM_MESSAGE', text: 'Um novo campeonato começou!' });
      broadcast(room, { type: 'TOURNAMENT_UPDATED', tournament });
      broadcast(room, roomState(room));
      return;
    }

    if (message.type === 'END_TOURNAMENT') {
      if (ws.playerId !== room.ownerId || !room.tournament) {
        json(ws, { type: 'ERROR', message: 'Ação não permitida.' });
        return;
      }
      room.tournament.status = 'finished';
      broadcast(room, { type: 'SYSTEM_MESSAGE', text: 'O campeonato foi encerrado pelo dono da sala.' });
      broadcast(room, { type: 'TOURNAMENT_UPDATED', tournament: room.tournament });
      broadcast(room, roomState(room));
      return;
    }
  });

  ws.on('close', () => removeClient(ws));
  ws.on('error', () => removeClient(ws));
});

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.clock.running && !finishOnTimeout(room)) {
      broadcast(room, { type: 'CLOCK_UPDATE', clock: currentClock(room) });
    }
  }
}, 1000);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Xadrez Arena server listening on port ${port}`);
});
