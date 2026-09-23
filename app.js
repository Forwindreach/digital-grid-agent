(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const STATIC_DEMO =
    location.protocol === "file:" ||
    location.hostname.endsWith("github.io") ||
    new URLSearchParams(location.search).has("demo");

  const ICONS = {
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-3M12 16V8M17 16V6"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><path d="M12 19v3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4M8 13h.01M16 13h.01M8 17h8"/>',
    layers: '<path d="m12 2 8.5 4.5L12 11 3.5 6.5 12 2Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 17.5 8.5 4.5 8.5-4.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'
  };

  const AGENTS = [
    { id: "asr", name: "语音 / 文本接入" },
    { id: "intent", name: "工作流 · 意图识别" },
    { id: "context", name: "居民上下文补全" },
    { id: "rag", name: "政策解答专家 · RAG" },
    { id: "ticket", name: "工单处理agent · 派单" },
    { id: "reply", name: "居民回复" },
    { id: "human", name: "网格员确认归档" }
  ];

  const RESIDENTS = [
    {
      id: "R-0001",
      name: "王秀英",
      avatar: "王",
      phone: "138****2351",
      addr: "华林花园 3 号楼 502",
      community: "温泉街道·华林社区",
      grid: "华林网格 03",
      tags: "高龄老人",
      lastVisit: "2026-08-18",
      ctx: { "历史诉求": "2 件", "常用渠道": "微信语音", "风险标签": "高龄独居", "最近诉求": "楼道灯报修（已闭环）" }
    },
    {
      id: "R-0002",
      name: "林建国",
      avatar: "林",
      phone: "139****7720",
      addr: "五四路 193 号 2 单元",
      community: "温泉街道·华林社区",
      grid: "华林网格 02",
      tags: "上班族",
      lastVisit: "2026-08-21",
      ctx: { "历史诉求": "1 件", "常用渠道": "微信群", "风险标签": "夜间噪音敏感", "最近诉求": "施工噪音（处理中）" }
    },
    {
      id: "R-0003",
      name: "陈丽华",
      avatar: "陈",
      phone: "136****8106",
      addr: "湖东路 123 号 2 号楼",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 01",
      tags: "业主代表",
      lastVisit: "2026-08-20",
      ctx: { "历史诉求": "3 件", "常用渠道": "小程序", "风险标签": "房屋安全关注", "最近诉求": "消防通道占用（已闭环）" }
    },
    {
      id: "R-0004",
      name: "郑敏",
      avatar: "郑",
      phone: "188****3312",
      addr: "观风亭街 56 号",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 02",
      tags: "小微企业主",
      lastVisit: "2026-08-19",
      ctx: { "历史诉求": "1 件", "常用渠道": "电话", "风险标签": "政策咨询", "最近诉求": "创业担保贷款（已闭环）" }
    },
    {
      id: "R-0005",
      name: "刘桂香",
      avatar: "刘",
      phone: "159****4903",
      addr: "金泉弄 8 号",
      community: "温泉街道·金泉社区",
      grid: "金泉网格 04",
      tags: "独居老人",
      lastVisit: "2026-08-22",
      ctx: { "历史诉求": "0 件", "常用渠道": "微信群", "风险标签": "需要关怀", "最近诉求": "无" }
    },
    {
      id: "R-0006",
      name: "黄志强",
      avatar: "黄",
      phone: "137****8846",
      addr: "华林花园 5 号楼 1201",
      community: "温泉街道·华林社区",
      grid: "华林网格 03",
      tags: "租户",
      lastVisit: "2026-08-15",
      ctx: { "历史诉求": "1 件", "常用渠道": "小程序", "风险标签": "房屋租赁", "最近诉求": "噪音投诉（已闭环）" }
    },
    {
      id: "R-0007",
      name: "周淑芬",
      avatar: "周",
      phone: "131****6621",
      addr: "观风亭街 18 号 3 单元",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 01",
      tags: "独居老人",
      lastVisit: "2026-08-23",
      ctx: { "历史诉求": "2 件", "常用渠道": "微信语音", "风险标签": "需上门关怀", "最近诉求": "助餐咨询（处理中）" }
    },
    {
      id: "R-0008",
      name: "吴建国",
      avatar: "吴",
      phone: "158****2094",
      addr: "金泉弄 21 号",
      community: "温泉街道·金泉社区",
      grid: "金泉网格 02",
      tags: "小微企业主",
      lastVisit: "2026-08-17",
      ctx: { "历史诉求": "1 件", "常用渠道": "电话", "风险标签": "政策咨询", "最近诉求": "房租减免（已闭环）" }
    },
    {
      id: "R-0009",
      name: "徐丽",
      avatar: "徐",
      phone: "135****5078",
      addr: "湖东路 88 号 1 号楼",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 03",
      tags: "宝妈",
      lastVisit: "2026-08-16",
      ctx: { "历史诉求": "0 件", "常用渠道": "微信群", "风险标签": "儿童家庭", "最近诉求": "无" }
    },
    {
      id: "R-0010",
      name: "何军",
      avatar: "何",
      phone: "186****9135",
      addr: "五四路 210 号 6 单元",
      community: "温泉街道·华林社区",
      grid: "华林网格 02",
      tags: "养犬登记",
      lastVisit: "2026-08-14",
      ctx: { "历史诉求": "1 件", "常用渠道": "小程序", "风险标签": "养犬管理", "最近诉求": "犬证办理（已闭环）" }
    },
    {
      id: "R-0011",
      name: "杨梅",
      avatar: "杨",
      phone: "180****3267",
      addr: "华林花园 8 号楼 301",
      community: "温泉街道·华林社区",
      grid: "华林网格 04",
      tags: "热心志愿者",
      lastVisit: "2026-08-21",
      ctx: { "历史诉求": "0 件", "常用渠道": "微信群", "风险标签": "志愿者骨干", "最近诉求": "无" }
    },
    {
      id: "R-0012",
      name: "陈伟",
      avatar: "陈",
      phone: "133****7582",
      addr: "观风亭街 33 号",
      community: "温泉街道·观风亭社区",
      grid: "观风亭网格 02",
      tags: "租户",
      lastVisit: "2026-08-12",
      ctx: { "历史诉求": "2 件", "常用渠道": "电话", "风险标签": "快递从业人员", "最近诉求": "停车问题（已闭环）" }
    }
  ];

  const RESIDENT_TOTAL = 1268;

  const SCENARIOS = [
    {
      resident: 0,
      channel: "微信群",
      voice: true,
      text: "楼下垃圾堆了好几天没人清，天气热味道很大，地址在华林花园3号楼门口，麻烦尽快处理。"
    },
    {
      resident: 1,
      channel: "微信群",
      voice: false,
      text: "五四路193号旁边的工地半夜还在施工，声音很大，吵得睡不着，请问这种情况怎么投诉？"
    },
    {
      resident: 2,
      channel: "小程序",
      voice: false,
      text: "湖东路123号2号楼顶楼有人私自加盖，担心有安全隐患，想请网格员上门看看。"
    },
    {
      resident: 3,
      channel: "电话",
      voice: false,
      text: "我想问下福州市对小微企业有房租减免政策吗？申请需要什么材料？"
    },
    {
      resident: 4,
      channel: "微信群",
      voice: true,
      text: "家里老人想申请社区助餐服务，需要什么条件，怎么办理？"
    }
  ];

  const CATEGORY_RULES = [
    { re: /违建|加盖|私自|规划|拆除/, category: "违建秩序类", dept: "鼓楼区城管中队", priority: "高" },
    { re: /噪音|噪声|吵|施工|装修|扰民/, category: "噪音扰民类", dept: "鼓楼区城管中队", priority: "高" },
    { re: /垃圾|卫生|堆放|清运|异味|保洁|环卫/, category: "环境卫生类", dept: "鼓楼区环卫中心", priority: "中" },
    { re: /养老|助餐|老人|日间照料|长者食堂|居家/, category: "政策咨询类", dept: "温泉街道社区服务中心", priority: "中" },
    { re: /物业|物业费|报修|楼道|公共设施|业主/, category: "政策咨询类", dept: "温泉街道社区服务中心", priority: "中" },
    { re: /政策|补贴|申请|材料|办理|咨询|减免|贷款|条件/, category: "政策咨询类", dept: "鼓楼区政务服务中心", priority: "中" },
    { re: /.+/, category: "其他诉求", dept: "温泉街道社区服务中心", priority: "中" }
  ];

  const DEFAULT_TICKETS = [
    { id: "GW-20260821-0301", resident: "林建国", category: "噪音扰民类", title: "五四路 193 号附近工地夜间施工噪音", dept: "鼓楼区城管中队", status: "待处理", sla: "24 小时", created: "08:42", priority: "高" },
    { id: "GW-20260821-0287", resident: "陈丽华", category: "违建秩序类", title: "湖东路 123 号 2 号楼顶楼疑似加盖", dept: "鼓楼区城管中队", status: "处理中", sla: "3 个工作日", created: "昨天", priority: "高" },
    { id: "GW-20260820-0256", resident: "王秀英", category: "环境卫生类", title: "华林花园 3 号楼门口垃圾积存", dept: "鼓楼区环卫中心", status: "待确认", sla: "24 小时", created: "昨天", priority: "中" },
    { id: "GW-20260820-0219", resident: "郑敏", category: "政策咨询类", title: "小微企业房租减免政策咨询", dept: "鼓楼区政务服务中心", status: "已归档", sla: "1 个工作日", created: "昨天", priority: "中" },
    { id: "GW-20260819-0198", resident: "刘桂香", category: "政策咨询类", title: "社区助餐服务申请指引", dept: "温泉街道社区服务中心", status: "已归档", sla: "1 个工作日", created: "前天", priority: "中" }
  ];

  const hiagent = window.HiAgentClient;

  const state = {
    view: "inbox",
    channel: "人工登记",
    scenario: 0,
    resident: 0,
    residentSearch: "",
    residentFilter: "全部网格",
    editingResidentId: null,
    importRows: [],
    running: false,
    pendingDraft: null,
    case: null,
    tickets: DEFAULT_TICKETS.map((t) => ({ ...t })),
    backendTicketIds: new Set(),
    adminToken: localStorage.getItem("adminToken") || "",
    currentWorker: null,
    workers: [],
    filterStatus: "全部",
    ticketSearch: "",
    kbSearch: "",
    archived: 2,
    logs: [],
    hiagentConfig: hiagent.load()
  };

  function icon(name, cls) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nowTime() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function genTicketId() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const seq = String(100 + Math.floor(Math.random() * 900));
    return `GW-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${seq}`;
  }

  function toast(msg, type) {
    const wrap = $("#toast-wrap");
    const el = document.createElement("div");
    el.className = `toast${type ? ` ${type}` : ""}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  function addLog(event, detail) {
    state.logs.unshift({ time: nowTime(), event, detail });
    state.logs = state.logs.slice(0, 80);
    renderLog();
  }

  function renderLog() {
    const box = $("#log-box");
    box.innerHTML = state.logs.map((l) => `
      <div class="log-line"><span class="t">${l.time}</span><span class="evt">${l.event}</span><span>${l.detail}</span></div>
    `).join("") || `<div class="log-line"><span class="t">--:--:--</span><span class="evt">就绪</span><span>等待受理新诉求</span></div>`;
    box.scrollTop = 0;
  }

  function classify(text) {
    for (const rule of CATEGORY_RULES) {
      if (rule.re.test(text)) return rule;
    }
    return { category: "其他", dept: "温泉街道社区服务中心", priority: "中" };
  }

  function extractAddress(text) {
    const m = text.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,14}(?:路|街|巷|弄|大道|小区|花园|新村|园|公寓)[^\s，。,.;；]{0,18}/);
    return m ? m[0] : "";
  }

  function tokenize(text) {
    return text.replace(/[，。？、；：,.?!;:]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
  }

  function retrieve(text) {
    const tokens = tokenize(text);
    const scored = (window.KNOWLEDGE_BASE || []).map((doc) => {
      const hay = `${doc.title} ${doc.summary} ${doc.content} ${doc.keywords.join(" ")} ${doc.questions.join(" ")}`;
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      for (const kw of doc.keywords) {
        if (text.includes(kw)) score += 1.6;
      }
      for (const q of doc.questions) {
        if (text.includes(q.slice(0, 6))) score += 1.2;
      }
      return { doc, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.filter((x) => x.score >= 2).slice(0, 2);
  }

  function buildReply(c) {
    if (c.isPolicy) {
      const hits = c.kbHits;
      const cite = hits.length
        ? hits.map((h) => `《${h.doc.title.replace(/（示例）$/, "")}》`).join("、")
        : "相关政策文件";
      const extra = c.needsTicket
        ? "如需进一步办理，请回复“办理”，我会为您登记办理指引。"
        : "如您需要进一步办理，可回复“办理”，我会继续为您服务。";
      return `您好，您咨询的事项已由“数字网格员”检索政策知识库并核实。根据${cite}，相关条件与材料已在上方列出，政策原文均标注了出处。${extra}`;
    }
    return `您好，我已收到您反映的问题：${c.text}。当前登记地址为：${c.address}。为准确生成工单，请您确认：是否按以上信息提交？如信息无误，请回复“确认提交”；如有补充或更正，可以直接告诉我。`;
  }

  function isConfirmReply(text) {
    return /确认提交|确认无误|没问题|可以提交|同意|是的|按这个|就这样/.test(text);
  }

  function isCancelReply(text) {
    return /取消|算了|不提交|先不/.test(text);
  }

  function renderClock() {
    $("#clock").textContent = nowTime();
  }

  function renderNav() {
    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === state.view);
    });
    $$(".view").forEach((v) => {
      v.classList.toggle("active", v.id === `view-${state.view}`);
    });
  }

  function renderAgentList() {
    $("#agent-mini-list").innerHTML = AGENTS.map((a) => `
      <li id="mini-${a.id}"><span class="dot"></span><span>${a.name}</span><span class="time">--</span></li>
    `).join("");
    $("#pipeline-list").innerHTML = AGENTS.map((a) => `
      <li id="pipe-${a.id}"><span class="dot"></span><span>${a.name}</span><span class="time">--</span></li>
    `).join("");
  }

  function renderResidentContext() {
    const r = RESIDENTS[state.resident];
    $("#resident-context").innerHTML = Object.entries(r.ctx).map(([k, v]) => `
      <div class="ctx-row"><span>${k}</span><strong>${v}</strong></div>
    `).join("");
  }

  function renderResident() {
    const r = RESIDENTS[state.resident];
    $("#resident-avatar").textContent = r.avatar;
    $("#resident-name").textContent = r.name;
    $("#resident-addr").textContent = r.addr;
    renderResidentContext();
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function renderStaticIcons() {
    $$("[data-icon]").forEach((el) => {
      const name = el.dataset.icon;
      if (name && ICONS[name] && !el.querySelector("svg")) {
        el.innerHTML = icon(name);
      }
    });
  }

  function renderResidentDirectory() {
    const q = state.residentSearch.trim().toLowerCase();
    const filter = state.residentFilter;
    const list = RESIDENTS.filter((r) => {
      const hay = `${r.id} ${r.name} ${r.phone} ${r.addr} ${r.community} ${r.grid} ${r.tags}`.toLowerCase();
      const matchQuery = !q || hay.includes(q);
      const matchFilter = filter === "全部网格" || r.community === filter;
      return matchQuery && matchFilter;
    });
    const activeId = RESIDENTS[state.resident] && RESIDENTS[state.resident].id;
    $("#resident-dir-count").textContent = `显示 ${list.length} / 在册 ${RESIDENT_TOTAL}`;
    $("#resident-dir-list").innerHTML = list.map((r) => `
      <div class="resident-dir-row ${r.id === activeId ? "active" : ""}">
        <button class="resident-dir-select" type="button" data-resident-id="${r.id}">
          <span class="avatar">${r.avatar}</span>
          <span class="resident-dir-main">
            <strong>${esc(r.name)}</strong>
            <span>${esc(r.addr)}</span>
            <span>${esc(r.community)} · ${esc(r.grid)}</span>
          </span>
          <span class="resident-dir-side">
            <span>${esc(r.phone)}</span>
            <span class="tag cat">${esc(r.tags)}</span>
          </span>
        </button>
        <button class="icon-button resident-dir-edit" type="button" data-edit-id="${r.id}" title="编辑档案或地址">
          <span class="btn-icon" data-icon="edit"></span>
        </button>
      </div>
    `).join("") || `<div class="resident-dir-empty">未找到匹配居民，可点击“新增登记”建档</div>`;
  }

  function openResidentModal() {
    $("#resident-modal").hidden = false;
    renderResidentDirectory();
    const input = $("#resident-search");
    input.value = state.residentSearch;
    input.focus();
  }

  function closeResidentModal() {
    $("#resident-modal").hidden = true;
  }

  function selectResidentById(id) {
    const index = RESIDENTS.findIndex((r) => r.id === id);
    if (index < 0) return;
    state.resident = index;
    renderResident();
    closeResidentModal();
    toast(`已切换到 ${RESIDENTS[index].name} 的居民档案`, "ok");
  }

  function openResidentForm(editId) {
    const edit = editId ? RESIDENTS.find((r) => r.id === editId) : null;
    state.editingResidentId = edit ? edit.id : null;
    $("#rf-name").value = edit ? edit.name : "";
    $("#rf-phone").value = edit ? edit.phone : "";
    $("#rf-community").value = edit ? edit.community : $("#rf-community").value;
    $("#rf-grid").value = edit ? edit.grid : "";
    $("#rf-addr").value = edit ? edit.addr : "";
    $("#rf-tags").value = edit ? edit.tags : "";
    $("#resident-form-title").textContent = edit ? "编辑居民档案" : "新增居民登记";
    $("#btn-save-resident").textContent = edit ? "保存修改" : "保存并选中";
    $("#resident-form-modal").hidden = false;
    $("#rf-name").focus();
  }

  function closeResidentForm() {
    $("#resident-form-modal").hidden = true;
    state.editingResidentId = null;
    ["rf-name", "rf-phone", "rf-addr", "rf-grid", "rf-tags"].forEach((id) => {
      $("#" + id).value = "";
    });
  }

  function saveResidentForm() {
    const name = $("#rf-name").value.trim();
    const phone = $("#rf-phone").value.trim();
    const addr = $("#rf-addr").value.trim();
    const community = $("#rf-community").value;
    const grid = $("#rf-grid").value.trim();
    const tags = $("#rf-tags").value.trim();
    if (!name || !addr) {
      toast("请至少填写姓名和楼栋房号", "warn");
      return;
    }

    if (state.editingResidentId) {
      const index = RESIDENTS.findIndex((r) => r.id === state.editingResidentId);
      if (index < 0) return;
      const prevAddr = RESIDENTS[index].addr;
      RESIDENTS[index] = {
        ...RESIDENTS[index],
        name,
        phone: phone || RESIDENTS[index].phone,
        addr,
        community,
        grid: grid || RESIDENTS[index].grid,
        tags: tags || RESIDENTS[index].tags,
        lastVisit: "2026-08-30"
      };
      state.resident = index;
      renderResident();
      closeResidentForm();
      closeResidentModal();
      toast(prevAddr !== addr ? `已更新 ${name} 的地址：${addr}` : `已更新 ${name} 的居民档案`, "ok");
      return;
    }

    const id = `R-${String(RESIDENTS.length + 1).padStart(4, "0")}`;
    RESIDENTS.push({
      id,
      name,
      avatar: name.slice(0, 1),
      phone: phone || "未登记",
      addr,
      community,
      grid: grid || "待分配网格",
      tags: tags || "普通居民",
      lastVisit: "2026-08-30",
      ctx: { "历史诉求": "0 件", "常用渠道": "待补充", "风险标签": "暂无", "最近诉求": "无" }
    });
    state.resident = RESIDENTS.length - 1;
    state.residentSearch = "";
    state.residentFilter = "全部网格";
    renderResident();
    closeResidentForm();
    closeResidentModal();
    toast(`已登记 ${name}，并切换到该居民档案`, "ok");
  }

  function openImportModal() {
    state.importRows = [];
    $("#resident-import-modal").hidden = false;
    $("#import-preview-count").textContent = "尚未选择文件";
    $("#import-preview").innerHTML = `<div class="resident-dir-empty">选择 .xlsx 或 .csv 文件后，将在这里显示导入预览</div>`;
    $("#btn-confirm-import").disabled = true;
  }

  function closeImportModal() {
    $("#resident-import-modal").hidden = true;
    $("#import-file").value = "";
    state.importRows = [];
  }

  function normalizePhone(value) {
    return String(value == null ? "" : value).replace(/\D/g, "");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const src = String(text).replace(/^\uFEFF/, "");
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      if (inQuotes) {
        if (ch === "\"") {
          if (src[i + 1] === "\"") {
            field += "\"";
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === "\"") {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch !== "\r") {
        field += ch;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
  }

  function importHeaderKey(value) {
    return String(value).replace(/[*\s]/g, "").replace(/[（）()]/g, "");
  }

  function parseImportFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let rows = [];
      if (/\.csv$/i.test(file.name)) {
        rows = parseCsv(reader.result);
      } else if (window.XLSX) {
        const workbook = window.XLSX.read(new Uint8Array(reader.result), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      } else {
        toast("未加载 Excel 解析组件", "error");
        return;
      }

      const headerIndex = rows.findIndex((r) => r.some((c) => String(c).includes("姓名") && String(c).includes("手机号")));
      const headerRow = headerIndex >= 0 ? rows[headerIndex] : rows[0];
      const keys = headerRow.map((h) => {
        const key = importHeaderKey(h);
        if (key.includes("登记类型")) return "type";
        if (key.includes("姓名")) return "name";
        if (key.includes("手机号")) return "phone";
        if (key.includes("所属社区")) return "community";
        if (key.includes("所属网格")) return "grid";
        if (key.includes("现居住地址")) return "addr";
        if (key.includes("原居住地址")) return "oldAddr";
        if (key.includes("人员标签")) return "tags";
        if (key.includes("备注")) return "note";
        return key;
      });

      const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 1);
      const parsed = [];
      for (const row of dataRows) {
        const item = {};
        keys.forEach((key, i) => {
          item[key] = row[i] == null ? "" : String(row[i]).trim();
        });
        if (!item.name && !item.phone && !item.addr) continue;
        const name = item.name || "";
        const phone = normalizePhone(item.phone);
        const addr = item.addr || "";
        if (!name || !addr) {
          item.valid = false;
          item.action = "跳过";
          item.reason = "缺少姓名或现居住地址";
        } else {
          const phoneIndex = phone ? RESIDENTS.findIndex((r) => normalizePhone(r.phone) === phone) : -1;
          const nameIndex = phoneIndex < 0 ? RESIDENTS.findIndex((r) => r.name === name) : -1;
          const index = phoneIndex >= 0 ? phoneIndex : nameIndex;
          item.valid = true;
          if (index >= 0) {
            const current = RESIDENTS[index];
            const changed = current.addr !== addr || current.community !== item.community || current.grid !== item.grid;
            if (!changed && item.type !== "地址变更") {
              item.action = "跳过";
              item.reason = "档案已存在且信息无变化";
            } else {
              item.action = "更新";
              item.reason = current.addr !== addr ? `地址变更：${current.addr} → ${addr}` : "更新居民档案";
            }
          } else {
            item.action = "新增";
            item.reason = "新建居民档案";
          }
        }
        parsed.push(item);
      }
      state.importRows = parsed;
      renderImportPreview();
    };
    if (/\.csv$/i.test(file.name)) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  function renderImportPreview() {
    const rows = state.importRows;
    const added = rows.filter((r) => r.action === "新增").length;
    const updated = rows.filter((r) => r.action === "更新").length;
    const skipped = rows.filter((r) => r.action === "跳过").length;
    $("#import-preview-count").textContent = `共 ${rows.length} 条：新增 ${added} · 更新 ${updated} · 跳过 ${skipped}`;
    $("#btn-confirm-import").disabled = added + updated === 0;
    $("#import-preview").innerHTML = rows.length
      ? `<table class="import-table"><thead><tr><th>姓名</th><th>手机号</th><th>现居住地址</th><th>结果</th><th>说明</th></tr></thead><tbody>${rows.map((r) => `
          <tr class="${r.valid ? "" : "invalid"}">
            <td>${esc(r.name)}</td>
            <td>${esc(r.phone)}</td>
            <td>${esc(r.addr)}</td>
            <td><span class="tag ${r.action === "新增" ? "cat" : r.action === "更新" ? "ok" : ""}">${r.action}</span></td>
            <td>${esc(r.reason || "")}</td>
          </tr>`).join("")}</tbody></table>`
      : `<div class="resident-dir-empty">未识别到有效数据行</div>`;
  }

  function confirmImport() {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const row of state.importRows) {
      if (!row.valid || row.action === "跳过") {
        if (row.valid) skipped += 1;
        continue;
      }
      const phone = normalizePhone(row.phone);
      let index = phone ? RESIDENTS.findIndex((r) => normalizePhone(r.phone) === phone) : -1;
      if (index < 0 && row.name) index = RESIDENTS.findIndex((r) => r.name === row.name);
      if (index >= 0) {
        const current = RESIDENTS[index];
        RESIDENTS[index] = {
          ...current,
          name: row.name || current.name,
          phone: phone || current.phone,
          addr: row.addr || current.addr,
          community: row.community || current.community,
          grid: row.grid || current.grid,
          tags: row.tags || current.tags,
          lastVisit: "2026-08-30"
        };
        updated += 1;
      } else {
        RESIDENTS.push({
          id: `R-${String(RESIDENTS.length + 1).padStart(4, "0")}`,
          name: row.name,
          avatar: row.name.slice(0, 1),
          phone: phone || "未登记",
          addr: row.addr,
          community: row.community || "温泉街道·华林社区",
          grid: row.grid || "待分配网格",
          tags: row.tags || "普通居民",
          lastVisit: "2026-08-30",
          ctx: { "历史诉求": "0 件", "常用渠道": "待补充", "风险标签": "暂无", "最近诉求": "无" }
        });
        added += 1;
      }
    }
    state.residentSearch = "";
    state.residentFilter = "全部网格";
    closeImportModal();
    renderResidentDirectory();
    toast(`导入完成：新增 ${added} 人，更新 ${updated} 人，跳过 ${skipped} 人`, "ok");
  }

  function renderScenario() {
    $$(".scenario-chip").forEach((chip, i) => {
      chip.classList.toggle("active", i === state.scenario);
    });
    const sc = SCENARIOS[state.scenario];
    $("#message-input").value = sc.text;
    $("#char-count").textContent = `${sc.text.length} / 500`;
    state.resident = sc.resident;
    state.channel = "人工登记";
    renderResident();
  }

  function renderCase() {
    const c = state.case;
    const title = $("#case-title");
    const idEl = $("#case-id");
    const body = $("#case-body");
    if (!c) {
      title.textContent = "等待受理";
      idEl.textContent = "GW-——";
      body.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">${icon("inbox")}</span>
          <strong>暂无进行中的诉求</strong>
          <span>提交一条诉求后，将在这里实时展示 Agent 处理链路</span>
        </div>`;
      return;
    }
    title.textContent = c.real ? "HiAgent 实时处理" : c.isPolicy ? "政策咨询处理" : "诉求闭环处理";
    idEl.textContent = c.ticketId;

    const conf = (Math.min(99.4, 90 + Math.random() * 8)).toFixed(1);
    const stages = [];
    const st = c.stage;
    const stCls = (id) => {
      if (st[id] === "done") return "done";
      if (st[id] === "active") return "active";
      return "pending";
    };
    const stIcon = (id) => {
      if (st[id] === "done") return "check";
      if (st[id] === "active") return "clock";
      return "bot";
    };

    stages.push({
      id: "asr",
      title: "语音 / 文本接入",
      body: c.voice
        ? `语音转写完成，置信度 ${conf}%。转写文本：${c.text}`
        : `文本诉求直接进入语义解析，无需语音转写。来源：${c.channel}`
    });
    stages.push({
      id: "intent",
      title: "工作流 · 意图识别与要素抽取",
      body: `<div class="case-source"><div class="avatar">${c.resident.avatar}</div><div><p>${c.text}</p><div class="meta"><span class="tag cat">${c.category}</span><span class="tag confidence">置信度 ${conf}%</span><span class="tag low">优先级 ${c.priority}</span><span class="tag">${c.address}</span></div><div class="meta"><span class="tag">条件分流</span><span class="tag">→ ${c.isPolicy ? "政策解答专家" : "工单处理agent"}</span></div></div></div>`
    });
    stages.push({
      id: "context",
      title: "居民上下文补全",
      body: `已关联 ${c.resident.name} 的历史诉求 2 件，无重复事项；常用渠道 ${c.resident.ctx["常用渠道"]}；标签：${c.resident.tags}`
    });
    if (c.isPolicy) {
      stages.push({
        id: "rag",
        title: "政策解答专家 · RAG 检索",
        body: c.kbHits.length
          ? `<div>已挂载「鼓楼区政务咨询库」，命中 ${c.kbHits.length} 个知识块，平均相似度 0.8${Math.floor(Math.random() * 9) + 1}。</div><div class="kb-chips">${c.kbHits.map((h) => `<span class="kb-chip"><strong>${(h.score * 10).toFixed(0)}%</strong>${h.doc.title}</span>`).join("")}</div>`
          : "未检索到直接匹配政策，已生成人工复核建议。"
      });
    } else {
      stages.push({
        id: "rag",
        title: "工单处理agent · 处置参考",
        body: "非政策咨询类诉求，检索同类处置案例与历史工单作为处置参考。"
      });
    }
    if (c.isPolicy && !c.needsTicket) {
      stages.push({
        id: "ticket",
        title: "咨询记录生成",
        body: "政策咨询类诉求，已生成咨询记录，无需派发处置工单。"
      });
    } else {
      stages.push({
        id: "ticket",
        title: "工单处理agent · 生成与派单",
        body: `<div class="detail-grid">
          <div class="detail-cell"><span>工单号</span><strong>${c.ticketId}</strong></div>
          <div class="detail-cell"><span>责任部门</span><strong>${c.dept}</strong></div>
          <div class="detail-cell"><span>响应时限</span><strong>${c.sla}</strong></div>
          <div class="detail-cell"><span>处置优先级</span><strong>${c.priority}</strong></div>
        </div><div class="reply-meta" style="margin-top:8px">代码聚合节点完成字段校验，HTTP 节点派发至责任部门</div>`
      });
    }
    stages.push({
      id: "reply",
      title: "居民回复",
      body: `<div class="reply-box"><p>${c.reply}</p><div class="reply-meta">已通过 ${c.channel} 渠道推送 · ${c.ticketId}</div></div>`
    });
    stages.push({
      id: "human",
      title: "网格员确认归档",
      body: c.confirmed
        ? `<div class="ticket-card"><div class="ticket-card-head"><span class="tag ok">已归档</span></div><p>${c.resident.name} 的诉求已确认处理完成，闭环记录已归档。</p><div class="meta"><span>归档时间 ${nowTime()}</span><span>满意度回访：待发起</span></div></div>`
        : `<div class="action-row"><button class="button ghost" type="button" data-action="review">转人工复核</button><button class="button primary" type="button" data-action="archive">确认归档</button></div>`
    });

    body.innerHTML = `
      <div class="stage-list">
        ${stages.map((s) => `
          <div class="stage ${stCls(s.id)}" data-stage="${s.id}">
            <div class="stage-head">
              <span class="stage-icon">${icon(stIcon(s.id))}</span>
              <span>${s.title}</span>
              <span class="stage-time">${st[s.id] === "done" ? c.stageTimes[s.id] : "--"}</span>
            </div>
            ${st[s.id] !== "pending" ? `<div class="stage-body">${s.body}</div>` : ""}
          </div>
        `).join("")}
      </div>`;
  }

  function renderPipeline() {
    const c = state.case;
    AGENTS.forEach((a) => {
      const st = c ? c.stage[a.id] : "pending";
      const li = $(`#pipe-${a.id}`);
      const mini = $(`#mini-${a.id}`);
      const cls = st === "done" ? "done" : st === "active" ? "active" : "";
      if (li) {
        li.className = cls;
        li.querySelector(".time").textContent = c && c.stageTimes[a.id] ? c.stageTimes[a.id] : "--";
      }
      if (mini) {
        mini.className = cls;
        mini.querySelector(".time").textContent = c && c.stageTimes[a.id] ? c.stageTimes[a.id] : "--";
      }
    });
    const running = c && Object.values(c.stage).some((s) => s === "active");
    $("#pipeline-state").textContent = running
      ? "处理中"
      : c && c.confirmed
        ? "已完成"
        : c && c.stage.human === "done"
          ? "待确认"
          : "就绪";
  }

  async function runRealPipeline(text) {
    state.running = true;
    $("#btn-submit").disabled = true;

    const cfg = hiagent.load();
    const sc = SCENARIOS[state.scenario];
    const resident = RESIDENTS[state.resident];
    const cls = classify(text);
    const isPolicy = cls.category === "政策咨询类";
    const ticketId = genTicketId();
    const caseObj = {
      id: ticketId,
      ticketId,
      text,
      resident,
      channel: state.channel,
      category: cls.category,
      dept: cls.dept,
      priority: cls.priority,
      address: extractAddress(text) || resident.addr,
      isPolicy,
      needsTicket: true,
      kbHits: [],
      sla: "由 HiAgent 返回",
      voice: sc.voice,
      real: true,
      confirmed: false,
      reviewed: false,
      stage: {
        asr: "pending",
        intent: "pending",
        context: "pending",
        rag: "pending",
        ticket: "pending",
        reply: "pending",
        human: "pending"
      },
      stageTimes: {}
    };
    caseObj.reply = "正在等待 HiAgent 真实回复…";
    state.case = caseObj;
    state.logs = [];
    addLog("HiAgent", `已提交应用 ${cfg.appId}，工作流 ${cfg.workflowId}`);
    renderCase();
    renderPipeline();

    const order = ["asr", "intent", "context", "rag", "ticket", "reply", "human"];
    const progress = setInterval(() => {
      const next = order.find((id) => caseObj.stage[id] === "pending");
      if (next) {
        caseObj.stage[next] = "active";
        caseObj.stageTimes[next] = nowTime();
        const name = (AGENTS.find((a) => a.id === next) || {}).name || next;
        addLog("HiAgent", `节点「${name}」处理中`);
        renderCase();
        renderPipeline();
      }
    }, 1500);

    try {
      const result = await hiagent.send(text, { timeoutMs: 120000 });
      clearInterval(progress);
      order.forEach((id) => {
        caseObj.stage[id] = "done";
        if (!caseObj.stageTimes[id]) caseObj.stageTimes[id] = nowTime();
      });
      if (result.ticket && typeof result.ticket === "object") {
        caseObj.ticketId = result.ticket.ticket_no || result.ticket.id || caseObj.ticketId;
        caseObj.dept = result.ticket.department || caseObj.dept;
        caseObj.sla = result.ticket.sla || caseObj.sla;
      }
      caseObj.reply = result.text || "HiAgent 已返回结果，请查看平台会话日志。";
      addLog("HiAgent", "真实接口返回成功");
      toast("HiAgent 真实接口调用成功", "ok");
    } catch (err) {
      clearInterval(progress);
      order.forEach((id) => {
        caseObj.stage[id] = "done";
        caseObj.stageTimes[id] = nowTime();
      });
      caseObj.reply = `HiAgent 调用失败：${err.message}。请检查接口地址、密钥与应用发布状态。`;
      addLog("HiAgent", "请求失败：" + err.message);
      toast("HiAgent 调用失败，已显示错误信息", "error");
    } finally {
      state.running = false;
      $("#btn-submit").disabled = false;
      renderCase();
      renderPipeline();
      renderRecent();
      renderTickets();
    }
  }

  async function runPipeline() {
    const input = $("#message-input");
    const text = input.value.trim();
    if (!text) {
      toast("请先输入居民诉求内容", "warn");
      return;
    }
    if (state.running) {
      toast("Agent 正在处理中", "warn");
      return;
    }
    const cfg = hiagent.load();
    if (cfg.mode === "real" && (cfg.apiEndpoint || cfg.endpoint)) {
      await runRealPipeline(text);
      return;
    }
    state.running = true;
    $("#btn-submit").disabled = true;

    const sc = SCENARIOS[state.scenario];
    const resident = RESIDENTS[state.resident];

    const finishInteraction = (caseObj, event, detail) => {
      state.case = caseObj;
      state.logs = [];
      if (event) addLog(event, detail);
      renderCase();
      renderPipeline();
      state.running = false;
      $("#btn-submit").disabled = false;
      renderRecent();
      renderTickets();
    };

    if (state.pendingDraft) {
      const draft = state.pendingDraft;
      const baseCase = {
        id: genTicketId(),
        ticketId: draft.ticketId || "待确认",
        text,
        resident,
        channel: state.channel,
        category: draft.category,
        dept: draft.dept,
        priority: draft.priority,
        address: draft.address || resident.addr,
        isPolicy: false,
        needsTicket: true,
        kbHits: [],
        sla: draft.sla,
        voice: sc.voice,
        confirmed: false,
        reviewed: false,
        stage: {
          asr: "done",
          intent: "done",
          context: "done",
          rag: "done",
          ticket: "done",
          reply: "done",
          human: "pending"
        },
        stageTimes: {}
      };

      if (isCancelReply(text)) {
        state.pendingDraft = null;
        baseCase.reply = "好的，已取消本次诉求登记。之后如有需要，您可以随时重新描述问题。";
        baseCase.stage.human = "done";
        finishInteraction(baseCase, "取消", "居民取消工单草稿确认");
        return;
      }

      if (isConfirmReply(text)) {
        const ticketId = genTicketId();
        state.pendingDraft = null;
        baseCase.ticketId = ticketId;
        baseCase.reply = `好的，已按您确认的信息生成工单（${ticketId}），转交${draft.dept}处置，预计${draft.sla}内响应。后续处理进度会同步给您。`;
        state.tickets.unshift({
          id: ticketId,
          resident: resident.name,
          category: draft.category,
          title: `${(draft.description || text).slice(0, 28)}${(draft.description || text).length > 28 ? "…" : ""}`,
          dept: draft.dept,
          status: "已受理",
          sla: draft.sla,
          created: "今天",
          priority: draft.priority
        });
        finishInteraction(baseCase, "确认", `居民确认工单草稿，${ticketId} 已生成`);
        return;
      }

      const updated = {
        ...draft,
        title: text.length >= 5 ? text.slice(0, 50) : draft.title,
        description: `${draft.description}\n居民补充：${text}`
      };
      state.pendingDraft = updated;
      baseCase.ticketId = "待确认";
      baseCase.reply = `已收到您的补充：${text}。请确认是否按更新后的信息提交？如信息无误，请回复“确认提交”。`;
      finishInteraction(baseCase, "补充", "居民补充工单信息");
      return;
    }

    const cls = classify(text);
    const isPolicy = cls.category === "政策咨询类";
    const needsTicket = isPolicy && /申请|办理|材料|条件|流程|窗口|需要什么/.test(text);
    const caseObj = {
      id: genTicketId(),
      ticketId: isPolicy ? genTicketId() : "待确认",
      text,
      resident,
      channel: state.channel,
      category: cls.category,
      dept: cls.dept,
      priority: cls.priority,
      address: extractAddress(text) || resident.addr,
      isPolicy,
      needsTicket,
      kbHits: isPolicy ? retrieve(text) : [],
      sla: isPolicy ? "1 个工作日" : cls.priority === "高" ? "24 小时" : "3 个工作日",
      voice: sc.voice,
      confirmed: false,
      reviewed: false,
      stage: {
        asr: "pending",
        intent: "pending",
        context: "pending",
        rag: "pending",
        ticket: "pending",
        reply: "pending",
        human: "pending"
      },
      stageTimes: {}
    };
    if (!isPolicy) {
      const draft = {
        category: cls.category,
        dept: cls.dept,
        priority: cls.priority,
        address: caseObj.address,
        sla: caseObj.sla,
        description: text,
        ticketId: "待确认"
      };
      state.pendingDraft = draft;
      caseObj.stage.human = "done";
      caseObj.reply = `您好，我已收到您反映的问题：${text}。当前登记地址为：${caseObj.address}。为准确生成工单，请您确认：是否按以上信息提交？如信息无误，请回复“确认提交”；如有补充或更正，可以直接告诉我。`;
    } else {
      caseObj.reply = buildReply(caseObj);
    }
    state.case = caseObj;
    state.logs = [];
    addLog("受理", `${resident.name} 通过 ${state.channel} 提交诉求`);
    renderCase();
    renderPipeline();

    const steps = [
      { id: "asr", ms: 620, evt: "语音 / 文本接入", detail: sc.voice ? "完成转写" : "文本直达" },
      { id: "intent", ms: 720, evt: "工作流 · 意图识别", detail: `分类为「${cls.category}」，完成条件分流` },
      { id: "context", ms: 560, evt: "居民上下文补全", detail: `关联 ${resident.name} 历史记录` },
      { id: "rag", ms: 820, evt: isPolicy ? "政策解答专家" : "工单处理agent", detail: isPolicy ? `鼓楼区政务咨询库命中 ${caseObj.kbHits.length} 个知识块` : "检索同类处置案例" },
      { id: "ticket", ms: 700, evt: isPolicy ? "工单处理agent · 派单" : "工单处理agent · 生成草稿", detail: isPolicy ? `${caseObj.ticketId} 已派发至 ${cls.dept}` : "已生成工单草稿，等待居民确认" },
      { id: "reply", ms: 620, evt: "居民回复", detail: "回复已生成并推送" },
      ...(isPolicy ? [{ id: "human", ms: 480, evt: "网格员确认", detail: "等待网格员确认归档" }] : [])
    ];

    for (const step of steps) {
      caseObj.stage[step.id] = "active";
      caseObj.stageTimes[step.id] = nowTime();
      addLog(step.evt, step.detail);
      renderCase();
      renderPipeline();
      await sleep(step.ms);
      caseObj.stage[step.id] = "done";
      renderCase();
      renderPipeline();
      await sleep(180);
    }

    state.running = false;
    $("#btn-submit").disabled = false;
    addLog(isPolicy ? "闭环" : "确认", isPolicy ? "Agent 处理完成，待人工确认归档" : "工单草稿已生成，等待居民确认");
    toast(isPolicy ? "Agent 处理完成，等待网格员确认" : "工单草稿已生成，请居民确认", "ok");

    const today = $("#today-count");
    const n = 3 + (state.tickets.length - DEFAULT_TICKETS.length);
    today.textContent = `${n} 件`;
    renderRecent();
    renderTickets();
  }

  function handleCaseAction(action) {
    const c = state.case;
    if (!c || c.confirmed) return;
    if (action === "archive") {
      c.confirmed = true;
      c.stage.human = "done";
      c.stageTimes.human = nowTime();
      state.archived += 1;
      const status = c.isPolicy && !c.needsTicket ? "已归档" : "待确认";
      state.tickets.unshift({
        id: c.ticketId,
        resident: c.resident.name,
        category: c.category,
        title: c.text.slice(0, 28) + (c.text.length > 28 ? "…" : ""),
        dept: c.dept,
        status,
        sla: c.sla,
        created: "今天",
        priority: c.priority
      });
      addLog("归档", `${c.ticketId} 已确认归档`);
      toast("已确认归档，闭环完成", "ok");
    } else {
      c.reviewed = true;
      addLog("复核", `${c.ticketId} 已转人工复核队列`);
      toast("已转入人工复核队列", "warn");
    }
    renderCase();
    renderPipeline();
    renderTickets();
    renderRecent();
    renderDashboard();
  }

  function renderRecent() {
    const items = state.tickets.slice(0, 3);
    $("#recent-list").innerHTML = items.map((t) => `
      <div class="recent-item">
        <span class="avatar">${t.resident.slice(0, 1)}</span>
        <div class="recent-main"><strong>${t.title}</strong><span>${t.category} · ${t.dept} · ${t.created}</span></div>
        <span class="status-pill ${t.status === "已归档" ? "ok" : t.status === "待确认" ? "warn" : "info"}">${t.status}</span>
      </div>
    `).join("");
    $("#inbox-badge").textContent = state.tickets.filter((t) => t.status !== "已归档").length;
    $("#ticket-badge").textContent = state.tickets.length;
  }

  function renderTickets() {
    const q = state.ticketSearch.trim();
    const rows = state.tickets.filter((t) => {
      const okStatus = state.filterStatus === "全部" || t.status === state.filterStatus;
      const okSearch = !q || `${t.id} ${t.resident} ${t.category} ${t.title} ${t.dept}`.includes(q);
      return okStatus && okSearch;
    });
    $("#ticket-table-body").innerHTML = rows.map((t) => `
      <tr data-id="${t.id}">
        <td class="tno">${t.id}</td>
        <td>${t.resident}</td>
        <td><span class="tag cat">${t.category}</span></td>
        <td>${t.title}</td>
        <td>${t.dept}</td>
        <td>${t.workerName || "待分派"}</td>
        <td>${t.sla}</td>
        <td><span class="status-pill ${t.status === "已归档" ? "ok" : t.status === "待确认" ? "warn" : ["处理中", "已派单", "已受理"].includes(t.status) ? "info" : "danger"}">${t.status}</span></td>
      </tr>
    `).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--text-3)">暂无匹配工单</td></tr>`;
  }

  function backendCreatedText(value) {
    if (!value) return "今天";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "今天";
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) return "今天";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function backendTimeText(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
  }

  function backendWorkOrderToTicket(workOrder) {
    return {
      id: workOrder.ticketNo,
      backendId: workOrder.id,
      resident: workOrder.residentName || "小程序居民",
      residentAddress: workOrder.residentAddress || "",
      residentPhone: workOrder.residentPhone || "",
      incidentAddress: workOrder.incidentAddress || "",
      category: workOrder.category,
      title: workOrder.title || workOrder.description || "小程序工单",
      dept: workOrder.department,
      workerName: workOrder.assignedWorkerName || "",
      assignedWorkerId: workOrder.assignedWorkerId || "",
      grid: workOrder.grid || "",
      community: workOrder.community || "",
      happenTime: workOrder.happenTime || "",
      duration: workOrder.duration || "",
      frequency: workOrder.frequency || "",
      previouslyReported: workOrder.previouslyReported || "",
      communicationStatus: workOrder.communicationStatus || "",
      sla: workOrder.sla,
      created: backendCreatedText(workOrder.createdAt),
      priority: workOrder.priority,
      status: workOrder.status,
      timeline: workOrder.timeline || [],
      handlingStartedAt: workOrder.handlingStartedAt || "",
      handlingResult: workOrder.handlingResult || "",
      residentFeedback: workOrder.residentFeedback || "",
      handledByName: workOrder.handledByName || "",
      resolvedAt: workOrder.resolvedAt || "",
      archivedByName: workOrder.archivedByName || "",
      archivedAt: workOrder.archivedAt || ""
    };
  }

  let autoRefreshTimer = null;

  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
      if (state.adminToken && state.currentWorker) {
        loadBackendWorkOrders();
      }
    }, 5000);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  function adminHeaders() {
    return {
      "Content-Type": "application/json",
      ...(state.adminToken ? { Authorization: `Bearer ${state.adminToken}` } : {})
    };
  }

  function showLoginMask() {
    $("#admin-login-mask").hidden = false;
    $("#btn-admin-logout").hidden = true;
  }

  function showAdminApp() {
    $("#admin-login-mask").hidden = true;
    $("#btn-admin-logout").hidden = STATIC_DEMO;
    const worker = state.currentWorker;
    const label = worker
      ? `${worker.name} · ${worker.role === "admin" ? "系统管理员" : worker.role === "community_admin" ? "社区负责人" : "网格员"}`
      : "";
    $("#conn-status").textContent = label || "Agent 在线";
  }

  async function loadAdminSession() {
    if (STATIC_DEMO) {
      state.adminToken = "static-demo";
      state.currentWorker = { name: "在线演示", role: "admin" };
      showAdminApp();
      return;
    }
    try {
      if (!state.adminToken) throw new Error("未登录");
      const response = await fetch("/api/admin/auth/me", {
        headers: adminHeaders()
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }
      state.currentWorker = payload.worker;
      showAdminApp();
      state.tickets = [];
      state.backendTicketIds = new Set();
      await Promise.all([loadBackendWorkOrders(), loadGridWorkers()]);
      startAutoRefresh();
    } catch (err) {
      showLoginMask();
    }
  }

  async function adminLogin() {
    const account = $("#admin-account").value.trim();
    const password = $("#admin-password").value;
    $("#admin-login-msg").textContent = "";
    if (!account || !password) {
      $("#admin-login-msg").textContent = "请输入账号和密码";
      return;
    }
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }
      state.adminToken = payload.token;
      localStorage.setItem("adminToken", payload.token);
      state.currentWorker = payload.worker;
      state.tickets = [];
      state.backendTicketIds = new Set();
      showAdminApp();
      await Promise.all([loadBackendWorkOrders(), loadGridWorkers()]);
      startAutoRefresh();
    } catch (err) {
      $("#admin-login-msg").textContent = err.message || "登录失败";
    }
  }

  async function adminLogout() {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: adminHeaders()
      });
    } catch (err) {
      // 本地退出仍需继续
    }
    state.adminToken = "";
    state.currentWorker = null;
    state.workers = [];
    state.tickets = [];
    state.backendTicketIds = new Set();
    localStorage.removeItem("adminToken");
    stopAutoRefresh();
    renderTickets();
    renderRecent();
    showLoginMask();
  }

  async function loadGridWorkers() {
    try {
      const response = await fetch("/api/admin/grid-workers", {
        headers: adminHeaders()
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }
      state.workers = payload.workers || [];
    } catch (err) {
      state.workers = [];
    }
  }

  async function loadBackendWorkOrders() {
    try {
      if (!state.adminToken) return;
      const response = await fetch("/api/admin/work-orders", {
        headers: adminHeaders()
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }
      const backendTickets = (payload.workOrders || [])
        .map((workOrder) => {
          state.backendTicketIds.add(workOrder.id);
          return backendWorkOrderToTicket(workOrder);
        });
      state.tickets = backendTickets;
      renderTickets();
      renderRecent();
    } catch (err) {
      console.warn("后端工单加载失败：", err.message);
      if (err.message.includes("登录")) {
        showLoginMask();
      }
    }
  }

  function renderTicketDetail(id) {
    const t = state.tickets.find((x) => x.id === id);
    const wrap = $("#ticket-detail");
    if (!t) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    const canAssign =
      state.currentWorker &&
      ["admin", "community_admin", "street_admin"].includes(state.currentWorker.role);
    const isAssignedWorker =
      state.currentWorker &&
      state.currentWorker.role === "grid_worker" &&
      t.backendId &&
      t.assignedWorkerId === state.currentWorker.id;
    const canStart =
      isAssignedWorker && ["已派单", "待处理", "已受理"].includes(t.status);
    const canResolve = isAssignedWorker && t.status === "处理中";
    const canArchive = isAssignedWorker && t.status === "待确认";
    const workerOptions = state.workers
      .filter(
        (w) =>
          w.role === "grid_worker" &&
          (!state.currentWorker.community ||
            state.currentWorker.role !== "community_admin" ||
            w.community === state.currentWorker.community)
      )
      .map(
        (w) =>
          `<option value="${w.id}" ${w.id === t.assignedWorkerId ? "selected" : ""}>${w.name} · ${w.grid || w.community || "未绑定网格"}</option>`
      )
      .join("");
    const timeline =
      t.backendId && Array.isArray(t.timeline) && t.timeline.length
        ? t.timeline.map((item) => ({
            text: item.note || item.status || "工单状态已更新",
            time: backendTimeText(item.time) || item.status || ""
          }))
        : [
            { text: `${t.resident} 通过线上渠道提交诉求`, time: t.created === "今天" ? "今天 08:42" : `${t.created} 10:20` },
            { text: "数字网格员完成识别、补全与派单", time: "受理后 4.2 分钟" },
            { text: `${t.dept} 接收工单`, time: t.status === "待处理" ? "等待接收" : "已接收" },
            { text: t.status === "已归档" ? "网格员确认归档" : "处置与反馈", time: t.status === "已归档" ? "闭环" : "进行中" }
          ];
    let workerAction = "";
    if (canStart) {
      workerAction = `
        <div class="worker-action-box">
          <div>
            <strong>收到工单</strong>
            <p>确认已收到该工单后开始处置，系统会将状态更新为“处理中”。</p>
          </div>
          <button class="button primary" id="btn-start-ticket" type="button">接收并开始处理</button>
        </div>`;
    } else if (canResolve) {
      workerAction = `
        <div class="worker-action-box worker-action-form">
          <div class="worker-action-title">
            <div>
              <strong>提交处置结果</strong>
              <p>填写实际处置情况并向居民反馈，提交后工单进入“待确认”。</p>
            </div>
          </div>
          <label class="worker-field">
            <span>处置结果 <em>必填</em></span>
            <textarea id="ticket-handling-result" maxlength="2000" placeholder="例如：已联系物业清理垃圾，现场已恢复正常"></textarea>
          </label>
          <label class="worker-field">
            <span>居民反馈</span>
            <textarea id="ticket-resident-feedback" maxlength="1000" placeholder="例如：已电话告知居民处理结果，居民表示认可"></textarea>
          </label>
          <div class="worker-action-buttons">
            <button class="button primary" id="btn-resolve-ticket" type="button">提交处置结果</button>
          </div>
        </div>`;
    } else if (canArchive) {
      workerAction = `
        <div class="worker-action-box worker-action-confirm">
          <div>
            <strong>处置结果待确认</strong>
            <p>${esc(t.handlingResult || "已完成处置，等待网格员确认归档。")}</p>
            ${t.residentFeedback ? `<p class="worker-feedback">居民反馈：${esc(t.residentFeedback)}</p>` : ""}
          </div>
          <button class="button primary" id="btn-archive-ticket" type="button">确认归档</button>
        </div>`;
    } else if (t.backendId && t.status === "已归档") {
      workerAction = `
        <div class="worker-action-box worker-action-done">
          <div>
            <strong>工单已归档</strong>
            <p>${esc(t.handlingResult || "该工单已完成处置并归档。")}</p>
            <span>归档人：${esc(t.archivedByName || t.workerName || "责任网格员")} · ${esc(backendTimeText(t.archivedAt) || "已闭环")}</span>
          </div>
        </div>`;
    }
    wrap.innerHTML = `
      <div class="ticket-detail-head">
        <h3>${esc(t.title)}</h3>
        <span class="status-pill ${t.status === "已归档" ? "ok" : t.status === "待确认" ? "warn" : ["处理中", "已派单", "已受理"].includes(t.status) ? "info" : "danger"}">${esc(t.status)}</span>
      </div>
      <div class="detail-grid">
        <div class="detail-cell"><span>工单号</span><strong>${t.id}</strong></div>
        <div class="detail-cell"><span>居民</span><strong>${t.resident}</strong></div>
        <div class="detail-cell"><span>联系电话</span><strong>${t.residentPhone || "未登记"}</strong></div>
        <div class="detail-cell"><span>登记住址</span><strong>${t.residentAddress || "未登记"}</strong></div>
        <div class="detail-cell"><span>事发地址</span><strong>${t.incidentAddress || "未登记"}</strong></div>
        <div class="detail-cell"><span>责任部门</span><strong>${t.dept}</strong></div>
        <div class="detail-cell"><span>响应时限</span><strong>${t.sla}</strong></div>
        <div class="detail-cell"><span>所属社区</span><strong>${t.community || "未登记"}</strong></div>
        <div class="detail-cell"><span>所属网格</span><strong>${t.grid || "未登记"}</strong></div>
        <div class="detail-cell"><span>发生时间</span><strong>${t.happenTime || "待补充"}</strong></div>
        <div class="detail-cell"><span>持续时长</span><strong>${t.duration || "待补充"}</strong></div>
        <div class="detail-cell"><span>发生频率</span><strong>${t.frequency || "待补充"}</strong></div>
        <div class="detail-cell"><span>是否已反映</span><strong>${t.previouslyReported || "待补充"}</strong></div>
        <div class="detail-cell"><span>沟通情况</span><strong>${t.communicationStatus || "待补充"}</strong></div>
        <div class="detail-cell"><span>责任网格员</span><strong>${t.workerName || "待分派"}</strong></div>
      </div>
      ${
        canAssign
          ? `<div class="assign-box">
              <select id="ticket-worker-select">
                <option value="">请选择网格员</option>
                ${workerOptions}
              </select>
              <button class="button primary" id="btn-assign-ticket" type="button" ${t.assignedWorkerId ? "" : ""}>派单</button>
            </div>`
          : ""
      }
      ${workerAction}
      <div class="timeline">
        ${timeline.map((it, i) => `<div class="timeline-item"><span class="timeline-dot ${i === timeline.length - 1 && t.status !== "已归档" ? "gray" : ""}"></span><div class="timeline-content"><strong>${esc(it.text)}</strong><span>${esc(it.time)}</span></div></div>`).join("")}
      </div>`;
    const assignBtn = $("#btn-assign-ticket");
    if (assignBtn) {
      assignBtn.addEventListener("click", () => {
        const workerId = $("#ticket-worker-select").value;
        if (!workerId) {
          toast("请选择网格员", "warn");
          return;
        }
        assignBackendTicket(t.backendId, workerId);
      });
    }
    const startBtn = $("#btn-start-ticket");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        runWorkOrderAction(t.backendId, "start", {});
      });
    }
    const resolveBtn = $("#btn-resolve-ticket");
    if (resolveBtn) {
      resolveBtn.addEventListener("click", () => {
        const handlingResult = $("#ticket-handling-result").value.trim();
        const residentFeedback = $("#ticket-resident-feedback").value.trim();
        if (!handlingResult) {
          toast("请填写处置结果", "warn");
          $("#ticket-handling-result").focus();
          return;
        }
        runWorkOrderAction(t.backendId, "resolve", {
          handlingResult,
          residentFeedback
        });
      });
    }
    const archiveBtn = $("#btn-archive-ticket");
    if (archiveBtn) {
      archiveBtn.addEventListener("click", () => {
        if (!window.confirm("确认该工单已经处置完成并归档吗？")) return;
        runWorkOrderAction(t.backendId, "archive", {});
      });
    }
  }

  function updateTicketFromBackend(workOrder) {
    const updatedTicket = backendWorkOrderToTicket(workOrder);
    const index = state.tickets.findIndex(
      (ticket) => ticket.backendId === workOrder.id
    );
    if (index === -1) {
      state.tickets.unshift(updatedTicket);
    } else {
      state.tickets[index] = updatedTicket;
    }
    renderTickets();
    renderRecent();
    renderDashboard();
    renderTicketDetail(updatedTicket.id);
  }

  async function runWorkOrderAction(backendId, action, payload) {
    const button = $(`#btn-${action}-ticket`);
    if (button) {
      button.disabled = true;
      button.textContent =
        action === "start"
          ? "正在接收"
          : action === "resolve"
            ? "正在提交"
            : "正在归档";
    }
    try {
      const response = await fetch(
        `/api/admin/work-orders/${backendId}/${action}`,
        {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify(payload || {})
        }
      );
      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.ok === false) {
        throw new Error((result && result.message) || `HTTP ${response.status}`);
      }
      updateTicketFromBackend(result.workOrder);
      const message =
        action === "start"
          ? "已接收工单，开始处理"
          : action === "resolve"
            ? "处置结果已提交，等待确认归档"
            : "工单已确认归档";
      toast(message, "ok");
      addLog(
        action === "start" ? "开始处理" : action === "resolve" ? "提交处置" : "确认归档",
        `${result.workOrder.ticketNo} 已更新为${result.workOrder.status}`
      );
    } catch (err) {
      toast(err.message || "工单操作失败", "error");
      if (button) {
        button.disabled = false;
        button.textContent =
          action === "start"
            ? "接收并开始处理"
            : action === "resolve"
              ? "提交处置结果"
              : "确认归档";
      }
    }
  }

  async function assignBackendTicket(backendId, workerId) {
    try {
      const response = await fetch(`/api/admin/work-orders/${backendId}/assign`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ workerId })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && payload.message) || `HTTP ${response.status}`);
      }
      const workOrder = payload.workOrder;
      state.tickets = state.tickets.map((t) =>
        t.backendId === workOrder.id
          ? {
              ...t,
              workerName: workOrder.assignedWorkerName || "",
              assignedWorkerId: workOrder.assignedWorkerId || "",
              status: workOrder.status
            }
          : t
      );
      renderTickets();
      renderRecent();
      renderTicketDetail(state.tickets.find((t) => t.backendId === workOrder.id).id);
      toast("派单成功", "ok");
    } catch (err) {
      toast(err.message || "派单失败", "error");
    }
  }

  function renderKB() {
    const q = state.kbSearch.trim();
    const docs = (window.KNOWLEDGE_BASE || []).filter((d) => {
      if (!q) return true;
      return `${d.title} ${d.summary} ${d.content} ${d.keywords.join(" ")} ${d.questions.join(" ")}`.includes(q);
    });
    $("#kb-doc-count").textContent = docs.length;
    $("#kb-cat-count").textContent = new Set((window.KNOWLEDGE_BASE || []).map((d) => d.category)).size;
    $("#kb-list").innerHTML = docs.map((d) => `
      <article class="kb-card" data-kb="${d.id}">
        <div class="kb-card-head"><strong>${d.title}</strong><span class="tag cat">${d.category}</span></div>
        <p>${d.summary}</p>
        <div class="kb-meta"><span>${d.source}</span><span>更新 ${d.updateDate}</span><span>${d.keywords.slice(0, 3).join(" / ")}</span></div>
      </article>
    `).join("") || `<div class="panel" style="padding:20px;color:var(--text-3)">未检索到匹配文档</div>`;
  }

  function renderKBDetail(id) {
    const d = (window.KNOWLEDGE_BASE || []).find((x) => x.id === id);
    const wrap = $("#kb-detail");
    if (!d) return;
    $$(".kb-card").forEach((card) => card.classList.toggle("active", card.dataset.kb === id));
    wrap.innerHTML = `
      <h3 class="kb-detail-title">${d.title}</h3>
      <div class="kb-detail-source"><span>${d.source}</span><span>${d.docNo}</span><span>更新 ${d.updateDate}</span></div>
      <div class="kb-detail-content">${d.content}</div>
      ${d.url ? `<div class="kb-detail-source"><a href="${d.url}" target="_blank" rel="noopener">查看官方原文</a></div>` : ""}
      <h4>高频问题</h4>
      <ul class="kb-detail-content" style="padding-left:20px;margin:0">${d.questions.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  }

  function renderDashboard() {
    const cats = [
      { name: "环境卫生类", value: 86, color: "c1" },
      { name: "噪音扰民类", value: 72, color: "c2" },
      { name: "政策咨询类", value: 58, color: "c3" },
      { name: "其他诉求", value: 47, color: "c4" },
      { name: "违建秩序类", value: 34, color: "c5" }
    ];
    const max = Math.max(...cats.map((c) => c.value));
    $("#category-chart").innerHTML = cats.map((c) => `
      <div class="bar-row">
        <span class="bar-label">${c.name}</span>
        <span class="bar-track"><span class="bar-fill ${c.color}" style="width:${(c.value / max) * 100}%"></span></span>
        <span class="bar-value">${c.value}</span>
      </div>
    `).join("");

    const depts = [
      { name: "鼓楼区环卫中心", load: 68 },
      { name: "鼓楼区城管中队", load: 82 },
      { name: "社区服务中心", load: 55 },
      { name: "政务服务中心", load: 41 }
    ];
    $("#dept-load").innerHTML = depts.map((d) => `
      <div class="dept-row">
        <div class="dept-head"><strong>${d.name}</strong><span>${d.load}%</span></div>
        <div class="progress"><span style="width:${d.load}%"></span></div>
      </div>
    `).join("");

    const timings = [
      { name: "语音 / 文本接入", ms: 0.9 },
      { name: "工作流 · 意图识别", ms: 1.2 },
      { name: "居民上下文补全", ms: 0.8 },
      { name: "政策解答专家 · RAG", ms: 1.6 },
      { name: "工单处理agent · 派单", ms: 0.7 },
      { name: "居民回复", ms: 0.6 }
    ];
    const maxMs = Math.max(...timings.map((t) => t.ms));
    $("#node-timing").innerHTML = timings.map((t) => `
      <div class="node-row">
        <div class="node-head"><span>${t.name}</span><span>${t.ms.toFixed(1)} s</span></div>
        <div class="progress"><span style="width:${(t.ms / maxMs) * 100}%;background:var(--teal)"></span></div>
      </div>
    `).join("");

    $("#kpi-auto").innerHTML = `${(86.4 + state.archived * 0.2).toFixed(1)}<small>%</small>`;
  }

  function renderSettings() {
    $("#agent-toggles").innerHTML = AGENTS.map((a) => `
      <div class="toggle-row"><span>${a.name}</span><button class="switch on" type="button" data-agent="${a.id}" aria-label="${a.name}"></button></div>
    `).join("");
    const reviewCats = ["违建秩序类", "紧急救助", "敏感投诉", "重复投诉"];
    $("#review-categories").innerHTML = reviewCats.map((c) => `
      <label class="check-row"><input type="checkbox" checked><span>${c}需人工复核</span></label>
    `).join("");
    const cfg = hiagent.load();
    $("#cfg-mode").value = cfg.mode;
    $("#cfg-endpoint").value = cfg.endpoint;
    $("#cfg-api-endpoint").value = cfg.apiEndpoint;
    $("#cfg-app-id").value = cfg.appId;
    $("#cfg-workflow-id").value = cfg.workflowId;
    $("#cfg-api-key").value = cfg.apiKey;
  }

  function showView(view) {
    state.view = view;
    renderNav();
    if (view === "tickets") renderTickets();
    if (view === "knowledge") renderKB();
    if (view === "dashboard") renderDashboard();
  }

  function bindEvents() {
    $("#btn-admin-login").addEventListener("click", adminLogin);
    $("#btn-admin-logout").addEventListener("click", adminLogout);
    $("#admin-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") adminLogin();
    });

    $$(".nav-item").forEach((btn) => btn.addEventListener("click", () => showView(btn.dataset.view)));

    $$(".scenario-chip").forEach((chip) => chip.addEventListener("click", () => {
      state.scenario = Number(chip.dataset.scenario);
      renderScenario();
    }));

    $("#btn-resident").addEventListener("click", openResidentModal);

    $("#btn-close-resident").addEventListener("click", closeResidentModal);
    $("#resident-modal").addEventListener("click", (e) => {
      if (e.target === $("#resident-modal")) closeResidentModal();
    });
    $("#resident-search").addEventListener("input", (e) => {
      state.residentSearch = e.target.value;
      renderResidentDirectory();
    });
    $("#resident-filter").addEventListener("change", (e) => {
      state.residentFilter = e.target.value;
      renderResidentDirectory();
    });
    $("#resident-dir-list").addEventListener("click", (e) => {
      const editBtn = e.target.closest("[data-edit-id]");
      if (editBtn) {
        openResidentForm(editBtn.dataset.editId);
        return;
      }
      const row = e.target.closest("[data-resident-id]");
      if (row) selectResidentById(row.dataset.residentId);
    });

    $("#btn-add-resident").addEventListener("click", openResidentForm);
    $("#btn-cancel-resident").addEventListener("click", closeResidentForm);
    $("#btn-close-resident-form").addEventListener("click", closeResidentForm);
    $("#resident-form-modal").addEventListener("click", (e) => {
      if (e.target === $("#resident-form-modal")) closeResidentForm();
    });
    $("#btn-save-resident").addEventListener("click", saveResidentForm);

    $("#btn-import-resident").addEventListener("click", openImportModal);
    $("#btn-close-import").addEventListener("click", closeImportModal);
    $("#btn-cancel-import").addEventListener("click", closeImportModal);
    $("#resident-import-modal").addEventListener("click", (e) => {
      if (e.target === $("#resident-import-modal")) closeImportModal();
    });
    $("#import-file").addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) parseImportFile(e.target.files[0]);
    });
    $("#btn-confirm-import").addEventListener("click", confirmImport);

    $("#message-input").addEventListener("input", (e) => {
      $("#char-count").textContent = `${e.target.value.length} / 500`;
    });

    $("#btn-mic").addEventListener("click", async () => {
      if (state.running) return;
      const btn = $("#btn-mic");
      btn.disabled = true;
      btn.style.opacity = "0.7";
      addLog("语音识别", "正在接收语音输入");
      await sleep(900);
      const sc = SCENARIOS[state.scenario];
      $("#message-input").value = sc.voice ? `（语音转写）${sc.text}` : sc.text;
      $("#char-count").textContent = `${$("#message-input").value.length} / 500`;
      addLog("语音识别", "转写完成");
      btn.disabled = false;
      btn.style.opacity = "";
    });

    $("#btn-submit").addEventListener("click", runPipeline);
    $("#btn-clear").addEventListener("click", () => {
      state.case = null;
      state.logs = [];
      renderCase();
      renderPipeline();
      renderLog();
    });

    $("#case-body").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn) handleCaseAction(btn.dataset.action);
    });

    $("#ticket-search").addEventListener("input", (e) => {
      state.ticketSearch = e.target.value;
      renderTickets();
    });

    $("#ticket-filters").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-status]");
      if (!chip) return;
      state.filterStatus = chip.dataset.status;
      $$(".filter-chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderTickets();
    });

    $("#ticket-table-body").addEventListener("click", (e) => {
      const row = e.target.closest("tr[data-id]");
      if (row) renderTicketDetail(row.dataset.id);
    });

    $("#kb-search").addEventListener("input", (e) => {
      state.kbSearch = e.target.value;
      renderKB();
    });

    $("#kb-list").addEventListener("click", (e) => {
      const card = e.target.closest("[data-kb]");
      if (card) renderKBDetail(card.dataset.kb);
    });

    $("#btn-refresh-dash").addEventListener("click", () => {
      renderDashboard();
      toast("看板数据已刷新");
    });

    $("#threshold-value").textContent = "85%";
    $("#cfg-threshold").addEventListener("input", (e) => {
      $("#threshold-value").textContent = `${e.target.value}%`;
    });

    $("#agent-toggles").addEventListener("click", (e) => {
      const sw = e.target.closest(".switch");
      if (sw) sw.classList.toggle("on");
    });

    $("#btn-test-conn").addEventListener("click", async () => {
      const btn = $("#btn-test-conn");
      btn.disabled = true;
      btn.querySelector("span:last-child").textContent = "正在测试";
      const cfg = hiagent.load();
      if (cfg.mode === "real" && cfg.apiEndpoint) {
        addLog("连接测试", "正在请求 HiAgent 真实接口");
        try {
          const result = await hiagent.send("连接测试", { timeoutMs: 15000 });
          addLog("连接测试", "接口响应正常：" + (result.text || "").slice(0, 60));
          toast("HiAgent 接口连接成功", "ok");
        } catch (err) {
          addLog("连接测试", "失败：" + err.message);
          toast("连接失败：" + err.message, "error");
        }
      } else {
        await sleep(1100);
        addLog("连接测试", "网关可达，身份校验通过（演示）");
        toast("HiAgent 网关连接正常（演示）", "ok");
      }
      btn.disabled = false;
      btn.querySelector("span:last-child").textContent = "连接测试";
    });

    $("#btn-save-cfg").addEventListener("click", async () => {
      const cfg = hiagent.save({
        mode: $("#cfg-mode").value,
        endpoint: $("#cfg-endpoint").value.trim(),
        apiEndpoint: $("#cfg-api-endpoint").value.trim(),
        appId: $("#cfg-app-id").value.trim(),
        workflowId: $("#cfg-workflow-id").value.trim(),
        apiKey: $("#cfg-api-key").value.trim()
      });
      state.hiagentConfig = cfg;
      if (cfg.mode === "real") {
        try {
          const response = await fetch("/api/admin/hiagent-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: cfg.apiEndpoint || cfg.endpoint,
              appId: cfg.appId,
              workflowId: cfg.workflowId,
              apiKey: cfg.apiKey
            })
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload || payload.ok === false) {
            throw new Error((payload && payload.message) || `HTTP ${response.status}`);
          }
          toast("已保存，小程序将同步使用 HiAgent 真实接口", "ok");
        } catch (err) {
          toast(`已保存到浏览器，但后端同步失败：${err.message}`, "error");
        }
      } else {
        toast("已保存，当前为本地模拟模式", "warn");
      }
    });

    $("#btn-sync-kb").addEventListener("click", async () => {
      const btn = $("#btn-sync-kb");
      btn.disabled = true;
      btn.querySelector("span:last-child").textContent = "正在同步";
      addLog("知识库", "开始向量化同步");
      await sleep(1500);
      btn.disabled = false;
      btn.querySelector("span:last-child").textContent = "重新同步知识库";
      $("#last-sync").textContent = nowTime();
      addLog("知识库", `「鼓楼区政务咨询库」同步完成：${window.KNOWLEDGE_BASE.length} 篇演示缓存`);
      toast("鼓楼区政务咨询库同步完成", "ok");
    });

    $("#btn-clear-log").addEventListener("click", () => {
      state.logs = [];
      renderLog();
    });
  }

  function init() {
    renderClock();
    setInterval(renderClock, 1000);
    renderStaticIcons();
    renderNav();
    renderAgentList();
    renderScenario();
    renderCase();
    renderLog();
    renderRecent();
    renderTickets();
    renderKB();
    renderDashboard();
    renderSettings();
    loadAdminSession();
    bindEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
