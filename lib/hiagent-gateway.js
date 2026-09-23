import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "..", "data", "runtime", "hiagent-config.json");

const DEPARTMENTS = {
  "环境卫生类": "鼓楼区环卫中心",
  "噪音扰民类": "鼓楼区城管中队",
  "违建秩序类": "鼓楼区城管中队",
  "物业服务类": "温泉街道社区服务中心",
  "养老服务类": "温泉街道社区服务中心",
  "政策咨询类": "鼓楼区政务服务中心",
  "其他诉求": "温泉街道社区服务中心"
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalize(data) {
  const candidates = [];
  const walk = (node, depth = 0) => {
    if (!node || depth > 5) return;
    if (typeof node === "string") {
      candidates.push(node);
      return;
    }
    if (typeof node !== "object") return;
    for (const key of ["reply", "answer", "output", "text", "message", "content"]) {
      const value = node[key];
      if (typeof value === "string" && value.trim()) {
        candidates.push(value);
      } else if (value && typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  };
  walk(data);

  const findTicket = (node, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 5) return null;
    for (const key of ["ticket", "ticket_data", "work_order", "workOrder"]) {
      if (node[key] && typeof node[key] === "object") return node[key];
    }
    for (const value of Object.values(node)) {
      const found = findTicket(value, depth + 1);
      if (found) return found;
    }
    return null;
  };

  const findConversationId = (node, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 5) return "";
    for (const key of ["conversation_id", "conversationId", "app_conversation_id"]) {
      if (typeof node[key] === "string" && node[key]) return node[key];
    }
    for (const value of Object.values(node)) {
      const found = findConversationId(value, depth + 1);
      if (found) return found;
    }
    return "";
  };

  return {
    text: candidates.find((x) => typeof x === "string" && x.trim()) || "",
    ticket: findTicket(data),
    conversationId: findConversationId(data)
  };
}

export function getRuntimeConfig() {
  const fromEnv = {
    endpoint: process.env.HIAGENT_ENDPOINT || "",
    appId: process.env.HIAGENT_APP_ID || process.env.HIAGENT_APPID || "",
    workflowId: process.env.HIAGENT_WORKFLOW_ID || process.env.HIAGENT_WORKFLOWID || "",
    apiKey: process.env.HIAGENT_API_KEY || ""
  };
  const configured = fromEnv.endpoint && fromEnv.appId && fromEnv.workflowId;
  if (configured) return { mode: "hiagent", ...fromEnv };

  try {
    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    if (fileConfig.endpoint && fileConfig.appId && fileConfig.workflowId) {
      return { mode: "hiagent", ...fileConfig };
    }
  } catch (err) {
    // 未配置真实 HiAgent 时使用本地模拟，保证小程序可以离线联调。
  }

  return { mode: "simulation" };
}

export function saveRuntimeConfig(input) {
  const endpoint = String(input.endpoint || input.apiEndpoint || "").trim();
  const appId = String(input.appId || "").trim();
  const workflowId = String(input.workflowId || "").trim();
  if (!endpoint || !appId || !workflowId) {
    const err = new Error("请完整填写接口地址、应用 ID 和工作流 ID");
    err.status = 400;
    throw err;
  }
  const config = {
    endpoint,
    appId,
    workflowId,
    apiKey: String(input.apiKey || "").trim()
  };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
  return { mode: "hiagent", ...config };
}

export function buildPackagedRequest(input) {
  const recent = input.recentMessages || [];
  return {
    request_id: input.requestId,
    session_id: input.conversationId,
    source: input.source || "wechat_mini_program",
    resident: input.resident,
    conversation: {
      session_id: input.conversationId,
      turn_count: input.turnCount || 1
    },
    message: {
      text: input.text || "",
      attachments: input.attachments || [],
      incident_address:
        input.incidentAddress ||
        input.resident.address ||
        input.resident.default_address ||
        ""
    },
    context: {
      last_turns: recent.map((m) => ({
        role: m.role,
        content: m.content
      })),
      active_work_orders: input.activeWorkOrders || []
    }
  };
}

function classify(text) {
  if (/政策|补贴|申请|材料|条件|流程|窗口|咨询|办理|养老|保险|救助|补助/.test(text)) {
    return { category: "政策咨询类", isPolicy: true };
  }
  if (/垃圾|卫生|堆|臭味|占道|清扫|清运/.test(text)) {
    return { category: "环境卫生类", isPolicy: false };
  }
  if (/噪音|噪声|扰民|施工|装修|机器/.test(text)) {
    return { category: "噪音扰民类", isPolicy: false };
  }
  if (/违建|加盖|乱搭|私建/.test(text)) {
    return { category: "违建秩序类", isPolicy: false };
  }
  if (/物业|电梯|楼道|灯|漏水|门禁|停车/.test(text)) {
    return { category: "物业服务类", isPolicy: false };
  }
  return { category: "其他诉求", isPolicy: false };
}

function simulate(packaged, conversation) {
  const text = packaged.message.text.trim();
  const draft = conversation.pendingDraft || null;
  const cls = classify(text);
  const address = packaged.message.incident_address || packaged.resident.address || "";
  const high = /紧急|危险|漏电|火灾|火|伤亡|砸|严重|马上/.test(text);
  const priority = high ? "高" : "中";
  const sla = priority === "高" ? "24 小时" : "3 个工作日";
  const cancel = /取消|算了|不提交|先不/.test(text);
  const confirm = /确认提交|确认无误|没问题|可以提交|同意|是的|按这个|就这样/.test(text);

  if (draft) {
    if (cancel) {
      return {
        text: "好的，已取消本次诉求登记。之后如有需要，您可以随时重新描述问题。",
        clearDraft: true,
        conversationId: ""
      };
    }
    if (confirm) {
      return {
        text: "好的，已按您确认的信息生成工单，后续处理进度会同步给您。",
        ticket: draft,
        clearDraft: true,
        conversationId: ""
      };
    }
    const updated = {
      ...draft,
      title: text.length >= 5 ? text.slice(0, 50) : draft.title,
      description: `${draft.description}\n居民补充：${text}`
    };
    const addressMatch = text.match(/地址(?:是|为|在)?[:：]?\s*(.+)/);
    const addressClean = text.replace(/^(?:地点|位置|事发地址|地址)(?:是|为|在)?[:：]?\s*/, "");
    const addrHint = addressClean.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,14}(?:路|街|巷|弄|大道|小区|花园|新村|园|公寓)[^\s，。,.;；]{0,18}/);
    if (addressMatch) {
      updated.incident_address = addressMatch[1].trim().replace(/[，。；,.;]*$/, "");
    } else if (addrHint) {
      updated.incident_address = addrHint[0];
    }
    return {
      text: `已收到您的补充：${text}。请确认是否按更新后的信息提交？如信息无误，请回复“确认提交”。`,
      pendingDraft: updated,
      conversationId: ""
    };
  }

  if (cls.isPolicy) {
    return {
      text: `您好，我收到了您关于“${text.slice(0, 40)}”的咨询。为了更准确地为您解答，请告诉我您想了解：1. 办理条件；2. 所需材料；3. 办理地点或流程；也可以直接补充具体政策名称或您的实际情况。`,
      ticket: null,
      conversationId: ""
    };
  }

  const ticket = {
    category: cls.category,
    incident_address: address,
    resident_address: packaged.resident.default_address || "",
    title: text.slice(0, 50),
    description: text,
    happen_time: /持续|一直|长期|每天|每晚/.test(text) ? "持续发生" : "",
    duration: "",
    frequency: /每天|每晚|夜间|周末/.test(text) ? "高频" : "",
    previously_reported: /反馈过|反映过|说过|沟通过/.test(text) ? "是" : "否",
    communication_status: "",
    department: DEPARTMENTS[cls.category] || DEPARTMENTS["其他诉求"],
    priority,
    sla,
    needs_human_review: high
  };
  return {
    text: `您好，我已收到您反映的问题：${text}。当前登记地址为：${address}。为准确生成工单，请您确认：是否按以上信息提交？如信息无误，请回复“确认提交”；如有补充或更正，可以直接告诉我。`,
    pendingDraft: ticket,
    conversationId: ""
  };
}

async function callHiAgent(cfg, packaged, conversation) {
  return callHiAgentWithConfig(cfg, {
    text: packaged.message.text,
    userId: packaged.resident.id || "grid-worker-demo",
    conversationId: conversation.hiagentConversationId || ""
  });
}

async function requestHiAgent(cfg, path, body, retries = 2) {
  const endpoint = String(cfg.endpoint || "").replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${endpoint}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Apikey: cfg.apiKey || ""
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const raw = await response.text();
    if (response.status === 429 && retries > 0) {
      const retryAfter = Number(response.headers.get("retry-after")) || 15000;
      await sleep(Math.min(retryAfter, 30000));
      return requestHiAgent(cfg, path, body, retries - 1);
    }
    if (!response.ok) {
      const detail = raw.slice(0, 240);
      const message =
        response.status === 429
          ? "HiAgent 请求过于频繁，请稍后再试"
          : `HiAgent 请求失败：HTTP ${response.status} ${detail}`;
      throw new Error(message);
    }
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

function parseStreamingAnswer(raw) {
  if (!raw.includes("data:")) {
    try {
      const json = JSON.parse(raw);
      if (json && typeof json.answer === "string") {
        return {
          text: json.answer,
          appConversationId:
            json.app_conversation_id || json.AppConversationID || "",
          ticket: null
        };
      }
    } catch (err) {
      // 按 SSE 文本继续解析
    }
  }

  let answer = "";
  let appConversationId = "";
  let ticket = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    let event;
    try {
      event = JSON.parse(payload);
    } catch (err) {
      continue;
    }
    if (event.event === "message" && typeof event.answer === "string") {
      answer += event.answer;
    }
    if (event.app_conversation_id || event.AppConversationID) {
      appConversationId = event.app_conversation_id || event.AppConversationID;
    }
    if (event.event === "message_failed") {
      throw new Error(event.error || "HiAgent 消息处理失败");
    }
    if (event.event === "agent_error") {
      throw new Error(event.error_msg || "HiAgent Agent 处理失败");
    }
    if (event.event === "sub_task_end") {
      const taskResult = event.task_result;
      if (typeof taskResult === "string" && taskResult.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(taskResult);
          if (parsed.ticket_type || parsed.address || parsed.description) {
            ticket = parsed;
          }
        } catch (err) {
          ticket = null;
        }
      } else if (taskResult && typeof taskResult === "object") {
        if (taskResult.ticket_type || taskResult.address || taskResult.description) {
          ticket = taskResult;
        }
      }
    }
    if (event.event === "message_end") {
      break;
    }
  }
  if (!answer) {
    throw new Error("HiAgent 未返回可识别的回复内容");
  }
  return { text: answer, appConversationId, ticket };
}

export async function callHiAgentWithConfig(cfg, input) {
  const userId = input.userId || "grid-worker-demo";
  let conversationId = input.conversationId || "";
  if (!conversationId) {
    const created = await requestHiAgent(cfg, "create_conversation", {
      AppKey: cfg.appId,
      UserID: userId,
      Inputs: {}
    });
    try {
      const parsed = JSON.parse(created);
      conversationId =
        (parsed.Conversation && parsed.Conversation.AppConversationID) || "";
    } catch (err) {
      conversationId = "";
    }
    if (!conversationId) {
      throw new Error("HiAgent 创建会话失败");
    }
  }

  const sendChat = async (conversationIdToUse) => {
    const raw = await requestHiAgent(cfg, "chat_query_v2", {
      AppKey: cfg.appId,
      AppConversationID: conversationIdToUse,
      Query: input.text || "",
      ResponseMode: "streaming",
      UserID: userId
    });
    const parsed = parseStreamingAnswer(raw);
    return {
      text: parsed.text,
      conversationId: conversationIdToUse,
      ticket: parsed.ticket || null,
      ticketReady: Boolean(parsed.ticket),
      raw
    };
  };

  try {
    return await sendChat(conversationId);
  } catch (err) {
    if (!/record not found|会话不存在/.test(err.message)) throw err;
    const created = await requestHiAgent(cfg, "create_conversation", {
      AppKey: cfg.appId,
      UserID: userId,
      Inputs: {}
    });
    let newConversationId = "";
    try {
      newConversationId =
        JSON.parse(created).Conversation.AppConversationID || "";
    } catch (err2) {
      newConversationId = "";
    }
    if (!newConversationId) {
      throw new Error("HiAgent 重建会话失败");
    }
    return sendChat(newConversationId);
  }
}

export async function processMessage(packaged, conversation) {
  const cfg = getRuntimeConfig();
  if (cfg.mode === "hiagent") {
    return callHiAgent(cfg, packaged, conversation);
  }
  return simulate(packaged, conversation);
}
