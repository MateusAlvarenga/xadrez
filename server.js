const http = require('http');
const fs = require('fs');
const path = require('path');

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

server.on('error', (error) => {
    console.error('Unable to start HTTP server:', error);
    process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Static server listening on port ${port}`);
});
