(function () {
  "use strict";

  const CONFIG_KEY = "hiagent_config_v1";
  const DEFAULTS = {
    mode: "simulation",
    endpoint: "",
    apiEndpoint: "",
    proxyMode: true,
    appId: "personal-d9fih1mmreq4ugfv7o5g",
    workflowId: "d9mr3rhb9rsa732g1ajg",
    apiKey: ""
  };

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}"));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(config) {
    const next = Object.assign({}, load(), config);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    return next;
  }

  function normalize(data) {
    const root = data && data.data ? data.data : data;
    const candidates = [
      root && (root.reply || root.answer || root.output || root.text || root.message),
      data && (data.reply || data.answer || data.output || data.text || data.message)
    ];
    const text = candidates.find((x) => typeof x === "string" && x.trim()) || (typeof data === "string" ? data : "");
    const ticket = root && (root.ticket || root.ticket_data) || data && (data.ticket || data.ticket_data) || null;
    return { text, ticket, raw: data };
  }

  async function send(query, options) {
    const opts = options || {};
    const cfg = Object.assign({}, load(), opts);
    const endpoint = cfg.apiEndpoint || cfg.endpoint;
    if (!endpoint) {
      throw new Error("未配置 HiAgent 接口地址");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 60000);

    if (cfg.proxyMode !== false) {
      try {
        const proxyResponse = await fetch("/api/hiagent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            apiEndpoint: endpoint,
            apiKey: cfg.apiKey,
            appId: cfg.appId,
            workflowId: cfg.workflowId,
            userId: opts.userId || "grid-worker-demo",
            timeoutMs: opts.timeoutMs || 120000
          }),
          signal: controller.signal
        });
        const payload = await proxyResponse.json().catch(() => null);
        if (!proxyResponse.ok || !payload || payload.ok === false) {
          throw new Error((payload && payload.message) || `本地代理请求失败：HTTP ${proxyResponse.status}`);
        }
        return normalize(payload.data || payload.raw || {});
      } catch (err) {
        if (/Failed to fetch|NetworkError|ECONNREFUSED/.test(err.message)) {
          throw new Error("本地代理不可用，请先运行：node server.js");
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    const headers = { "Content-Type": "application/json" };
    if (cfg.apiKey) {
      headers.Authorization = `Bearer ${cfg.apiKey}`;
    }

    const body = {
      app_id: cfg.appId,
      workflow_id: cfg.workflowId,
      user_id: opts.userId || "grid-worker-demo",
      query,
      stream: false
    };

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`HiAgent 请求失败：HTTP ${response.status} ${detail.slice(0, 120)}`);
    }

    const data = await response.json().catch(() => null);
    return normalize(data || (await response.text().catch(() => "")));
  }

  window.HiAgentClient = { load, save, send, normalize };
})();
