const api = require("../../utils/api");

Page({
  data: {
    resident: null,
    baseUrl: api.getBaseUrl(),
    mode: "",
    loading: true
  },

  onShow() {
    this.setData({ baseUrl: api.getBaseUrl() });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      await app.ensureLogin();
      const [meResult, configResult] = await Promise.all([
        api.request("/api/me"),
        api.request("/api/runtime/config")
      ]);
      this.setData({
        resident: meResult.resident,
        mode: configResult.mode === "hiagent" ? "HiAgent 真实接口" : "本地模拟模式"
      });
    } catch (err) {
      const cachedResident =
        getApp().globalData.resident || wx.getStorageSync("resident");
      if (cachedResident) {
        this.setData({ resident: cachedResident });
      }
      wx.showToast({ title: err.message || "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onBaseUrlInput(event) {
    this.setData({ baseUrl: event.detail.value });
  },

  saveBaseUrl() {
    if (api.setBaseUrl(this.data.baseUrl)) {
      getApp().resetLogin();
      wx.showToast({ title: "已保存，正在重新登录", icon: "success" });
      setTimeout(() => {
        wx.reLaunch({ url: "/pages/index/index" });
      }, 600);
    } else {
      wx.showToast({ title: "请输入有效地址", icon: "none" });
    }
  },

  async testConnection() {
    wx.showLoading({ title: "测试中", mask: true });
    try {
      const result = await api.request("/api/health");
      wx.hideLoading();
      wx.showToast({ title: "连接成功", icon: "success" });
      return result;
    } catch (err) {
      wx.hideLoading();
      wx.showModal({
        title: "连接失败",
        content: err.message || "无法访问后端",
        showCancel: false
      });
    }
  },

  goRegister() {
    wx.navigateTo({ url: "/pages/register/register" });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新登录小程序。",
      success: (res) => {
        if (res.confirm) {
          api.logout();
          getApp().resetLogin();
          wx.reLaunch({ url: "/pages/index/index" });
        }
      }
    });
  }
});
