# Static Site para Railway

Site HTML/CSS/JS servido por um servidor Node.js mínimo.

## Estrutura

- `index.html` — página principal
- `style.css` — estilos
- `script.js` — JavaScript
- `assets/` — imagens e outros arquivos estáticos
- `package.json` — configuração do servidor

## Deploy no Railway

1. Extraia o ZIP.
2. Crie um repositório no GitHub.
3. Envie todos os arquivos para a raiz do repositório.
4. No Railway, crie um novo projeto.
5. Escolha **Deploy from GitHub Repo**.
6. Selecione o repositório.
7. Aguarde o build/deploy.
8. Em **Settings > Networking**, gere um domínio público.

O comando de inicialização é:

`npm start`

O Railway fornece a variável `$PORT` automaticamente.

O modo online usa WebSocket nativo no navegador e o servidor Node.js mantém as
salas e encaminha as mensagens entre os jogadores. O mesmo processo serve os
arquivos estáticos e o endpoint WebSocket, usando a porta `$PORT` fornecida pelo
Railway. Em produção, o navegador usa automaticamente `wss://` quando o domínio
está em HTTPS.

Para instalar as dependências localmente:

`npm install`

Para iniciar:

`npm start`
