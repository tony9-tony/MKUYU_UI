// Local preview server for the public website: `node serve.mjs` then open
// http://localhost:5500. Browsers refuse JavaScript modules on pages opened
// straight from disk (file://), so the site needs to be served over HTTP.
// No dependencies; serves only files inside this folder.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5500;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".md": "text/plain; charset=utf-8",
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  });
}).listen(port, () => console.log(`MKUYU public site: http://localhost:${port}`));
