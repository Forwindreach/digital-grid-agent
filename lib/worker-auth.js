import { createHash } from "node:crypto";
import {
  createWorkerSession,
  deleteWorkerSession,
  findWorkerByAccount,
  findWorkerByToken
} from "./store.js";

function hashPassword(password) {
  return createHash("sha256").update(`grid-worker:${password}`).digest("hex");
}

export function hashWorkerPassword(password) {
  return hashPassword(password);
}

export function verifyWorkerPassword(worker, password) {
  return worker.passwordHash === hashPassword(password);
}

export function sanitizeWorker(worker) {
  if (!worker) return null;
  return {
    id: worker.id,
    name: worker.name,
    account: worker.account,
    phone: worker.phone,
    role: worker.role,
    community: worker.community,
    grid: worker.grid,
    grids: worker.grids || [],
    status: worker.status,
    createdAt: worker.createdAt,
    updatedAt: worker.updatedAt
  };
}

export function loginWorker(account, password) {
  const worker = findWorkerByAccount(String(account || "").trim());
  if (!worker || !verifyWorkerPassword(worker, String(password || ""))) {
    const err = new Error("账号或密码错误");
    err.status = 401;
    throw err;
  }
  if (worker.status !== "online") {
    const err = new Error("当前账号不可用");
    err.status = 403;
    throw err;
  }
  const token = createWorkerSession(worker.id);
  return { token, worker };
}

export function requireWorkerAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const worker = findWorkerByToken(token);
  if (!worker) {
    const err = new Error("请先登录");
    err.status = 401;
    throw err;
  }
  return { worker, token };
}

export function logoutWorker(token) {
  deleteWorkerSession(token);
}
