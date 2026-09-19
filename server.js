const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const root = __dirname;
const port = Number.parseInt(process.env.PORT || '3000', 10);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((request, response) => {
    let pathname;

    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        response.writeHead(400);
        response.end('Invalid URL');
        return;
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }

        const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        response.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(response);
    });
});

const websocketServer = new WebSocketServer({ server });
const rooms = new Map();
const MAX_USERS = 20;

function send(socket, message) {
    if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
    }
}

function makeRoomId() {
    let roomId;
    do {
        roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (rooms.has(roomId));
    return roomId;
}

websocketServer.on('connection', (socket) => {
    const client = { socket, roomId: null, clientId: null, isHost: false };

    socket.on('message', (rawMessage) => {
        let message;
        try {
            message = JSON.parse(rawMessage.toString());
        } catch {
            send(socket, { type: 'error', text: 'Mensagem inválida.' });
            return;
        }

        if (message.type === 'create_room') {
            if (client.roomId) return;
            const requestedRoomId = typeof message.roomId === 'string'
                ? message.roomId.trim().toUpperCase()
                : '';
            const roomId = requestedRoomId || makeRoomId();
            if (!/^[A-Z0-9_-]{3,24}$/.test(roomId)) {
                send(socket, { type: 'error', text: 'Código de sala inválido.' });
                return;
            }
            if (rooms.has(roomId)) {
                send(socket, { type: 'error', text: 'Código de sala já está em uso.' });
                return;
            }
            client.roomId = roomId;
            client.clientId = roomId;
            client.isHost = true;
            rooms.set(roomId, { host: client, clients: new Map() });
            send(socket, { type: 'room_created', roomId });
            return;
        }

        if (message.type === 'join_room') {
            if (client.roomId) return;
            const roomId = typeof message.roomId === 'string'
                ? message.roomId.trim().toUpperCase()
                : '';
            const room = rooms.get(roomId);
            if (!room) {
                send(socket, { type: 'error', text: 'Sala não encontrada ou encerrada.' });
                return;
            }
            if (room.clients.size >= MAX_USERS - 1) {
                send(socket, { type: 'error', text: 'Sala cheia!' });
                return;
            }
            client.roomId = roomId;
            client.clientId = crypto.randomBytes(9).toString('base64url');
            room.clients.set(client.clientId, client);
            send(socket, { type: 'connected', clientId: client.clientId });
            send(room.host.socket, { type: 'client_joined', clientId: client.clientId });
            send(socket, { type: 'client_ready' });
            return;
        }

        const room = client.roomId ? rooms.get(client.roomId) : null;
        if (!room) {
            send(socket, { type: 'error', text: 'Conexão ainda não está em uma sala.' });
            return;
        }

        if (client.isHost && message.type === 'data') {
            const target = room.clients.get(message.to);
            if (target) send(target.socket, { type: 'data', data: message.data });
        } else if (!client.isHost && message.type === 'data') {
            send(room.host.socket, {
                type: 'client_data',
                from: client.clientId,
                data: message.data
            });
        } else if (client.isHost && message.type === 'close_client') {
            const target = room.clients.get(message.to);
            if (target) target.socket.close();
        }
    });

    socket.on('close', () => {
        if (!client.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        if (client.isHost) {
            room.clients.forEach((otherClient) => otherClient.socket.close());
            rooms.delete(client.roomId);
        } else {
            room.clients.delete(client.clientId);
            send(room.host.socket, { type: 'client_left', clientId: client.clientId });
        }
    });
});

server.on('error', (error) => {
    console.error('Unable to start HTTP server:', error);
    process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
    console.log(`HTTP and WebSocket server listening on port ${port}`);
});
