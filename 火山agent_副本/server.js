import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function proxyHiAgent(body) {
  const endpoint = body.apiEndpoint || body.endpoint;
  if (!endpoint) {
    const err = new Error("缺少 HiAgent 接口地址");
    err.status = 400;
    throw err;
  }

  const headers = { "Content-Type": "application/json" };
  if (body.apiKey) {
    headers.Authorization = `Bearer ${body.apiKey}`;
  }

  const payload = {
    app_id: body.appId,
    workflow_id: body.workflowId,
    user_id: body.userId || "grid-worker-demo",
    query: body.query,
    stream: false
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(body.timeoutMs || 120000));
  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }

  const raw = await upstream.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    data = raw;
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    data
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/api/hiagent") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = await proxyHiAgent(body);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, err.status || 502, { ok: false, message: err.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    writeJson(res, 200, { ok: true, name: "digital-grid-worker", time: new Date().toISOString() });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    writeJson(res, 405, { ok: false, message: "Method Not Allowed" });
    return;
  }

  let filePath;
  try {
    filePath = path.normalize(path.join(__dirname, decodeURIComponent(url.pathname)));
  } catch (e) {
    writeJson(res, 400, { ok: false, message: "Bad Request" });
    return;
  }

  if (filePath !== __dirname && !filePath.startsWith(__dirname + path.sep)) {
    writeJson(res, 403, { ok: false, message: "Forbidden" });
    return;
  }

  if (filePath === __dirname || filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, "index.html");
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`数字网格员服务已启动：http://127.0.0.1:${PORT}`);
});
