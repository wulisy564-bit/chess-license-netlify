const fs = require("fs");
const path = require("path");
const { readDb } = require("./lib/storage");

function findGameFile() {
  const candidates = [
    path.join(process.cwd(), "protected-game", "index.html"),
    path.join(__dirname, "..", "..", "protected-game", "index.html"),
    path.join(__dirname, "protected-game", "index.html"),
    path.join("/var/task", "protected-game", "index.html")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Protected game file not found. Checked: ${candidates.join(", ")}`);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function parseTokenAndDevice(event) {
  const query = { ...(event.queryStringParameters || {}) };
  const headers = event.headers || {};
  const rawParts = [
    event.rawQuery,
    event.rawQueryString,
    event.rawUrl && event.rawUrl.includes("?") ? event.rawUrl.split("?").slice(1).join("?") : "",
    event.path && event.path.includes("?") ? event.path.split("?").slice(1).join("?") : ""
  ].filter(Boolean);

  for (const raw of rawParts) {
    for (const [key, value] of new URLSearchParams(raw)) {
      if (!(key in query)) query[key] = value;
    }
  }

  return {
    token: query.token || parseCookies(headers.cookie || headers.Cookie || "").chess_session || parseBearer(headers.authorization || headers.Authorization || ""),
    deviceId: query.deviceId || headers["x-device-id"] || headers["X-Device-Id"] || ""
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

function parseBearer(value = "") {
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

async function getPlayAuth(event) {
  const { token, deviceId } = parseTokenAndDevice(event);
  const headers = event.headers || {};
  const phone = String(headers["x-phone"] || headers["X-Phone"] || "").replace(/[^\d+]/g, "").slice(0, 24);

  const db = await readDb();
  const session = token ? db.sessions[token] : null;

  const user = session ? db.users[session.phone] : db.users[phone];
  if (!user) return { error: json(401, { ok: false, message: "请先登录", reason: "missing-user" }) };
  if (!user.hasAccess) return { error: json(403, { ok: false, message: "请先购买或输入兑换码" }) };
  if (!deviceId || user.deviceId !== deviceId) {
    return { error: json(403, { ok: false, message: "这份授权已绑定到另一台设备" }) };
  }
  if (token && user.activeSession && user.activeSession !== token) {
    return { error: json(409, { ok: false, message: "这个账号已在另一处登录，请重新登录确认" }) };
  }

  return { user };
}

exports.handler = async (event) => {
  const auth = await getPlayAuth(event);
  if (auth.error) return auth.error;

  const gamePath = findGameFile();
  const html = fs.readFileSync(gamePath, "utf8");

  return {
    statusCode: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    },
    body: html
  };
};
