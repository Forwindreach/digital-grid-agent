import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 3210;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("server did not become ready");
}

try {
  const healthResponse = await waitForServer();
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.equal(health.name, "digital-grid-agent");

  const pageResponse = await fetch(`${baseUrl}/`);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /数字网格员/);

  console.log("Smoke test passed: health endpoint and web entry are reachable.");
} finally {
  server.kill("SIGTERM");
}
