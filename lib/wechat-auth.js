import {
  createSessionToken,
  findOpenidByToken,
  findOrCreateResidentByOpenid
} from "./store.js";

const APP_ID = process.env.WECHAT_APP_ID || "";
const APP_SECRET = process.env.WECHAT_APP_SECRET || "";

async function exchangeCode(code, mockOpenid) {
  if (APP_ID && APP_SECRET && code) {
    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.searchParams.set("appid", APP_ID);
    url.searchParams.set("secret", APP_SECRET);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (!data.openid) {
        throw new Error(`微信登录失败：${data.errmsg || "未获取到 openid"}`);
      }
      return data.openid;
    } finally {
      clearTimeout(timer);
    }
  }

  if (mockOpenid) {
    return String(mockOpenid).slice(0, 64);
  }

  if (code) {
    return `dev-${String(code).slice(0, 32)}`;
  }

  throw new Error("缺少微信登录 code 或开发调试标识");
}

export function requireAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const openid = findOpenidByToken(token);
  if (!openid) {
    const err = new Error("请先登录");
    err.status = 401;
    throw err;
  }
  return { openid, token };
}

export async function login(body) {
  const openid = await exchangeCode(body.code, body.mockOpenid);
  const resident = findOrCreateResidentByOpenid(openid);
  const token = createSessionToken(openid);
  return { token, resident, openid };
}
