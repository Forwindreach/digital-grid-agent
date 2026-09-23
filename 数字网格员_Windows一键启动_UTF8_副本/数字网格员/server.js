import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addMessage,
  countOpenWorkOrdersByWorker,
  createGridWorker,
  createWorkOrder,
  findWorkerById,
  findMessageByRequestId,
  findOrCreateConversation,
  findOrCreateResidentByOpenid,
  findResidentByOpenid,
  findWorkOrderById,
  findWorkOrdersByResident,
  getConversationMessages,
  listGridWorkers,
  loadStore,
  registerResident,
  sanitizeResident,
  updateGridWorker,
  updateConversation,
  updateMessage,
  updateWorkOrder
} from "./lib/store.js";
import { login, requireAuth } from "./lib/wechat-auth.js";
import {
  hashWorkerPassword,
  loginWorker,
  logoutWorker,
  requireWorkerAuth,
  sanitizeWorker
} from "./lib/worker-auth.js";
import {
  buildPackagedRequest,
  callHiAgentWithConfig,
  getRuntimeConfig,
  processMessage,
  saveRuntimeConfig
} from "./lib/hiagent-gateway.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3100);

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
      if (data.length > 4 * 1024 * 1024) {
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

function apiError(err) {
  const status = err.status || 500;
  const message = status >= 500 ? "服务内部错误" : err.message;
  if (status >= 500) console.error(err);
  return { ok: false, status, message };
}

function authUser(req) {
  const { openid } = requireAuth(req);
  const resident = findResidentByOpenid(openid);
  if (!resident) {
    const err = new Error("登录状态失效");
    err.status = 401;
    throw err;
  }
  return { openid, resident };
}

function sanitizeMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    contentType: message.contentType,
    content: message.content,
    attachments: message.attachments || [],
    status: message.status,
    requestId: message.requestId,
    ticketId: message.ticketId || "",
    error: message.error || "",
    createdAt: message.createdAt
  };
}

function sanitizeWorkOrder(workOrder) {
  if (!workOrder) return null;
  return {
    id: workOrder.id,
    ticketNo: workOrder.ticketNo,
    source: workOrder.source,
    residentName: workOrder.residentName || "",
    residentPhone: workOrder.residentPhone
      ? `${workOrder.residentPhone.slice(0, 3)}****${workOrder.residentPhone.slice(-4)}`
      : "",
    residentAddress: workOrder.residentAddress || "",
    category: workOrder.category,
    title: workOrder.title,
    description: workOrder.description,
    incidentAddress: workOrder.incidentAddress,
    happenTime: workOrder.happenTime || "",
    duration: workOrder.duration || "",
    frequency: workOrder.frequency || "",
    previouslyReported: workOrder.previouslyReported || "",
    communicationStatus: workOrder.communicationStatus || "",
    community: workOrder.community || "",
    grid: workOrder.grid || "",
    assignedWorkerId: workOrder.assignedWorkerId || "",
    department: workOrder.department,
    priority: workOrder.priority,
    sla: workOrder.sla,
    status: workOrder.status,
    timeline: workOrder.timeline || [],
    createdAt: workOrder.createdAt,
    updatedAt: workOrder.updatedAt
  };
}

function pickTicketValue(ticket, keys, fallback) {
  for (const key of keys) {
    const value = ticket[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function inferDuration(value) {
  const text = String(value || "");
  const days = text.match(/(\d+)\s*天/);
  if (days) return `约 ${days[1]} 天`;
  if (/一周|一个星期/.test(text)) return "约一周";
  if (/一个月/.test(text)) return "约一个月";
  if (/持续|一直/.test(text)) return "持续发生";
  return "";
}

function inferFrequency(value) {
  const text = String(value || "");
  if (/每晚|每天|夜间/.test(text)) return "每天/夜间";
  if (/周末/.test(text)) return "周末";
  if (/偶尔/.test(text)) return "偶尔";
  return "";
}

function inferPreviouslyReported(value) {
  return /反映|反馈|物业|沟通过/.test(String(value || "")) ? "是" : "";
}

function canManageWorkOrders(worker) {
  return ["community_admin", "street_admin", "admin"].includes(worker.role);
}

function workerCanSeeWorkOrder(worker, workOrder) {
  if (worker.role === "admin" || worker.role === "street_admin") return true;
  if (worker.role === "community_admin") {
    return worker.community === workOrder.community;
  }
  return workOrder.assignedWorkerId === worker.id;
}

function workerCanOperateWorkOrder(worker, workOrder) {
  return (
    worker.role === "grid_worker" &&
    Boolean(workOrder.assignedWorkerId) &&
    workOrder.assignedWorkerId === worker.id
  );
}

function appendWorkOrderTimeline(workOrder, status, note) {
  return [
    ...(workOrder.timeline || []),
    {
      status,
      time: new Date().toISOString(),
      note
    }
  ];
}

function autoAssignWorkOrder(workOrder) {
  const candidates = listGridWorkers()
    .filter(
      (worker) =>
        worker.role === "grid_worker" &&
        worker.status === "online" &&
        (!workOrder.community || worker.community === workOrder.community) &&
        (workOrder.grid &&
          (worker.grid === workOrder.grid ||
            (worker.grids || []).includes(workOrder.grid)))
    )
    .sort(
      (a, b) =>
        countOpenWorkOrdersByWorker(a.id) - countOpenWorkOrdersByWorker(b.id)
    );
  return candidates[0] || null;
}

function buildAdminWorkOrder(workOrder, store) {
  const residentsById = new Map(store.residents.map((r) => [r.id, r]));
  const workersById = new Map(store.gridWorkers.map((w) => [w.id, w]));
  return {
    ...sanitizeWorkOrder(workOrder),
    residentName: (residentsById.get(workOrder.residentId) || {}).name || "小程序居民",
    residentPhone: workOrder.residentPhone || (residentsById.get(workOrder.residentId) || {}).phone || "",
    assignedWorkerName: workOrder.assignedWorkerId
      ? (workersById.get(workOrder.assignedWorkerId) || {}).name || ""
      : "",
    handlingStartedAt: workOrder.handlingStartedAt || "",
    handlingResult: workOrder.handlingResult || "",
    residentFeedback: workOrder.residentFeedback || "",
    handledBy: workOrder.handledBy || "",
    handledByName: workOrder.handledByName || "",
    resolvedAt: workOrder.resolvedAt || "",
    archivedBy: workOrder.archivedBy || "",
    archivedByName: workOrder.archivedByName || "",
    archivedAt: workOrder.archivedAt || ""
  };
}

function assignWorkOrderToWorker(workOrder, worker) {
  const now = new Date().toISOString();
  return updateWorkOrder(workOrder.id, {
    assignedWorkerId: worker.id,
    status: "已派单",
    timeline: [
      ...(workOrder.timeline || []),
      { status: "已派单", time: now, note: `已派给${worker.name}` }
    ]
  });
}

async function handleApi(req, res, url) {
  const method = req.method;
  const pathname = url.pathname;

  if (method === "POST" && pathname === "/api/wechat/login") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const result = await login(body);
    writeJson(res, 200, {
      ok: true,
      token: result.token,
      resident: sanitizeResident(result.resident)
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/me") {
    const { resident } = authUser(req);
    writeJson(res, 200, { ok: true, resident: sanitizeResident(resident) });
    return true;
  }

  if (method === "POST" && pathname === "/api/residents/register") {
    const { openid, resident } = authUser(req);
    const body = JSON.parse((await readBody(req)) || "{}");
    const isEdit = resident.status === "registered";
    if (!body.name || !body.address || !body.community || !body.grid || (!isEdit && !body.phone)) {
      const err = new Error(isEdit ? "请完整填写姓名、社区、网格和地址" : "请完整填写姓名、手机号、社区、网格和地址");
      err.status = 400;
      throw err;
    }
    if (!body.consent) {
      const err = new Error("请先同意个人信息使用说明");
      err.status = 400;
      throw err;
    }
    const updatedResident = registerResident(openid, body);
    writeJson(res, 200, { ok: true, resident: sanitizeResident(updatedResident) });
    return true;
  }

  if (method === "GET" && pathname === "/api/conversation") {
    const { resident } = authUser(req);
    const conversation = findOrCreateConversation(resident.id);
    const messages = getConversationMessages(conversation.id);
    writeJson(res, 200, {
      ok: true,
      conversation: {
        id: conversation.id,
        status: conversation.status,
        createdAt: conversation.createdAt
      },
      messages: messages.map(sanitizeMessage)
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/messages") {
    const { resident } = authUser(req);
    if (resident.status !== "registered") {
      const err = new Error("请先完成地址登记后再提交诉求");
      err.status = 400;
      throw err;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const text = String(body.text || "").trim();
    if (!text) {
      const err = new Error("请输入诉求内容");
      err.status = 400;
      throw err;
    }

    const duplicate = findMessageByRequestId(body.requestId);
    if (duplicate) {
      writeJson(res, 200, {
        ok: true,
        messageId: duplicate.id,
        status: duplicate.status,
        duplicate: true
      });
      return true;
    }

    const conversation = findOrCreateConversation(resident.id);
    const requestId = String(body.requestId || `req-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const userMessage = addMessage(conversation.id, resident.id, {
      role: "user",
      contentType: "text",
      content: text,
      attachments: body.attachments || [],
      status: "processing",
      requestId
    });

    const previousMessages = getConversationMessages(conversation.id)
      .filter((m) => m.id !== userMessage.id)
      .slice(-8);
    const activeWorkOrders = findWorkOrdersByResident(resident.id)
      .filter((w) => !["已归档", "已关闭"].includes(w.status))
      .map((w) => ({
        id: w.id,
        ticketNo: w.ticketNo,
        status: w.status,
        category: w.category,
        department: w.department
      }));

    const packaged = buildPackagedRequest({
      requestId,
      conversationId: conversation.id,
      resident: {
        id: resident.id,
        name: resident.name,
        phone_masked: resident.phone ? `${resident.phone.slice(0, 3)}****${resident.phone.slice(-4)}` : "",
        community: resident.community,
        grid: resident.grid,
        default_address: resident.address
      },
      text,
      incidentAddress: body.incidentAddress || "",
      attachments: body.attachments || [],
      recentMessages: previousMessages,
      activeWorkOrders
    });

    writeJson(res, 200, {
      ok: true,
      messageId: userMessage.id,
      status: "processing",
      requestId
    });

    setImmediate(async () => {
      try {
        const result = await processMessage(packaged, conversation);
        if (result.conversationId) {
          updateConversation(conversation.id, {
            hiagentConversationId: result.conversationId
          });
        }

        const userConfirmed =
          Boolean(conversation.pendingDraft) &&
          /确认提交|确认无误|没问题|可以提交|同意|是的|按这个/.test(packaged.message.text);
        if (result.pendingDraft) {
          updateConversation(conversation.id, { pendingDraft: result.pendingDraft });
        }
        if (result.clearDraft) {
          updateConversation(conversation.id, { pendingDraft: null });
        }
        if (result.ticketReady) {
          updateConversation(conversation.id, { pendingDraft: null });
        }

        let ticketId = "";
        if (result.ticket && (userConfirmed || result.ticketReady)) {
          const ticket = result.ticket;
          const happenTimeValue = pickTicketValue(
            ticket,
            ["happen_time", "happenTime", "发生时间", "持续时间"],
            ""
          );
          const ticketText = `${text} ${happenTimeValue} ${ticket.description || ""}`;
          const workOrder = createWorkOrder({
            residentId: resident.id,
            conversationId: conversation.id,
            residentName: resident.name,
            residentPhone: resident.phone,
            residentAddress: resident.address,
            community: resident.community,
            grid: resident.grid,
            sourceMessageId: userMessage.id,
            source: "wechat_mini_program",
            category: pickTicketValue(ticket, ["category", "类别", "ticket_type", "工单类型"], "其他诉求"),
            title: pickTicketValue(ticket, ["title", "标题"], (ticket.description || text).slice(0, 50)),
            description: pickTicketValue(ticket, ["description", "summary", "摘要"], text),
            incidentAddress: pickTicketValue(
              ticket,
              ["incident_address", "incidentAddress", "address", "事发地址"],
              body.incidentAddress || resident.address
            ),
            happenTime: pickTicketValue(
              ticket,
              ["happen_time", "happenTime", "发生时间", "持续时间"],
              happenTimeValue
            ),
            duration: pickTicketValue(
              ticket,
              ["duration", "持续时长", "持续多久"],
              inferDuration(happenTimeValue)
            ),
            frequency: pickTicketValue(
              ticket,
              ["frequency", "发生频率", "频率"],
              inferFrequency(happenTimeValue)
            ),
            previouslyReported: pickTicketValue(
              ticket,
              ["previously_reported", "previouslyReported", "是否已反映"],
              inferPreviouslyReported(ticketText)
            ),
            communicationStatus: pickTicketValue(
              ticket,
              ["communication_status", "communicationStatus", "沟通情况"],
              ""
            ),
            department: pickTicketValue(ticket, ["department", "dept", "责任部门"], "温泉街道社区服务中心"),
            priority: pickTicketValue(ticket, ["priority", "优先级"], "中"),
            sla: pickTicketValue(ticket, ["sla", "响应时限"], "3 个工作日"),
            status: pickTicketValue(ticket, ["status", "状态"], "已受理"),
            timelineNote: "数字网格员已生成工单"
          });
          const assignedWorker = autoAssignWorkOrder(workOrder);
          if (assignedWorker) {
            assignWorkOrderToWorker(workOrder, assignedWorker);
          }
          ticketId = workOrder.id;
        } else if (result.ticket) {
          updateConversation(conversation.id, { pendingDraft: result.ticket });
        }

        let replyText = result.text || "";
        if (result.ticket && !userConfirmed && !result.ticketReady && !/确认/.test(replyText)) {
          replyText = `${replyText}\n\n如信息无误，请回复“确认提交”。`;
        }
        const assistant = addMessage(conversation.id, resident.id, {
          role: "assistant",
          contentType: "text",
          content: replyText,
          status: "done",
          requestId: `reply-${requestId}`,
          ticketId
        });
        if (ticketId) {
          const workOrder = findWorkOrderById(ticketId);
          const appended = `${assistant.content}\n\n工单号：${workOrder.ticketNo}\n责任部门：${workOrder.department}\n当前状态：${workOrder.status}`;
          updateMessage(assistant.id, { content: appended });
        }
        updateMessage(userMessage.id, { status: "done" });
      } catch (err) {
        updateMessage(userMessage.id, { status: "failed", error: err.message });
        addMessage(conversation.id, resident.id, {
          role: "assistant",
          contentType: "text",
          content: "处理失败，请稍后重试或联系社区网格员。",
          status: "failed",
          requestId: `reply-${requestId}`,
          error: err.message
        });
      }
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/work-orders") {
    const { resident } = authUser(req);
    const workOrders = findWorkOrdersByResident(resident.id);
    writeJson(res, 200, { ok: true, workOrders: workOrders.map(sanitizeWorkOrder) });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/auth/login") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const result = loginWorker(body.account, body.password);
    writeJson(res, 200, {
      ok: true,
      token: result.token,
      worker: sanitizeWorker(result.worker)
    });
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/auth/me") {
    const { worker } = requireWorkerAuth(req);
    writeJson(res, 200, { ok: true, worker: sanitizeWorker(worker) });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/auth/logout") {
    const { token } = requireWorkerAuth(req);
    logoutWorker(token);
    writeJson(res, 200, { ok: true });
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/grid-workers") {
    const { worker } = requireWorkerAuth(req);
    if (!canManageWorkOrders(worker) && worker.role !== "admin") {
      const err = new Error("无权限查看网格员列表");
      err.status = 403;
      throw err;
    }
    const workers = listGridWorkers().map((item) => ({
      ...sanitizeWorker(item),
      openWorkOrders: countOpenWorkOrdersByWorker(item.id)
    }));
    writeJson(res, 200, { ok: true, workers });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/grid-workers") {
    const { worker } = requireWorkerAuth(req);
    if (worker.role !== "admin") {
      const err = new Error("仅管理员可新增网格员");
      err.status = 403;
      throw err;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!body.account || !body.password || !body.name) {
      const err = new Error("请填写账号、密码和姓名");
      err.status = 400;
      throw err;
    }
    const existing = listGridWorkers().find((w) => w.account === body.account);
    if (existing) {
      const err = new Error("账号已存在");
      err.status = 400;
      throw err;
    }
    const created = createGridWorker({
      name: body.name,
      account: body.account,
      passwordHash: hashWorkerPassword(body.password),
      phone: body.phone || "",
      role: body.role || "grid_worker",
      community: body.community || "",
      grid: body.grid || "",
      grids: body.grids || [],
      status: body.status || "online"
    });
    writeJson(res, 200, { ok: true, worker: sanitizeWorker(created) });
    return true;
  }

  const workerUpdateMatch = pathname.match(/^\/api\/admin\/grid-workers\/([^/]+)$/);
  if (method === "PUT" && workerUpdateMatch) {
    const { worker } = requireWorkerAuth(req);
    if (worker.role !== "admin") {
      const err = new Error("仅管理员可修改网格员");
      err.status = 403;
      throw err;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const patch = {
      name: body.name,
      phone: body.phone,
      role: body.role,
      community: body.community,
      grid: body.grid,
      grids: body.grids,
      status: body.status
    };
    if (body.password) patch.passwordHash = hashWorkerPassword(body.password);
    const updated = updateGridWorker(decodeURIComponent(workerUpdateMatch[1]), patch);
    if (!updated) {
      const err = new Error("网格员不存在");
      err.status = 404;
      throw err;
    }
    writeJson(res, 200, { ok: true, worker: sanitizeWorker(updated) });
    return true;
  }

  if (method === "GET" && pathname === "/api/admin/work-orders") {
    const { worker } = requireWorkerAuth(req);
    const store = loadStore();
    const workOrders = store.workOrders
      .filter((workOrder) => workerCanSeeWorkOrder(worker, workOrder))
      .map((workOrder) => buildAdminWorkOrder(workOrder, store))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeJson(res, 200, { ok: true, worker: sanitizeWorker(worker), workOrders });
    return true;
  }

  const adminWorkOrderMatch = pathname.match(/^\/api\/admin\/work-orders\/([^/]+)$/);
  if (method === "GET" && adminWorkOrderMatch) {
    const { worker } = requireWorkerAuth(req);
    const workOrder = findWorkOrderById(decodeURIComponent(adminWorkOrderMatch[1]));
    if (!workOrder || !workerCanSeeWorkOrder(worker, workOrder)) {
      const err = new Error("工单不存在或无权查看");
      err.status = 404;
      throw err;
    }
    writeJson(res, 200, {
      ok: true,
      workOrder: buildAdminWorkOrder(workOrder, loadStore())
    });
    return true;
  }

  const assignMatch = pathname.match(/^\/api\/admin\/work-orders\/([^/]+)\/assign$/);
  if (method === "POST" && assignMatch) {
    const { worker } = requireWorkerAuth(req);
    if (!canManageWorkOrders(worker)) {
      const err = new Error("网格员无权派单");
      err.status = 403;
      throw err;
    }
    const workOrder = findWorkOrderById(decodeURIComponent(assignMatch[1]));
    if (!workOrder || !workerCanSeeWorkOrder(worker, workOrder)) {
      const err = new Error("工单不存在或无权操作");
      err.status = 404;
      throw err;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const targetWorker = findWorkerById(body.workerId);
    if (!targetWorker || targetWorker.role !== "grid_worker") {
      const err = new Error("请选择有效的网格员");
      err.status = 400;
      throw err;
    }
    const updated = assignWorkOrderToWorker(workOrder, targetWorker);
    writeJson(res, 200, {
      ok: true,
      workOrder: buildAdminWorkOrder(updated, loadStore())
    });
    return true;
  }

  const startWorkOrderMatch = pathname.match(
    /^\/api\/admin\/work-orders\/([^/]+)\/start$/
  );
  if (method === "POST" && startWorkOrderMatch) {
    const { worker } = requireWorkerAuth(req);
    const workOrder = findWorkOrderById(
      decodeURIComponent(startWorkOrderMatch[1])
    );
    if (!workOrder || !workerCanOperateWorkOrder(worker, workOrder)) {
      const err = new Error("工单不存在或无权处理");
      err.status = 404;
      throw err;
    }
    if (!["已派单", "待处理", "已受理"].includes(workOrder.status)) {
      const err = new Error("当前工单状态不能开始处理");
      err.status = 400;
      throw err;
    }
    const updated = updateWorkOrder(workOrder.id, {
      status: "处理中",
      handlingStartedAt:
        workOrder.handlingStartedAt || new Date().toISOString(),
      timeline: appendWorkOrderTimeline(
        workOrder,
        "处理中",
        `${worker.name}已接收工单并开始处理`
      )
    });
    writeJson(res, 200, {
      ok: true,
      workOrder: buildAdminWorkOrder(updated, loadStore())
    });
    return true;
  }

  const resolveWorkOrderMatch = pathname.match(
    /^\/api\/admin\/work-orders\/([^/]+)\/resolve$/
  );
  if (method === "POST" && resolveWorkOrderMatch) {
    const { worker } = requireWorkerAuth(req);
    const workOrder = findWorkOrderById(
      decodeURIComponent(resolveWorkOrderMatch[1])
    );
    if (!workOrder || !workerCanOperateWorkOrder(worker, workOrder)) {
      const err = new Error("工单不存在或无权处理");
      err.status = 404;
      throw err;
    }
    if (workOrder.status !== "处理中") {
      const err = new Error("请先将工单提交为处理中");
      err.status = 400;
      throw err;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const handlingResult = String(body.handlingResult || "").trim();
    const residentFeedback = String(body.residentFeedback || "").trim();
    if (!handlingResult) {
      const err = new Error("请填写处置结果");
      err.status = 400;
      throw err;
    }
    if (handlingResult.length > 2000 || residentFeedback.length > 1000) {
      const err = new Error("处置结果或居民反馈内容过长");
      err.status = 400;
      throw err;
    }
    const now = new Date().toISOString();
    const updated = updateWorkOrder(workOrder.id, {
      status: "待确认",
      handlingResult,
      residentFeedback,
      handledBy: worker.id,
      handledByName: worker.name,
      resolvedAt: now,
      timeline: appendWorkOrderTimeline(
        workOrder,
        "处置完成",
        `${worker.name}已提交处置结果，等待确认归档`
      )
    });
    writeJson(res, 200, {
      ok: true,
      workOrder: buildAdminWorkOrder(updated, loadStore())
    });
    return true;
  }

  const archiveWorkOrderMatch = pathname.match(
    /^\/api\/admin\/work-orders\/([^/]+)\/archive$/
  );
  if (method === "POST" && archiveWorkOrderMatch) {
    const { worker } = requireWorkerAuth(req);
    const workOrder = findWorkOrderById(
      decodeURIComponent(archiveWorkOrderMatch[1])
    );
    if (!workOrder || !workerCanOperateWorkOrder(worker, workOrder)) {
      const err = new Error("工单不存在或无权处理");
      err.status = 404;
      throw err;
    }
    if (workOrder.status !== "待确认") {
      const err = new Error("只有待确认工单可以归档");
      err.status = 400;
      throw err;
    }
    const now = new Date().toISOString();
    const updated = updateWorkOrder(workOrder.id, {
      status: "已归档",
      archivedBy: worker.id,
      archivedByName: worker.name,
      archivedAt: now,
      timeline: appendWorkOrderTimeline(
        workOrder,
        "已归档",
        `${worker.name}确认处置完成，工单已归档`
      )
    });
    writeJson(res, 200, {
      ok: true,
      workOrder: buildAdminWorkOrder(updated, loadStore())
    });
    return true;
  }

  const workOrderMatch = pathname.match(/^\/api\/work-orders\/([^/]+)$/);
  if (method === "GET" && workOrderMatch) {
    const { resident } = authUser(req);
    const workOrder = findWorkOrderById(decodeURIComponent(workOrderMatch[1]));
    if (!workOrder || workOrder.residentId !== resident.id) {
      const err = new Error("工单不存在");
      err.status = 404;
      throw err;
    }
    writeJson(res, 200, { ok: true, workOrder: sanitizeWorkOrder(workOrder) });
    return true;
  }

  const confirmMatch = pathname.match(/^\/api\/work-orders\/([^/]+)\/confirm$/);
  if (method === "POST" && confirmMatch) {
    const { resident } = authUser(req);
    const workOrder = findWorkOrderById(decodeURIComponent(confirmMatch[1]));
    if (!workOrder || workOrder.residentId !== resident.id) {
      const err = new Error("工单不存在");
      err.status = 404;
      throw err;
    }
    if (workOrder.status !== "待居民确认") {
      const err = new Error("当前工单状态不能确认");
      err.status = 400;
      throw err;
    }
    const now = new Date().toISOString();
    updateWorkOrder(workOrder.id, {
      status: "已受理",
      timeline: [...(workOrder.timeline || []), { status: "居民已确认", time: now, note: "居民确认诉求内容无误" }]
    });
    writeJson(res, 200, { ok: true, workOrder: sanitizeWorkOrder(findWorkOrderById(workOrder.id)) });
    return true;
  }

  if (method === "GET" && pathname === "/api/runtime/config") {
    const config = getRuntimeConfig();
    writeJson(res, 200, {
      ok: true,
      mode: config.mode,
      appId: config.mode === "hiagent" ? config.appId : "",
      workflowId: config.mode === "hiagent" ? config.workflowId : ""
    });
    return true;
  }

  if (method === "POST" && pathname === "/api/admin/hiagent-config") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const config = saveRuntimeConfig(body);
    writeJson(res, 200, {
      ok: true,
      mode: config.mode,
      appId: config.appId,
      workflowId: config.workflowId
    });
    return true;
  }

  return false;
}

async function proxyHiAgent(body) {
  const result = await callHiAgentWithConfig(
    {
      endpoint: body.apiEndpoint || body.endpoint,
      appId: body.appId,
      workflowId: body.workflowId,
      apiKey: body.apiKey
    },
    {
      text: body.query,
      userId: body.userId || "grid-worker-demo",
      conversationId: body.conversationId || ""
    }
  );
  return { ok: true, status: 200, data: result };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/api/hiagent") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const result = await proxyHiAgent(body);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, err.status || 502, apiError(err));
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    writeJson(res, 200, {
      ok: true,
      name: "digital-grid-worker",
      time: new Date().toISOString()
    });
    return;
  }

  if (req.url.startsWith("/api/")) {
    try {
      const handled = await handleApi(req, res, url);
      if (!handled) writeJson(res, 404, { ok: false, message: "接口不存在" });
    } catch (err) {
      writeJson(res, err.status || 500, apiError(err));
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    writeJson(res, 405, { ok: false, message: "Method Not Allowed" });
    return;
  }

  let filePath;
  try {
    filePath = path.normalize(path.join(__dirname, decodeURIComponent(url.pathname)));
  } catch (err) {
    writeJson(res, 400, { ok: false, message: "Bad Request" });
    return;
  }

  if (
    filePath !== __dirname &&
    !filePath.startsWith(__dirname + path.sep)
  ) {
    writeJson(res, 403, { ok: false, message: "Forbidden" });
    return;
  }

  if (
    filePath.startsWith(path.join(__dirname, "data", "runtime") + path.sep) ||
    filePath.endsWith(".env") ||
    path.basename(filePath) === "hiagent-config.json"
  ) {
    writeJson(res, 403, { ok: false, message: "Forbidden" });
    return;
  }

  if (filePath === __dirname || filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, "index.html");
  }

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      writeJson(res, 404, { ok: false, message: "Not Found" });
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`数字网格员服务已启动（监听所有网卡）：http://127.0.0.1:${PORT}`);
});
