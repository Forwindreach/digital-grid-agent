const api = require("./utils/api");

App({
  globalData: {
    baseUrl: api.getBaseUrl(),
    token: "",
    resident: null
  },

  onLaunch() {
    const cachedResident = wx.getStorageSync("resident");
    if (cachedResident) {
      this.globalData.resident = cachedResident;
    }
    this.ensureLogin().catch(() => {});
  },

  ensureLogin() {
    if (this._loginPromise) return this._loginPromise;
    this._loginPromise = api
      .login()
      .then((data) => {
        this.globalData.token = data.token;
        this.globalData.resident = data.resident;
        wx.setStorageSync("resident", data.resident);
        return data;
      })
      .catch((err) => {
        this._loginPromise = null;
        throw err;
      });
    return this._loginPromise;
  },

  setResident(resident) {
    this.globalData.resident = resident;
    if (resident) {
      wx.setStorageSync("resident", resident);
    }
  },

  resetLogin() {
    this._loginPromise = null;
    this.globalData.token = "";
    this.globalData.resident = null;
  }
});
