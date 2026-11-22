import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT) || 4322;
const rawBase = (process.env.BASE_PATH || "").trim();
const BASE_PATH =
  rawBase && rawBase !== "/" ? `/${rawBase.replace(/^\/+|\/+$/g, "")}` : "";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

    if (BASE_PATH) {
      if (url === "/") {
        res.writeHead(302, { Location: `${BASE_PATH}/` });
        res.end();
        return;
      }
      if (url === BASE_PATH) {
        url = "/";
      } else if (url.startsWith(`${BASE_PATH}/`)) {
        url = url.slice(BASE_PATH.length);
      }
    }

    let filePath = join(root, normalize(url).replace(/^(\.\.[/\\])+/, ""));

    const info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) filePath = join(filePath, "index.html");

    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Language": "ru",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    res.end(data);
  } catch {
    try {
      const page = await readFile(join(root, "404.html"));
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Language": "ru",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      });
      res.end(page);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — файл не найден");
    }
  }
});

server.listen(port, () => {
  console.log(`Веб-студия ОСНОВА → http://localhost:${port}`);
});
