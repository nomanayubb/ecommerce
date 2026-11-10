// Tiny local receiver for the barkatbooks.com read: the browser tab POSTs JSON to http://127.0.0.1:47832/<name> and it is saved as data/books/<name>.json (git-ignored). GET /ping answers "ok".
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/books");
const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, GET, OPTIONS", "access-control-allow-headers": "content-type", "access-control-allow-private-network": "true" };
http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.url === "/ping") { res.writeHead(200, cors); return res.end("ok"); }
  const m = /^\/([a-z0-9_-]+)$/.exec(req.url ?? "");
  if (req.method === "POST" && m) { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { fs.writeFileSync(path.join(DIR, m[1] + ".json"), b); res.writeHead(200, cors); res.end("saved " + b.length); }); return; }
  res.writeHead(404, cors); res.end();
}).listen(47832, "127.0.0.1", () => console.log("receiver on 47832 ->", DIR));
