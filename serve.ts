// Local play server for the game/ folder (Node 22, standard library only), so the entry runs with no build step:
//   node serve.ts              serves game/ on http://localhost:8080
//   node serve.ts --port 9000  picks another port
// It answers with the content types a browser game needs, refuses anything outside game/, binds to the loopback
// interface only, and is meant for development on your own machine, not for serving the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_DIR = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const DEFAULT_PORT = 8080;

function portFromArgs(argv: string[]): number {
  const flag = argv.indexOf('--port');
  if (flag === -1) return DEFAULT_PORT;
  const value = Number(argv[flag + 1]);
  const valid = Number.isInteger(value) && value > 0 && value < 65536;
  return valid ? value : DEFAULT_PORT;
}

const UTF8 = '; charset=utf-8';
const CONTENT_TYPES: Record<string, string> = {
  // text
  '.html': 'text/html' + UTF8,
  '.js': 'text/javascript' + UTF8,
  '.mjs': 'text/javascript' + UTF8,
  '.css': 'text/css' + UTF8,
  '.json': 'application/json' + UTF8,
  '.txt': 'text/plain' + UTF8,
  // images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  // fonts, models, binaries
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  // audio
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};
const FALLBACK_TYPE = 'application/octet-stream';

function reply(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status).end(message);
}

// Map a request path to a file inside game/, or null if it would escape the folder.
function fileFor(pathname: string): string | null {
  const wanted = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const file = resolve(join(GAME_DIR, normalize(wanted)));
  const insideGame = file === GAME_DIR || file.startsWith(GAME_DIR + sep);
  return insideGame ? file : null;
}

// Size of a regular file, or null when there is no such file.
function regularFileSize(file: string): number | null {
  try {
    const info = statSync(file);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

function handle(request: IncomingMessage, response: ServerResponse): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    reply(response, 400, 'bad request'); // malformed percent-encoding
    return;
  }
  const file = fileFor(pathname);
  if (file === null) {
    reply(response, 403, 'forbidden');
    return;
  }
  const size = regularFileSize(file);
  if (size === null) {
    reply(response, 404, 'not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? FALLBACK_TYPE,
    'content-length': size,
    'cache-control': 'no-store', // always serve the latest edit
  });
  createReadStream(file).pipe(response);
}

const port = portFromArgs(process.argv.slice(2));
createServer(handle).listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
