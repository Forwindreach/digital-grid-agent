const api = require("../../utils/api");
const { formatTime } = require("../../utils/format");

Page({
  data: {
    filter: "all",
    allOrders: [],
    workOrders: [],
    loading: true
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.ensureLogin();
      const result = await api.request("/api/work-orders");
      const allOrders = (result.workOrders || []).map((item) => ({
        ...item,
        createdAtText: formatTime(item.createdAt)
      }));
      this.setData({ allOrders });
      this.applyFilter();
    } catch (err) {
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  changeFilter(event) {
    this.setData({ filter: event.currentTarget.dataset.filter });
    this.applyFilter();
  },

  applyFilter() {
    const { filter, allOrders } = this.data;
    const workOrders =
      filter === "all"
        ? allOrders
        : allOrders.filter((item) =>
            filter === "archived" ? item.status === "已归档" : item.status !== "已归档"
          );
    this.setData({ workOrders });
  },

  goDetail(event) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${event.currentTarget.dataset.id}` });
  }
});
