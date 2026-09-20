import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { LobbyPage } from '../pages/LobbyPage';
import { RoomPage } from '../pages/RoomPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <main className="page-shell center-content">
      <section className="panel empty-state">
        <p className="eyebrow">404</p>
        <h1>Sala não encontrada</h1>
        <p>O endereço informado não corresponde a uma tela do Xadrez Arena.</p>
        <Link className="button primary" to="/">Voltar ao lobby</Link>
      </section>
    </main>
  );
}
