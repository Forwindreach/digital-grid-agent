const api = require("../../utils/api");
const { formatTime } = require("../../utils/format");

Page({
  data: {
    workOrder: null,
    timeline: [],
    confirming: false
  },

  onLoad(options) {
    this.orderId = options.id || "";
  },

  onShow() {
    if (this.orderId) this.loadDetail();
  },

  async loadDetail() {
    try {
      const result = await api.request(`/api/work-orders/${this.orderId}`);
      const workOrder = {
        ...result.workOrder,
        createdAtText: formatTime(result.workOrder.createdAt)
      };
      const timeline = (result.workOrder.timeline || []).map((item) => ({
        ...item,
        timeText: formatTime(item.time)
      }));
      this.setData({ workOrder, timeline });
    } catch (err) {
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    }
  },

  async confirmOrder() {
    this.setData({ confirming: true });
    try {
      const result = await api.request(`/api/work-orders/${this.orderId}/confirm`, {
        method: "POST"
      });
      const workOrder = {
        ...result.workOrder,
        createdAtText: formatTime(result.workOrder.createdAt)
      };
      const timeline = (result.workOrder.timeline || []).map((item) => ({
        ...item,
        timeText: formatTime(item.time)
      }));
      this.setData({ workOrder, timeline });
      wx.showToast({ title: "已确认", icon: "success" });
    } catch (err) {
      wx.showToast({ title: err.message || "确认失败", icon: "none" });
    } finally {
      this.setData({ confirming: false });
    }
  }
});
