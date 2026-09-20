import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import { ChessBoardJs } from '../components/chess/ChessBoardJs';
import { useRoomSocket } from '../features/room/useRoomSocket';

export function RoomPage() {
  const { roomCode = 'SALA' } = useParams();
  const location = useLocation();
  const nickname = (location.state as { nickname?: string } | null)?.nickname || 'Jogador';
  const [message, setMessage] = useState('');
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const roomSocket = useRoomSocket(roomCode, nickname);
  const isOnline = roomSocket.connection === 'connected' && roomSocket.room !== null;
  const room = roomSocket.room;
  const identity = roomSocket.identity;
  const fen = room?.fen || 'start';
  const turn = room?.turn || 'w';
  const status = isOnline
    ? room?.status === 'finished'
      ? room.result === 'draw' ? 'Empate' : room.result === 'resignation' ? 'Desistência' : room.result === 'timeout' ? 'Tempo esgotado' : 'Xeque-mate'
      : room?.check ? 'Xeque' : 'Sua vez'
    : roomSocket.connection === 'connecting' ? 'Conectando à sala...' : 'Servidor indisponível';
  const messages = isOnline
    ? roomSocket.messages
    : [{ author: 'Sistema', text: 'Conecte-se ao servidor para acessar a partida.', system: true }];
  const blackPlayer = room?.players.find((player) => player.color === 'b');
  const participants = room ? [...room.players, ...room.spectators, ...room.queue] : [];
  const activePlayer = participants.find((player) => player.id === identity?.id && player.color);
  const myColor = activePlayer?.color || null;
  const canMove = Boolean(isOnline && activePlayer?.color === turn);
  const winner = room?.players.find((player) => player.id === room.winnerId);
  const isOwner = Boolean(identity && room?.ownerId === identity.id);
  const tournament = room?.tournament;

  function formatClock(milliseconds: number) {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  }

  const turnLabel = useMemo(
    () => (turn === 'w' ? 'vez das brancas' : 'vez das pretas'),
    [turn],
  );

  function sendMessage() {
    const text = message.trim();
    if (!text) return;
    if (isOnline) roomSocket.sendChat(text);
    setMessage('');
  }

  function isPromotionMove(from: string, to: string) {
    const current = new Chess(fen);
    const piece = current.get(from);
    return piece?.type === 'p' && (to.endsWith('1') || to.endsWith('8'));
  }

  function requestMove(from: string, to: string): 'snapback' | void {
    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to });
      return 'snapback';
    }
    return roomSocket.makeMove(from, to);
  }

  function choosePromotion(promotion: 'q' | 'r' | 'b' | 'n') {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    if (isOnline) roomSocket.makeMove(from, to, promotion);
    else roomSocket.makeMove(from, to, promotion);
    setPendingPromotion(null);
  }

  return (
    <main className="room-shell">
      <header className="room-header">
        <div>
          <Link className="back-link" to="/">← Voltar ao lobby</Link>
          <h1>Sala <span className="accent">{roomCode}</span></h1>
        </div>
        <div className="connection-state"><span /> {isOnline ? 'Conectado ao servidor' : status}</div>
      </header>

      <div className="room-grid">
        <section className="game-column">
          <div className="match-banner panel">
            <div>
              <p className="eyebrow">PARTIDA ATUAL</p>
              <h2><span className="player-dot white" /> {nickname} <span className="versus">vs</span> <span className="player-dot black" /> {blackPlayer?.nickname || 'Aguardando'}</h2>
            </div>
            <div className="turn-status">
              {isOnline && room ? (
                <div className="clock-pair">
                  <span className={turn === 'w' ? 'active-clock' : ''}>Brancas {formatClock(room.clock.w)}</span>
                  <span className={turn === 'b' ? 'active-clock' : ''}>Pretas {formatClock(room.clock.b)}</span>
                </div>
              ) : null}
              <span>{status}</span><strong>{turnLabel}</strong>
            </div>
          </div>

          <div className="board-frame">
            <ChessBoardJs
              fen={fen}
              orientation={myColor === 'b' ? 'black' : 'white'}
              onMove={canMove ? requestMove : () => 'snapback'}
            />
          </div>

          <div className="game-toolbar">
            <button className="button secondary" onClick={roomSocket.reset} disabled={!isOnline || !isOwner || room?.status !== 'finished'}>Nova partida</button>
            <button className="button danger" onClick={roomSocket.resign} disabled={!isOnline || !identity?.color}>Desistir</button>
          </div>
          {isOnline && room?.status === 'finished' && (
            <div className="result-banner">
              <strong>{room?.result === 'draw' ? 'Partida empatada' : winner ? `${winner.nickname} venceu` : 'Partida encerrada'}</strong>
              <span>{isOwner ? 'Você pode iniciar uma nova partida.' : 'Aguardando o dono da sala iniciar outra partida.'}</span>
            </div>
          )}
        </section>

        <aside className="room-sidebar">
          <section className="panel side-panel tournament-panel">
            <div className="panel-heading"><h2>🏆 Campeonato</h2><span>{tournament ? tournament.status : 'não iniciado'}</span></div>
            {!tournament && isOwner && (
              <div className="tournament-actions">
                <button className="button primary compact" onClick={() => roomSocket.createTournament(5)}>Iniciar 5 min</button>
                <button className="button secondary compact" onClick={() => roomSocket.createTournament(null)}>Sem relógio</button>
              </div>
            )}
            {!tournament && !isOwner && <p className="muted-note">Aguardando o dono iniciar um campeonato.</p>}
            {tournament && (
              <>
                <p className="tournament-round">Rodada {tournament.currentRound + 1} · Partida {tournament.currentMatch + 1}</p>
                {tournament.status === 'finished' ? (
                  <p className="champion-name">🏆 {room.players.find((player) => player.id === tournament.championId)?.nickname || 'Campeão'}</p>
                ) : (
                  <div className="bracket-list">
                    {tournament.rounds[tournament.currentRound].map((match) => (
                      <div className="bracket-match" key={match.id}>
                        <span>{participants.find((player) => player.id === match.p1)?.nickname || 'A definir'}</span>
                        <strong>vs</strong>
                        <span>{participants.find((player) => player.id === match.p2)?.nickname || match.p2}</span>
                        <small>{match.winnerId ? 'Concluída' : 'Aguardando'}</small>
                      </div>
                    ))}
                  </div>
                )}
                {isOwner && tournament.status === 'running' && <button className="button danger compact" onClick={roomSocket.endTournament}>Encerrar campeonato</button>}
              </>
            )}
          </section>
          <section className="panel side-panel">
            <div className="panel-heading"><h2>Jogadores</h2><span>{room ? participants.length : 1}/20</span></div>
            {(room ? participants : [{ id: 'local', nickname, color: 'w' as const, role: 'owner' as const, connected: true }]).map((player) => (
              <div className="player-row" key={player.id}>
                <span className={`player-dot ${player.color === 'w' ? 'white' : 'black'}`} />
                <strong>{player.nickname}</strong>
                <span className="role-label">{player.role === 'queued' ? 'Fila' : player.role === 'spectator' ? 'Espectador' : player.color === 'w' ? 'Brancas' : 'Pretas'}</span>
              </div>
            ))}
            <p className="muted-note">Compartilhe o código da sala para convidar alguém.</p>
          </section>

          <section className="panel side-panel chat-panel">
            <div className="panel-heading"><h2>Chat da sala</h2><span>{isOnline ? 'ao vivo' : 'local'}</span></div>
            <div className="chat-messages">
              {messages.map((item, index) => (
                <div className={item.system ? 'chat-message system-message' : 'chat-message'} key={`${item.author}-${index}`}>
                  <strong>{item.author}</strong><span>{item.text}</span>
                </div>
              ))}
            </div>
            {roomSocket.error && <p className="form-error">{roomSocket.error}</p>}
            <div className="chat-input">
              <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Escreva uma mensagem..." />
              <button className="button primary compact" onClick={sendMessage}>Enviar</button>
            </div>
          </section>
          {room && (
            <section className="panel side-panel">
              <div className="panel-heading"><h2>Movimentos</h2><span>{room.history.length}</span></div>
              <div className="move-list">
                {room.history.length === 0 ? <p className="muted-note">Nenhum movimento ainda.</p> : room.history.map((move) => (
                  <span key={move.ply}>{Math.ceil(move.ply / 2)}{move.ply % 2 ? '.' : '...'} {move.san}</span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
      {pendingPromotion && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
          <div className="promotion-modal panel">
            <p className="eyebrow">PROMOÇÃO</p>
            <h2 id="promotion-title">Escolha a nova peça</h2>
            <div className="promotion-actions">
              <button className="button primary" onClick={() => choosePromotion('q')}>Dama</button>
              <button className="button secondary" onClick={() => choosePromotion('r')}>Torre</button>
              <button className="button secondary" onClick={() => choosePromotion('b')}>Bispo</button>
              <button className="button secondary" onClick={() => choosePromotion('n')}>Cavalo</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
