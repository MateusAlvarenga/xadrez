import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function normalizeRoomCode(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
}

export function LobbyPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  function enterRoom(code: string) {
    const normalizedNick = nickname.trim();
    if (!normalizedNick) {
      setError('Informe um nickname para entrar na sala.');
      return;
    }

    navigate(`/room/${encodeURIComponent(code)}`, { state: { nickname: normalizedNick } });
  }

  function createRoom(event: FormEvent) {
    event.preventDefault();
    setError('');
    const code = normalizeRoomCode(roomCode) || Math.random().toString(36).slice(2, 8).toUpperCase();
    enterRoom(code);
  }

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    setError('');
    const code = normalizeRoomCode(roomCode);
    if (!code) {
      setError('Informe o código da sala.');
      return;
    }
    enterRoom(code);
  }

  return (
    <main className="page-shell lobby-layout">
      <section className="hero">
        <div className="brand-mark">♞</div>
        <p className="eyebrow">XADREZ ARENA</p>
        <h1>Uma sala para cada partida.</h1>
        <p className="hero-copy">
          Crie uma sala, convide seus adversários e jogue com o estado da partida
          preparado para o multiplayer centralizado.
        </p>
      </section>

      <section className="lobby-card panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ENTRAR NA ARENA</p>
            <h2>Comece uma partida</h2>
          </div>
          <span className="status-pill">Servidor centralizado</span>
        </div>

        <label className="field">
          <span>Seu nickname</span>
          <input
            value={nickname}
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ex.: Capablanca"
          />
        </label>

        <label className="field">
          <span>Código da sala <small>(opcional para criar)</small></span>
          <input
            value={roomCode}
            maxLength={16}
            onChange={(event) => setRoomCode(event.target.value)}
            placeholder="Ex.: PARTIDA-42"
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button className="button primary" onClick={createRoom} type="button">
            Criar sala
          </button>
          <button className="button secondary" onClick={joinRoom} type="button">
            Conectar por código
          </button>
        </div>

        <p className="muted-note">
          O acesso à sala é online e depende do servidor centralizado em execução.
        </p>
      </section>
    </main>
  );
}
