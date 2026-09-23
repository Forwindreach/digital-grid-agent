const api = require("../../utils/api");
const { formatTime } = require("../../utils/format");

Page({
  data: {
    registered: true,
    messages: [],
    input: "",
    incidentAddress: "",
    processing: false,
    scrollIntoView: "",
    blocked: false
  },

  onShow() {
    this.refresh();
  },

  onUnload() {
    this.stopPolling();
  },

  onHide() {
    this.stopPolling();
  },

  async refresh() {
    try {
      const app = getApp();
      await app.ensureLogin();
      const meResult = await api.request("/api/me");
      const registered = meResult.resident && meResult.resident.status === "registered";
      this.setData({ registered, blocked: !registered });
      if (!registered) return;

      const result = await api.request("/api/conversation");
      this.setData({
        messages: this.formatMessages(result.messages || []),
        conversationId: result.conversation.id
      });
      this.scrollToBottom();
      if ((result.messages || []).some((m) => m.status === "processing")) {
        this.startPolling();
      }
    } catch (err) {
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    }
  },

  formatMessages(messages) {
    return messages.map((message) => ({
      ...message,
      pending: message.status === "processing",
      timeText: message.status === "processing" ? "处理中" : formatTime(message.createdAt)
    }));
  },

  onInput(event) {
    this.setData({ input: event.detail.value });
  },

  onIncidentAddressInput(event) {
    this.setData({ incidentAddress: event.detail.value });
  },

  async sendMessage() {
    const text = this.data.input.trim();
    if (!text) {
      wx.showToast({ title: "请输入诉求内容", icon: "none" });
      return;
    }
    if (this.data.processing) {
      wx.showToast({ title: "上一条正在处理中", icon: "none" });
      return;
    }

    const requestId = `wx_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const now = new Date();
    const localMessage = {
      id: `local_${requestId}`,
      role: "user",
      content: text,
      pending: true,
      status: "processing",
      timeText: "发送中"
    };
    this.setData({
      input: "",
      processing: true,
      messages: [...this.data.messages, localMessage]
    });
    this.scrollToBottom();

    try {
      await api.request("/api/messages", {
        method: "POST",
        data: {
          text,
          requestId,
          incidentAddress: this.data.incidentAddress
        }
      });
      this.waitForReply(requestId);
    } catch (err) {
      const messages = this.data.messages.map((m) =>
        m.id === localMessage.id
          ? { ...m, pending: false, status: "failed", timeText: "发送失败" }
          : m
      );
      this.setData({ messages, processing: false });
      wx.showToast({ title: err.message || "发送失败", icon: "none" });
    }
  },

  async waitForReply(requestId) {
    const started = Date.now();
    const poll = async () => {
      try {
        const result = await api.request("/api/conversation");
        const messages = this.formatMessages(result.messages || []);
        const reply = messages.find((m) => m.requestId === `reply-${requestId}`);
        const userMessage = messages.find((m) => m.requestId === requestId);
        this.setData({ messages, conversationId: result.conversation.id });
        this.scrollToBottom();

        if (
          (reply && reply.status === "done") ||
          (reply && reply.status === "failed") ||
          (userMessage && userMessage.status === "failed") ||
          Date.now() - started > 90000
        ) {
          this.stopPolling();
          this.setData({ processing: false });
          if (reply && reply.status === "failed") {
            wx.showToast({ title: "数字网格员处理失败", icon: "none" });
          }
          return;
        }
        this._pollTimer = setTimeout(poll, 1800);
      } catch (err) {
        this.stopPolling();
        this.setData({ processing: false });
        wx.showToast({ title: err.message || "查询失败", icon: "none" });
      }
    };
    this.stopPolling();
    this._pollTimer = setTimeout(poll, 600);
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(async () => {
      try {
        const result = await api.request("/api/conversation");
        const messages = this.formatMessages(result.messages || []);
        this.setData({ messages, conversationId: result.conversation.id });
        this.scrollToBottom();
        if (!messages.some((m) => m.status === "processing")) {
          this.stopPolling();
        }
      } catch (err) {
        this.stopPolling();
      }
    }, 2500);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length) {
      const last = messages[messages.length - 1];
      this.setData({ scrollIntoView: `msg-${last.id}` });
    }
  },

  goRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  }
});
