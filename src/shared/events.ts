export type PlayerColor = 'w' | 'b';
export type RoomRole = 'owner' | 'player' | 'spectator' | 'queued';

export type RoomPlayer = {
  id: string;
  nickname: string;
  color: PlayerColor | null;
  role: RoomRole;
  connected: boolean;
};

export type MoveRecord = {
  ply: number;
  playerId: string;
  from: string;
  to: string;
  promotion: string | null;
  san: string;
};

export type TournamentMatch = {
  id: string;
  p1: string;
  p2: string;
  winnerId: string | null;
  result: string | null;
  whitePlayerId?: string | null;
  blackPlayerId?: string | null;
};

export type TournamentState = {
  status: 'registration' | 'running' | 'finished';
  format: 'sequential';
  timeMinutes: number | null;
  currentRound: number;
  currentMatch: number;
  championId: string | null;
  rounds: TournamentMatch[][];
};

export type RoomStateEvent = {
  type: 'ROOM_STATE';
  roomCode: string;
  ownerId: string;
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  queue: RoomPlayer[];
  fen: string;
  turn: PlayerColor;
  status: 'playing' | 'finished';
  result: '1-0' | '0-1' | 'draw' | 'resignation' | 'timeout' | null;
  winnerId: string | null;
  check: boolean;
  history: MoveRecord[];
  clock: { w: number; b: number; running: boolean; lastUpdatedAt: number | null };
  tournament: TournamentState | null;
};

export type ServerEvent =
  | { type: 'CONNECTED'; playerId: string; sessionToken: string; color: PlayerColor | null; role: RoomRole }
  | RoomStateEvent
  | { type: 'SYSTEM_MESSAGE'; text: string }
  | { type: 'CHAT_MESSAGE'; author: string; text: string }
  | { type: 'MOVE_ACCEPTED'; move: MoveRecord; fen: string }
  | { type: 'MOVE_REJECTED'; message: string }
  | { type: 'GAME_RESET' }
  | { type: 'CLOCK_UPDATE'; clock: RoomStateEvent['clock'] }
  | { type: 'TOURNAMENT_UPDATED'; tournament: TournamentState | null }
  | { type: 'ERROR'; message: string };
