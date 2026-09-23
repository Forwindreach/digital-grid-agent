const { API_BASE_URL } = require("../config");

const DEFAULT_BASE_URL = API_BASE_URL || "http://127.0.0.1:3100";

function getBaseUrl() {
  return wx.getStorageSync("apiBaseUrl") || DEFAULT_BASE_URL;
}

function setBaseUrl(url) {
  const normalized = String(url || "").trim().replace(/\/+$/, "");
  if (!normalized) return false;
  wx.setStorageSync("apiBaseUrl", normalized);
  return true;
}

function rawRequest(path, options = {}) {
  const token = wx.getStorageSync("token");
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${path}`,
      method: options.method || "GET",
      data: options.data || {},
      timeout: options.timeout || 15000,
      header: {
        "content-type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        const payload = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300 && payload && payload.ok !== false) {
          resolve(payload);
          return;
        }
        const err = new Error((payload && payload.message) || `请求失败 ${res.statusCode}`);
        err.statusCode = res.statusCode;
        reject(err);
      },
      fail(err) {
        const requestErr = new Error(err.errMsg || "网络请求失败");
        requestErr.statusCode = 0;
        reject(requestErr);
      }
    });
  });
}

function request(path, options = {}) {
  return rawRequest(path, options).catch((err) => {
    if (err.statusCode === 401 && !options._retried) {
      wx.removeStorageSync("token");
      return login()
        .then(() => rawRequest(path, { ...options, _retried: true }))
        .catch(() => {
          throw err;
        });
    }
    throw err;
  });
}

function login() {
  let mockOpenid = wx.getStorageSync("mockOpenid");
  if (!mockOpenid) {
    mockOpenid = `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    wx.setStorageSync("mockOpenid", mockOpenid);
  }

  return new Promise((resolve, reject) => {
    const tryMock = (err) => {
      rawRequest("/api/wechat/login", {
        method: "POST",
        data: { mockOpenid }
      })
        .then((data) => {
          wx.setStorageSync("token", data.token);
          wx.setStorageSync("resident", data.resident);
          resolve(data);
        })
        .catch((loginErr) => {
          reject(err || loginErr);
        });
    };

    wx.login({
      success({ code }) {
        rawRequest("/api/wechat/login", {
          method: "POST",
          data: { code, mockOpenid }
        })
          .then((data) => {
            wx.setStorageSync("token", data.token);
            wx.setStorageSync("resident", data.resident);
            resolve(data);
          })
          .catch(tryMock);
      },
      fail: tryMock
    });
  });
}

function logout() {
  wx.removeStorageSync("token");
}

module.exports = {
  DEFAULT_BASE_URL,
  getBaseUrl,
  setBaseUrl,
  request,
  login,
  logout
};
