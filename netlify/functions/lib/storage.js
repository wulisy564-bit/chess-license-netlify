const fs = require("fs");
const os = require("os");
const path = require("path");

const LOCAL_DATA_DIR = path.join(os.tmpdir(), "chess-license-netlify-data");
const LOCAL_DB_FILE = path.join(LOCAL_DATA_DIR, "db.json");

const DEFAULT_DB = {
  users: {},
  sessions: {},
  codes: {
    "TEST-2026": {
      plan: "full",
      usedBy: null,
      usedAt: null,
      expiresAt: null
    }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getBlobStore() {
  try {
    const { getStore } = await import("@netlify/blobs");
    return getStore("chess-license-db");
  } catch (error) {
    if (process.env.NETLIFY) throw error;
    return null;
  }
}

function ensureLocalDb() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

async function readDb() {
  const store = await getBlobStore();
  if (store) {
    const value = await store.get("db", { type: "json" });
    if (value) return value;
    await store.setJSON("db", DEFAULT_DB);
    return clone(DEFAULT_DB);
  }

  ensureLocalDb();
  return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, "utf8"));
}

async function writeDb(db) {
  const store = await getBlobStore();
  if (store) {
    await store.setJSON("db", db);
    return;
  }

  ensureLocalDb();
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(db, null, 2));
}

module.exports = {
  readDb,
  writeDb
};
