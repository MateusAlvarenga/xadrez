# Plano do novo app de xadrez

## 1. Objetivo

Retrabalhar o miniapp atual de xadrez em uma aplicação React moderna, organizada e preparada para deploy no Railway, mantendo as funcionalidades existentes e substituindo o PeerJS por uma arquitetura centralizada e self-hosted.

O novo sistema terá duas telas principais:

1. Tela de criar ou conectar a uma sala.
2. Tela da sala, onde os jogadores jogam, conversam e acompanham o estado da partida ou do torneio.

O servidor será a autoridade da partida. O navegador não será mais o host real do jogo.

## 2. Features existentes que devem ser preservadas

### 2.1 Modos de jogo

- Partida online em sala.
- Entrada de espectadores.
- Fila para jogadores aguardando uma vaga.

### 2.2 Regras de xadrez

- Movimentos legais.
- Controle de turnos.
- Xeque.
- Xeque-mate.
- Empate.
- Roque.
- En passant.
- Promoção de peão.
- Desistência.
- Histórico de movimentos.
- Estado da posição em FEN.

No novo app, a promoção deverá permitir:

- Dama.
- Torre.
- Bispo.
- Cavalo.

### 2.3 Sala online

- Criar sala.
- Código de sala gerado automaticamente.
- Código personalizado opcional.
- Entrar em sala por código.
- Nickname dos jogadores.
- Limite configurável de participantes.
- Definição de jogador das brancas.
- Definição de jogador das pretas.
- Participantes adicionais como espectadores.
- Fila de espera.
- Lista de usuários conectados.
- Indicação visual do papel de cada pessoa:
  - Brancas.
  - Pretas.
  - Espectador.
  - Posição na fila.
- Remoção de jogador pelo administrador da sala.
- Reconexão de jogador.
- Atualização de estado para quem entra ou reconecta.
- Encerramento de sala.

### 2.4 Partida online

- Tabuleiro compartilhado em tempo real.
- Validação de jogadas no servidor.
- Controle de turno no servidor.
- Sincronização do FEN oficial.
- Registro de movimentos.
- Bloqueio de jogadas fora de turno.
- Bloqueio de jogadas de espectadores.
- Desistência.
- Finalização por:
  - Xeque-mate.
  - Empate.
  - Desistência.
  - Tempo esgotado.
- Recuperação da partida após reconexão.
- Recuperação da posição atual durante reconexão da mesma sessão efêmera.

### 2.5 Chat

- Chat da sala.
- Mensagens de jogadores.
- Mensagens do sistema.
- Identificação do autor.
- Envio por botão ou tecla Enter.
- Histórico recente de mensagens.
- Mensagens para eventos:
  - Entrada na sala.
  - Saída da sala.
  - Reconexão.
  - Início de partida.
  - Final da partida.
  - Vitória.
  - Tempo esgotado.
  - Início e final de torneio.

### 2.6 Relógio

- Relógio individual por jogador.
- Partidas sem limite de tempo.
- Limites configuráveis.
- Atualização em tempo real.
- Indicação visual de tempo baixo.
- Encerramento pelo servidor quando o tempo esgotar.
- Preservação do relógio durante reconexões.
- Controle inicial padrão de 5 minutos por jogador.
- Configuração de outros controles de tempo ficará para a etapa de torneios.

### 2.7 Torneios

- Criar torneio na sala.
- Configurar tempo por jogador.
- Opção sem limite de tempo.
- Formato de partidas sequenciais.
- Formato de partidas simultâneas.
- Chaveamento eliminatório.
- Suporte a `BYE`.
- Rodadas:
  - Oitavas.
  - Quartas.
  - Semifinal.
  - Final.
- Sorteio das cores.
- Avanço automático dos vencedores.
- Seleção da partida acompanhada por espectadores.
- Mais de uma partida ativa no formato simultâneo.
- Tabela de pontuação.
- Encerramento manual pelo administrador.
- Modal ou tela de campeão.
- Estado do torneio mantido somente enquanto a sala estiver ativa.

### 2.8 Pontuação

- Vitórias.
- Empates.
- Derrotas.
- Pontos.
- Ranking por pontuação.
- Atualização após cada partida.
- Exibição na sala.
- Estado da pontuação mantido somente enquanto a sala estiver ativa.

### 2.9 Personalização

- Tema visual escuro.
- Layout responsivo.
- Tabuleiro redimensionável.
- Orientação do tabuleiro conforme a cor.
- Sons de movimento.
- Som de xeque.
- Som de final da partida.
- Ativação ou desativação de sons.
- Escolha visual da rainha.
- Tema padrão de peças.
- Temas personalizados de rainha.
- Preferências válidas somente durante a sessão atual.

## 3. Telas do novo app

## 3.1 Tela de criar/conectar sala

Rota sugerida:

```text
/
```

Responsabilidades:

- Informar nickname.
- Criar uma sala.
- Informar código personalizado opcional.
- Entrar em uma sala existente por código.
- Validar nickname e código.
- Exibir erros de conexão.
- Exibir sala inexistente ou cheia.
- Não recuperar sessão após fechar a página; a sessão é efêmera.
- Redirecionar para `/room/:roomCode` após conexão.

Componentes sugeridos:

```text
LobbyPage
├─ NicknameForm
├─ CreateRoomForm
├─ JoinRoomForm
├─ PreviousSessionCard
└─ ConnectionStatus
```

Essa tela não deve carregar o tabuleiro nem a lógica visual completa da partida.

## 3.2 Tela da sala

Rota sugerida:

```text
/room/:roomCode
```

Responsabilidades:

- Exibir o tabuleiro usando chessboardjs.
- Exibir jogadores e espectadores.
- Exibir chat.
- Exibir banner da partida.
- Exibir turnos e status.
- Exibir relógios.
- Permitir jogadas.
- Permitir desistência.
- Exibir histórico de movimentos.
- Exibir torneio quando ativo.
- Exibir pontuação.
- Exibir configurações da sala.
- Permitir ações administrativas para o dono da sala.
- Reconectar e reconstruir o estado da sala.

Componentes sugeridos:

```text
RoomPage
├─ RoomHeader
│  ├─ RoomCode
│  ├─ ConnectionIndicator
│  └─ LeaveRoomButton
├─ MatchBanner
├─ ChessGame
│  ├─ ChessBoardJs
│  ├─ PlayerClock
│  ├─ MoveHistory
│  └─ GameStatus
├─ RoomSidebar
│  ├─ PlayerList
│  ├─ TournamentPanel
│  ├─ ScoreTable
│  └─ RoomActions
└─ ChatPanel
```

## 4. Integração com chessboardjs

O chessboardjs continuará sendo a biblioteca de visualização do tabuleiro.

Ele será encapsulado em um componente React:

```text
ChessBoardJs
```

Responsabilidades do componente:

- Criar a instância do chessboardjs.
- Configurar posição inicial.
- Configurar orientação.
- Habilitar drag-and-drop.
- Repassar eventos de arrastar e soltar.
- Atualizar a posição quando o FEN mudar.
- Redimensionar o tabuleiro.
- Destruir a instância ao desmontar.
- Preservar o comportamento responsivo e touch.

O componente não será responsável por:

- Decidir se uma jogada é válida.
- Atualizar diretamente o estado global da partida.
- Definir o vencedor.
- Alterar o FEN oficial.

Fluxo esperado:

```text
ChessboardJS
  ↓
ChessBoardJs.onDrop()
  ↓
GameProvider.makeMove()
  ↓
WebSocket para o servidor
  ↓
Servidor valida usando chess.js
  ↓
MOVE_ACCEPTED ou MOVE_REJECTED
  ↓
GameProvider atualiza o FEN
  ↓
ChessboardJS recebe a nova posição
```

O cliente pode usar `chess.js` para feedback local, mas a decisão final será sempre do servidor.

Como o chessboardjs depende de jQuery, a dependência ficará isolada no componente de integração, sem espalhar jQuery pelo restante do projeto.

## 5. Arquitetura técnica

### 5.1 Frontend

- React.
- TypeScript.
- Vite.
- React Router.
- chessboardjs.
- jQuery apenas na integração do chessboardjs.
- chess.js para leitura local da posição e seleção de promoção.
- Context API ou Zustand para estado da aplicação.
- CSS organizado por componentes ou módulos.

### 5.2 Backend

- Node.js.
- TypeScript.
- Fastify ou Express.
- WebSocket com Socket.IO ou `ws`.
- chess.js para validação autoritativa.
- Validação de payloads com schemas, preferencialmente Zod.
- Logs estruturados.

### 5.3 Estado efêmero

- Não haverá banco de dados neste app.
- Não haverá PostgreSQL, Redis ou outro mecanismo de persistência.
- Salas, jogadores, partidas, movimentos, chat, relógios e torneios existirão somente na memória do processo do servidor.
- Ao reiniciar ou encerrar o servidor, todas as salas e partidas serão encerradas.
- O navegador não salvará nickname, sessão, partida ou preferências de forma persistente.
- O estado será reconstruído somente enquanto os clientes permanecerem conectados ao servidor.
- O Railway será usado para executar o serviço, não para armazenar dados do jogo.
- Uma desconexão terá uma janela de reconexão efêmera de 15 segundos.
- Durante essa janela, a identidade, cor, papel e partida do jogador serão preservados em memória.
- Após a expiração da janela, o jogador será removido e uma vaga poderá ser oferecida à fila.

## 6. Multiplayer centralizado sem PeerJS

Fluxo desejado:

```text
React Client A
       |
       | WebSocket
       v
Node.js Game Server
       |
       | WebSocket
       v
React Client B
```

O cliente enviará comandos, não o estado completo:

```json
{
  "type": "MAKE_MOVE",
  "matchId": "match-123",
  "from": "e2",
  "to": "e4",
  "promotion": "q"
}
```

O servidor deverá:

1. Verificar se o jogador pertence à partida.
2. Verificar se é a vez do jogador.
3. Validar a jogada com chess.js.
4. Atualizar a posição oficial.
5. Registrar o movimento.
6. Atualizar o relógio.
7. Calcular o resultado.
8. Atualizar o torneio, se existir.
9. Transmitir o novo estado para a sala.

Eventos principais:

```text
CREATE_ROOM
JOIN_ROOM
ROOM_STATE
PLAYER_JOINED
PLAYER_LEFT
MAKE_MOVE
MOVE_ACCEPTED
MOVE_REJECTED
CHAT_MESSAGE
CLOCK_UPDATE
RESIGN_GAME
MATCH_FINISHED
TOURNAMENT_UPDATED
ROOM_CLOSED
ERROR
```

## 7. Contextos React

### `SessionProvider`

- Nickname.
- Identificação temporária do jogador durante a conexão.
- Dados apenas enquanto a tela estiver aberta.

### `LobbyProvider`

- Criação de sala.
- Entrada em sala.
- Validação dos formulários.
- Estado de conexão inicial.
- Erros do lobby.

### `RoomProvider`

- Código da sala.
- Participantes.
- Presença.
- Papel do usuário.
- Permissões administrativas.
- Reconexão.
- Entrada e saída.

Papéis possíveis:

- Administrador/owner.
- Jogador das brancas.
- Jogador das pretas.
- Espectador.
- Jogador em fila.

### `GameProvider`

- FEN oficial.
- Turno.
- Histórico de movimentos.
- Status da partida.
- Cores dos jogadores.
- Relógios.
- Envio de jogadas.
- Desistência.
- Reconexão da partida.

### `ChatProvider`

- Mensagens da sala.
- Mensagens do sistema.
- Envio de mensagens.
- Histórico recente.
- Estado de envio.

### `TournamentProvider`

- Configuração.
- Chaveamento.
- Rodadas.
- Partidas simultâneas.
- Partida selecionada pelo espectador.
- Pontuação.
- Avanço dos vencedores.
- Campeão.

### `PreferencesProvider`

- Tema visual.
- Tema da rainha.
- Sons.
- Orientação do tabuleiro.
- Preferências apenas durante a sessão atual.

## 8. Modelo de domínio

### Room

```text
Room
- id
- code
- hostPlayerId
- status
- maxPlayers
- createdAt
- updatedAt
```

### Player

```text
Player
- id
- roomId
- nickname
- role
- color
- connected
- sessionToken
- queenTheme
```

### Match

```text
Match
- id
- roomId
- tournamentId opcional
- whitePlayerId
- blackPlayerId
- fen
- status
- result
- whiteTimeMs
- blackTimeMs
- activeColor
- startedAt
- finishedAt
```

### Move

```text
Move
- id
- matchId
- ply
- playerId
- from
- to
- promotion
- san
- fenAfter
- createdAt
```

### Tournament

```text
Tournament
- id
- roomId
- status
- timeControl
- format
- currentRound
- championPlayerId
```

## 9. Estrutura de pastas sugerida

```text
xadrez/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  ├─ pages/
│  │  │  │  ├─ LobbyPage/
│  │  │  │  └─ RoomPage/
│  │  │  ├─ components/
│  │  │  │  ├─ chess/
│  │  │  │  │  └─ ChessBoardJs/
│  │  │  │  ├─ lobby/
│  │  │  │  ├─ room/
│  │  │  │  ├─ chat/
│  │  │  │  └─ tournament/
│  │  │  ├─ contexts/
│  │  │  ├─ services/
│  │  │  └─ types/
│  │  └─ package.json
│  │
│  └─ server/
│     ├─ src/
│     │  ├─ http/
│     │  ├─ websocket/
│     │  ├─ domain/
│     │  │  ├─ game/
│     │  │  ├─ room/
│     │  │  ├─ tournament/
│     │  │  └─ player/
│     │  ├─ ai/
│     │  └─ types/
│     └─ package.json
│
├─ packages/
│  ├─ shared/
│  │  ├─ events.ts
│  │  ├─ schemas.ts
│  │  └─ types.ts
│  └─ chess-domain/
│     ├─ game.ts
│     ├─ tournament.ts
│     └─ clock.ts
│
├─ prisma/
│  └─ schema.prisma
└─ package.json
```

## 10. Roadmap de implementação

### Fase 1 — Fundação

- Criar projeto React + TypeScript.
- Criar servidor Node + TypeScript.
- Configurar monorepo.
- Configurar lint, formatter e type-check.
- Criar tipos compartilhados.
- Configurar React Router.
- Criar as duas rotas principais.
- Criar deploy básico no Railway.
- Configurar variáveis de ambiente.
- Configurar o serviço efêmero no Railway.

### Fase 2 — Núcleo da partida online

- Criar componente `ChessBoardJs`.
- Integrar chessboardjs e jQuery de forma isolada.
- Integrar chess.js.
- Implementar movimentos legais.
- Implementar xeque, mate e empate.
- Implementar roque, en passant e promoção.
- Implementar orientação por cor.
- Implementar histórico de movimentos.
- Implementar sons.
- Integrar o tabuleiro exclusivamente ao estado recebido pelo servidor.

### Fase 3 — Lobby

- Criar formulário de nickname.
- Criar sala.
- Entrar em sala.
- Validar códigos.
- Exibir erros.
- Reconectar somente enquanto a sala ainda existir na memória do servidor.
- Redirecionar para a tela da sala.

### Fase 4 — Sala online

- Criar conexão WebSocket.
- Criar estado de sala no backend.
- Listar participantes.
- Definir brancas e pretas.
- Criar espectadores e fila.
- Implementar chat.
- Implementar mensagens de sistema.
- Implementar remoção de jogador.
- Implementar entrada, saída e reconexão.
- Manter identidade desconectada por uma janela efêmera.
- Reconectar automaticamente usando token somente em memória.
- Promover jogadores da fila apenas após a expiração da reconexão.

### Fase 5 — Partida online autoritativa

- Validar jogadas no servidor.
- Impedir jogadas fora de turno.
- Impedir alterações arbitrárias de FEN.
- Registrar movimentos.
- Sincronizar clientes.
- Sincronizar o estado enquanto o cliente permanecer conectado.
- Implementar desistência.
- Implementar finalização por mate, empate e abandono.

### Fase 6 — Relógio

- Criar relógio no servidor.
- Usar 5 minutos por jogador como controle padrão inicial.
- Implementar controles de tempo.
- Atualizar relógios nos clientes.
- Calcular tempo usando timestamps do servidor.
- Encerrar por tempo esgotado.
- Manter o estado do relógio somente na memória do servidor.

### Fase 7 — Campeonatos online (prioridade atual)

- Criar torneio.
- Configurar tempo.
- Implementar partidas sequenciais.
- Implementar partidas simultâneas.
- Criar chaveamento.
- Implementar `BYE`.
- Avançar vencedores.
- Permitir seleção de partida para espectadores.
- Criar painel de torneio.
- Criar tabela de pontuação.
- Exibir campeão.
- Permitir encerramento manual.
- Encerrar torneio quando o processo ou a sala forem encerrados, sem recuperação após reinício.
- Iniciar campeonato pelo owner da sala.
- Exibir o estado do campeonato em tempo real.
- Usar partidas online autoritativas como unidades do chaveamento.

### Fase 8 — Personalização e melhorias

- Migrar temas de rainha.
- Hospedar assets próprios.
- Adicionar controle de sons.
- Melhorar o layout mobile.
- Adicionar histórico completo.
- Adicionar replay de partidas.
- Adicionar autenticação opcional.

### Fase 9 — Qualidade e operação

- Testes unitários de regras.
- Testes de torneio.
- Testes de relógio.
- Testes de reconexão.
- Testes de eventos WebSocket.
- Testes com múltiplos clientes.
- Logs estruturados.
- Health check do Railway.
- Limpeza de salas inativas.
- Limitação de chat.
- Validação de nickname.
- Validação de código de sala.
- Métricas básicas.

## 11. Escopo recomendado do primeiro MVP

O primeiro MVP deve conter:

1. React + TypeScript.
2. Duas telas: lobby e sala.
3. React Router.
4. chessboardjs encapsulado em React.
5. Criação e entrada em sala.
6. Multiplayer via WebSocket.
7. Chat.
8. Espectadores e fila.
9. Desistência.
10. Xeque-mate e empate.
11. Promoção completa.
12. Reconexão.
13. Relógio básico.
14. Criação de campeonatos.
15. Chaveamento e avanço de rodadas.
16. Deploy no Railway sem banco de dados.

Os campeonatos são parte central do produto e entram imediatamente após o núcleo da partida online, sem depender de persistência.

## 12. Regras arquiteturais

- O servidor é autoritativo.
- O cliente envia comandos, não estados oficiais.
- O cliente nunca decide o vencedor.
- O cliente nunca define o tempo restante oficial.
- O cliente nunca altera diretamente o FEN oficial.
- Todo evento WebSocket possui schema validado.
- O estado da sala deve poder ser reconstruído pelo backend.
- Reconexão é um fluxo normal, não uma exceção.
- Nenhum dado do app deve ser persistido no servidor ou no navegador.
- Reiniciar o processo encerra explicitamente as salas ativas.
- A UI não deve conhecer detalhes do transporte WebSocket.
- A lógica de domínio não deve manipular o DOM.
- O chessboardjs fica isolado no componente visual.
- O jQuery fica isolado na integração do chessboardjs.
- As regras de jogo e torneio devem ser testáveis sem React.
- Erros devem ser exibidos explicitamente.
- O novo app não utilizará PeerJS.

## 13. Critérios de sucesso

O novo app será considerado funcional quando:

- Dois jogadores conseguirem criar e entrar em uma sala.
- O servidor validar todas as jogadas.
- Ambos os clientes permanecerem sincronizados.
- Um espectador conseguir acompanhar a partida.
- O chat funcionar em tempo real.
- A reconexão restaurar a partida corretamente.
- Xeque-mate, empate, desistência e tempo esgotado encerrarem a partida.
- Clientes conectados permanecerem sincronizados durante a sessão.
- Um campeonato poder ser criado e acompanhado em tempo real.
- O app estiver executando no Railway sem depender de banco de dados.
- O código estiver separado em componentes, contextos e módulos de domínio.
