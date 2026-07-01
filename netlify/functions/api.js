const {
  clearSessionCookie,
  getAuth,
  json,
  normalizePhone,
  publicUser,
  randomId,
  requireAccessResponse,
  setSessionCookie
} = require("./lib/auth");
const { readDb, writeDb } = require("./lib/storage");

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
}

exports.handler = async (event) => {
  try {
    const route = event.path.split("/api/")[1] || "";
    const method = event.httpMethod;

    if (method === "POST" && route === "login") {
      const body = parseBody(event);
      const phone = normalizePhone(body.phone);
      if (phone.length < 6) return json(400, { ok: false, message: "请输入正确手机号" });

      const db = await readDb();
      if (!db.users[phone]) {
        db.users[phone] = {
          phone,
          createdAt: new Date().toISOString(),
          hasAccess: false,
          plan: null,
          deviceId: null,
          activeSession: null
        };
      }

      const token = randomId();
      db.sessions[token] = { phone, createdAt: new Date().toISOString() };
      db.users[phone].activeSession = token;
      await writeDb(db);

      return json(200, { ok: true, token, user: publicUser(db.users[phone]) }, {
        "set-cookie": setSessionCookie(token)
      });
    }

    if (method === "POST" && route === "logout") {
      const auth = await getAuth(event);
      if (auth) {
        delete auth.db.sessions[auth.token];
        if (auth.user.activeSession === auth.token) auth.user.activeSession = null;
        await writeDb(auth.db);
      }
      return json(200, { ok: true }, { "set-cookie": clearSessionCookie() });
    }

    if (method === "GET" && route === "me") {
      const auth = await getAuth(event);
      return json(200, { ok: true, token: auth ? auth.token : null, user: auth ? publicUser(auth.user) : null });
    }

    if (method === "POST" && route === "redeem") {
      const auth = await getAuth(event);
      if (!auth) return json(401, { ok: false, message: "请先登录" });

      const body = parseBody(event);
      const codeText = String(body.code || "").trim().toUpperCase();
      const deviceId = String(body.deviceId || "").trim();
      const code = auth.db.codes[codeText];

      if (!deviceId || deviceId.length < 16) {
        return json(400, { ok: false, message: "设备识别失败，请刷新页面再试" });
      }
      if (!code) return json(404, { ok: false, message: "兑换码不存在" });
      if (code.usedBy && code.usedBy !== auth.user.phone) {
        return json(409, { ok: false, message: "兑换码已被其他账号使用" });
      }
      if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
        return json(410, { ok: false, message: "兑换码已过期" });
      }
      if (auth.user.deviceId && auth.user.deviceId !== deviceId) {
        return json(409, { ok: false, message: "账号已经绑定过另一台设备" });
      }

      code.usedBy = auth.user.phone;
      code.usedAt = code.usedAt || new Date().toISOString();
      auth.user.hasAccess = true;
      auth.user.plan = code.plan;
      auth.user.deviceId = deviceId;
      await writeDb(auth.db);

      return json(200, { ok: true, token: auth.token, user: publicUser(auth.user) });
    }

    if (method === "POST" && route === "check-access") {
      const auth = await getAuth(event);
      const blocked = requireAccessResponse(event, auth);
      if (blocked) return blocked;
      return json(200, { ok: true, token: auth.token, user: publicUser(auth.user) });
    }

    return json(404, { ok: false, message: "API not found" });
  } catch (error) {
    return json(500, { ok: false, message: error.message });
  }
};
