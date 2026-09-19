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

O modo online usa o PeerJS Cloud diretamente no navegador. O Railway serve apenas
os arquivos estáticos; ele não precisa (e não deve) fazer proxy de WebSocket ou
hospedar um PeerServer. O cliente está configurado para usar `0.peerjs.com` em
TLS na porta 443, inclusive quando a página é publicada em HTTPS.
