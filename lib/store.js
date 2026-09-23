import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_DIR = path.join(__dirname, "..", "data", "runtime");
const STORE_FILE = path.join(STORE_DIR, "store.json");

const DEFAULT_STORE = {
  seq: {
    resident: 0,
    conversation: 0,
    message: 0,
    workOrder: 0,
    session: 0
  },
  sessions: {},
  workerSessions: {},
  gridWorkers: [],
  residents: [],
  conversations: [],
  messages: [],
  workOrders: [],
  notifications: []
};

function seedGridWorkers() {
  const hash = (password) =>
    createHash("sha256").update(`grid-worker:${password}`).digest("hex");
  return [
    {
      id: "WK-0001",
      name: "系统管理员",
      account: "admin",
      passwordHash: hash("admin123"),
      phone: "",
      role: "admin",
      community: "",
      grid: "",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    },
    {
      id: "WK-0002",
      name: "华林社区负责人",
      account: "hualin_admin",
      passwordHash: hash("123456"),
      phone: "13800000002",
      role: "community_admin",
      community: "温泉街道·华林社区",
      grid: "",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    },
    {
      id: "WK-0003",
      name: "华林网格员01",
      account: "hualin01",
      passwordHash: hash("123456"),
      phone: "13800000003",
      role: "grid_worker",
      community: "温泉街道·华林社区",
      grid: "华林网格 01",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    },
    {
      id: "WK-0004",
      name: "华林网格员02",
      account: "hualin02",
      passwordHash: hash("123456"),
      phone: "13800000004",
      role: "grid_worker",
      community: "温泉街道·华林社区",
      grid: "华林网格 02",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    },
    {
      id: "WK-0005",
      name: "观风亭网格员01",
      account: "guanfeng01",
      passwordHash: hash("123456"),
      phone: "13800000005",
      role: "grid_worker",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 01",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    },
    {
      id: "WK-0006",
      name: "金泉网格员01",
      account: "jinquan01",
      passwordHash: hash("123456"),
      phone: "13800000006",
      role: "grid_worker",
      community: "温泉街道·金泉社区",
      grid: "金泉网格 01",
      grids: [],
      status: "online",
      createdAt: new Date().toISOString()
    }
  ];
}

let db = null;

export function loadStore() {
  if (db) return db;
  try {
    db = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch (err) {
    db = structuredClone(DEFAULT_STORE);
    saveStore();
  }
  if (!Array.isArray(db.gridWorkers) || db.gridWorkers.length === 0) {
    db.gridWorkers = seedGridWorkers();
    db.seq.gridWorker = db.gridWorkers.length;
    saveStore();
  }
  if (!db.workerSessions) db.workerSessions = {};
  return db;
}

export function saveStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, STORE_FILE);
}

export function nextId(store, key, prefix) {
  const seq = (store.seq[key] || 0) + 1;
  store.seq[key] = seq;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

export function sanitizeResident(resident) {
  if (!resident) return null;
  return {
    id: resident.id,
    name: resident.name || "",
    phone: resident.phone ? `${resident.phone.slice(0, 3)}****${resident.phone.slice(-4)}` : "",
    community: resident.community || "",
    grid: resident.grid || "",
    address: resident.address || "",
    status: resident.status || "unregistered",
    riskTags: resident.riskTags || [],
    consent: Boolean(resident.consent),
    createdAt: resident.createdAt,
    updatedAt: resident.updatedAt
  };
}

export function findResidentByOpenid(openid) {
  const store = loadStore();
  return store.residents.find((r) => r.openid === openid) || null;
}

export function findOrCreateResidentByOpenid(openid) {
  const store = loadStore();
  let resident = store.residents.find((r) => r.openid === openid);
  if (resident) return resident;
  const now = new Date().toISOString();
  resident = {
    id: nextId(store, "resident", "R"),
    openid,
    name: "",
    phone: "",
    community: "",
    grid: "",
    address: "",
    status: "unregistered",
    riskTags: [],
    consent: false,
    addressHistory: [],
    createdAt: now,
    updatedAt: now
  };
  store.residents.push(resident);
  saveStore();
  return resident;
}

export function registerResident(openid, input) {
  const store = loadStore();
  const resident = findResidentByOpenid(openid);
  if (!resident) throw new Error("登录状态失效");

  const oldAddress = resident.address;
  if (oldAddress && oldAddress !== input.address) {
    resident.addressHistory.push({
      address: oldAddress,
      community: resident.community,
      grid: resident.grid,
      changedAt: new Date().toISOString()
    });
  }

  resident.name = String(input.name || "").trim();
  resident.phone = String(input.phone || "").trim() || resident.phone;
  resident.community = String(input.community || "").trim();
  resident.grid = String(input.grid || "").trim();
  resident.address = String(input.address || "").trim();
  resident.consent = Boolean(input.consent);
  resident.status = "registered";
  resident.updatedAt = new Date().toISOString();
  saveStore();
  return resident;
}

export function findOrCreateConversation(residentId) {
  const store = loadStore();
  let conversation = store.conversations.find(
    (c) => c.residentId === residentId && c.status !== "closed"
  );
  if (conversation) return conversation;
  const now = new Date().toISOString();
  conversation = {
    id: nextId(store, "conversation", "C"),
    residentId,
    hiagentConversationId: "",
    pendingDraft: null,
    status: "open",
    createdAt: now,
    updatedAt: now
  };
  store.conversations.push(conversation);
  saveStore();
  return conversation;
}

export function getConversationMessages(conversationId) {
  const store = loadStore();
  return store.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function updateConversation(conversationId, patch) {
  const store = loadStore();
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;
  Object.assign(conversation, patch, { updatedAt: new Date().toISOString() });
  saveStore();
  return conversation;
}

export function addMessage(conversationId, residentId, input) {
  const store = loadStore();
  const now = new Date().toISOString();
  const message = {
    id: nextId(store, "message", "M"),
    conversationId,
    residentId,
    role: input.role,
    contentType: input.contentType || "text",
    content: input.content || "",
    attachments: input.attachments || [],
    status: input.status || "done",
    requestId: input.requestId || "",
    ticketId: input.ticketId || "",
    error: input.error || "",
    createdAt: now,
    updatedAt: now
  };
  store.messages.push(message);
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (conversation) {
    conversation.updatedAt = now;
  }
  saveStore();
  return message;
}

export function updateMessage(messageId, patch) {
  const store = loadStore();
  const message = store.messages.find((m) => m.id === messageId);
  if (!message) return null;
  Object.assign(message, patch, { updatedAt: new Date().toISOString() });
  saveStore();
  return message;
}

export function findMessageByRequestId(requestId) {
  if (!requestId) return null;
  const store = loadStore();
  return store.messages.find((m) => m.requestId === requestId) || null;
}

export function createWorkOrder(input) {
  const store = loadStore();
  const duplicate = store.workOrders.find(
    (w) => w.sourceMessageId === input.sourceMessageId
  );
  if (duplicate) return duplicate;

  const now = new Date().toISOString();
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  const workOrder = {
    id: nextId(store, "workOrder", "WO"),
    ticketNo: `GW-${ymd}-${String((store.seq.workOrder || 0)).padStart(4, "0")}`,
    residentId: input.residentId,
    conversationId: input.conversationId,
    residentName: input.residentName || "",
    residentPhone: input.residentPhone || "",
    residentAddress: input.residentAddress || "",
    community: input.community || "",
    grid: input.grid || "",
    assignedWorkerId: input.assignedWorkerId || "",
    sourceMessageId: input.sourceMessageId,
    source: input.source || "wechat_mini_program",
    category: input.category || "其他诉求",
    title: input.title || input.description || "居民诉求",
    description: input.description || "",
    incidentAddress: input.incidentAddress || "",
    happenTime: input.happenTime || "",
    duration: input.duration || "",
    frequency: input.frequency || "",
    previouslyReported: input.previouslyReported || "",
    communicationStatus: input.communicationStatus || "",
    department: input.department || "",
    priority: input.priority || "中",
    sla: input.sla || "3 个工作日",
    status: input.status || "待居民确认",
    timeline: [
      { status: "已提交", time: now, note: "居民通过微信小程序提交诉求" },
      ...(input.status === "已受理"
        ? [{ status: "居民已确认", time: now, note: input.timelineNote || "居民已确认诉求内容" }]
        : [])
    ],
    createdAt: now,
    updatedAt: now
  };
  store.workOrders.push(workOrder);
  saveStore();
  return workOrder;
}

export function findWorkOrdersByResident(residentId) {
  const store = loadStore();
  return store.workOrders
    .filter((w) => w.residentId === residentId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function findWorkOrderById(id) {
  const store = loadStore();
  return store.workOrders.find((w) => w.id === id) || null;
}

export function updateWorkOrder(id, patch) {
  const store = loadStore();
  const workOrder = store.workOrders.find((w) => w.id === id);
  if (!workOrder) return null;
  Object.assign(workOrder, patch, { updatedAt: new Date().toISOString() });
  saveStore();
  return workOrder;
}

export function createSessionToken(openid) {
  const store = loadStore();
  const token = randomUUID();
  store.sessions[token] = {
    openid,
    createdAt: new Date().toISOString()
  };
  saveStore();
  return token;
}

export function findOpenidByToken(token) {
  if (!token) return null;
  const store = loadStore();
  const session = store.sessions[token];
  return session ? session.openid : null;
}

export function listGridWorkers() {
  const store = loadStore();
  return store.gridWorkers.slice().sort((a, b) => a.id.localeCompare(b.id));
}

export function findWorkerByAccount(account) {
  const store = loadStore();
  return store.gridWorkers.find((w) => w.account === account) || null;
}

export function findWorkerById(id) {
  const store = loadStore();
  return store.gridWorkers.find((w) => w.id === id) || null;
}

export function createGridWorker(input) {
  const store = loadStore();
  const now = new Date().toISOString();
  const worker = {
    id: nextId(store, "gridWorker", "WK"),
    name: input.name || "",
    account: input.account || "",
    passwordHash: input.passwordHash || "",
    phone: input.phone || "",
    role: input.role || "grid_worker",
    community: input.community || "",
    grid: input.grid || "",
    grids: input.grids || [],
    status: input.status || "online",
    createdAt: now,
    updatedAt: now
  };
  store.gridWorkers.push(worker);
  saveStore();
  return worker;
}

export function updateGridWorker(id, patch) {
  const store = loadStore();
  const worker = store.gridWorkers.find((w) => w.id === id);
  if (!worker) return null;
  Object.assign(worker, patch, { updatedAt: new Date().toISOString() });
  saveStore();
  return worker;
}

export function createWorkerSession(workerId) {
  const store = loadStore();
  const token = randomUUID();
  store.workerSessions[token] = {
    workerId,
    createdAt: new Date().toISOString()
  };
  saveStore();
  return token;
}

export function findWorkerByToken(token) {
  if (!token) return null;
  const store = loadStore();
  const session = store.workerSessions[token];
  return session ? findWorkerById(session.workerId) : null;
}

export function deleteWorkerSession(token) {
  const store = loadStore();
  if (store.workerSessions[token]) {
    delete store.workerSessions[token];
    saveStore();
  }
}

export function countOpenWorkOrdersByWorker(workerId) {
  const store = loadStore();
  return store.workOrders.filter(
    (w) =>
      w.assignedWorkerId === workerId &&
      !["已归档", "已关闭"].includes(w.status)
  ).length;
}
