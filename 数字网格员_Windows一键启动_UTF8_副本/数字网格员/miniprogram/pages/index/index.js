const api = require("../../utils/api");
const { formatTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    resident: null,
    registered: false,
    workOrders: []
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.ensureLogin();
      const [meResult, orderResult] = await Promise.all([
        api.request("/api/me"),
        api.request("/api/work-orders")
      ]);
      const resident = meResult.resident;
      app.setResident(resident);
      this.setData({
        resident,
        registered: resident && resident.status === "registered",
        workOrders: (orderResult.workOrders || []).slice(0, 3).map((item) => ({
          ...item,
          createdAtText: formatTime(item.createdAt)
        }))
      });
    } catch (err) {
      const cachedResident =
        getApp().globalData.resident || wx.getStorageSync("resident");
      if (cachedResident) {
        this.setData({
          resident: cachedResident,
          registered: cachedResident.status === "registered"
        });
      }
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  },

  goChat() {
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  goOrders() {
    wx.switchTab({ url: "/pages/orders/orders" });
  },

  goOrderDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  }
});
