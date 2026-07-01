const crypto = require("crypto");
const { readDb } = require("./storage");

function json(statusCode, body, extraHeaders = {}) {
  const cookie = extraHeaders["set-cookie"] || extraHeaders["Set-Cookie"];
  const headers = { ...extraHeaders };
  delete headers["set-cookie"];
  delete headers["Set-Cookie"];
  if (cookie) headers["Set-Cookie"] = cookie;

  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    },
    ...(cookie ? { multiValueHeaders: { "Set-Cookie": [cookie] } } : {}),
    body: JSON.stringify(body)
  };
}

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
  }
  return cookies;
}

function setSessionCookie(token) {
  return `chess_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=2592000`;
}

function clearSessionCookie() {
  return "chess_session=; HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=0";
}

function randomId(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").slice(0, 24);
}

function publicUser(user) {
  return {
    phone: user.phone,
    hasAccess: Boolean(user.hasAccess),
    plan: user.plan || null,
    deviceId: user.deviceId || null
  };
}

async function getAuth(event) {
  const headers = event.headers || {};
  const query = event.queryStringParameters || {};
  const authorization = headers.authorization || headers.Authorization || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const token = parseCookies(headers.cookie || headers.Cookie || "").chess_session || bearer || query.token;
  if (!token) return null;

  const db = await readDb();
  const session = db.sessions[token];
  if (!session) return null;

  const user = db.users[session.phone];
  if (!user) return null;

  return { db, token, session, user };
}

function requireAccessResponse(event, auth) {
  if (!auth) return json(401, { ok: false, message: "请先登录" });

  const headers = event.headers || {};
  const query = event.queryStringParameters || {};
  const deviceId = headers["x-device-id"] || headers["X-Device-Id"] || query.deviceId;

  if (!auth.user.hasAccess) {
    return json(403, { ok: false, message: "请先购买或输入兑换码" });
  }

  if (!deviceId || auth.user.deviceId !== deviceId) {
    return json(403, { ok: false, message: "这份授权已绑定到另一台设备" });
  }

  if (auth.user.activeSession && auth.user.activeSession !== auth.token) {
    return json(409, { ok: false, message: "这个账号已在另一处登录，请重新登录确认" });
  }

  return null;
}

module.exports = {
  clearSessionCookie,
  getAuth,
  json,
  normalizePhone,
  publicUser,
  randomId,
  requireAccessResponse,
  setSessionCookie
};
