import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve("dist");
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json"
};

export function resolveRequest(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  const file = resolve(root, pathname === "/" ? "index.html" : pathname === "/about" || pathname === "/about/" ? "about/index.html" : pathname.endsWith("/") ? pathname.slice(1) + "index.html" : pathname.slice(1));
  return file.startsWith(`${root}${sep}`) ? file : null;
}

if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer(async (request, response) => {
    const file = resolveRequest(request.url);
    try {
      if (!file) throw new Error("Forbidden");
      response.setHeader("Content-Type", contentTypes[extname(file)] ?? "application/octet-stream");
      response.end(await readFile(file));
    } catch {
      response.writeHead(file ? 404 : 403).end();
    }
  }).listen(4173, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:4173"));
}
