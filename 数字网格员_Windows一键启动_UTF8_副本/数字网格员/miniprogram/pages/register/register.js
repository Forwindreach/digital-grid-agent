const api = require("../../utils/api");

Page({
  data: {
    name: "",
    phone: "",
    communityIndex: 0,
    communities: [
      "温泉街道·华林社区",
      "温泉街道·观风亭社区",
      "温泉街道·金泉社区"
    ],
    grid: "",
    address: "",
    consent: false,
    submitting: false,
    isEdit: false,
    submitText: "保存并开始使用"
  },

  onLoad() {
    getApp().ensureLogin().then(() => {
      const resident = getApp().globalData.resident;
      if (resident && resident.status === "registered") {
        const communityIndex = Math.max(
          0,
          this.data.communities.indexOf(resident.community)
        );
        this.setData({
          isEdit: true,
          submitText: "保存修改",
          name: resident.name || "",
          phone: "",
          communityIndex,
          grid: resident.grid || "",
          address: resident.address || "",
          consent: true
        });
        wx.setNavigationBarTitle({ title: "修改地址" });
      }
    }).catch(() => {});
  },

  onShow() {
    this.setData({ submitting: false });
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  onCommunityChange(event) {
    this.setData({ communityIndex: Number(event.detail.value) });
  },

  onConsentChange(event) {
    const value = event.detail && event.detail.value;
    const checked = Array.isArray(value) ? value.includes("consent") : !this.data.consent;
    this.setData({ consent: checked });
  },

  toggleConsent() {
    this.setData({ consent: !this.data.consent });
  },

  async submit() {
    const { name, phone, grid, address, consent, isEdit } = this.data;
    if (!name || !grid || !address || (!isEdit && !phone)) {
      wx.showToast({ title: "请完整填写登记信息", icon: "none" });
      return;
    }
    if (!consent) {
      wx.showToast({ title: "请先同意个人信息使用说明", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    try {
      const data = await api.request("/api/residents/register", {
        method: "POST",
        data: {
          name,
          phone,
          community: this.data.communities[this.data.communityIndex],
          grid,
          address,
          consent
        }
      });
      getApp().setResident(data.resident);
      wx.showToast({ title: isEdit ? "修改成功" : "登记成功", icon: "success" });
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail: () => wx.switchTab({ url: "/pages/index/index" })
        });
      }, 500);
    } catch (err) {
      wx.showToast({ title: err.message || "登记失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
