const crypto = require("crypto");

const SECRET = process.env.CHESS_GRANT_SECRET || "change-this-before-large-sales-20260701";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function createGrant(user, deviceId) {
  const payload = JSON.stringify({
    phone: user.phone,
    plan: user.plan || "full",
    deviceId,
    exp: Date.now() + MAX_AGE_MS
  });
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

function verifyGrant(grant, deviceId) {
  const [encoded, signature] = String(grant || "").split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) return null;
  if (!deviceId || payload.deviceId !== deviceId) return null;
  return payload;
}

module.exports = {
  createGrant,
  verifyGrant
};
