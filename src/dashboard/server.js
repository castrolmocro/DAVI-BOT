/**
 * DAVID V1 — Dashboard Server (Express + Socket.IO)
 * Copyright © DJAMEL
 */
"use strict";

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const path       = require("path");
const fs         = require("fs-extra");
const crypto     = require("crypto");
const multer     = require("multer");
const session    = require("express-session");
const rateLimit  = require("express-rate-limit");

const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
const CONFIG_PATH  = path.join(__dirname, "../../config.json");
const UPLOADS_DIR  = path.join(__dirname, "public/uploads");
fs.ensureDirSync(UPLOADS_DIR);

// ─── Globals ──────────────────────────────────────────────────────────────────
let io;
const _logBuf  = [];
const _msgBuf  = new Map();
const sessions = new Map();
const MSG_BUF_MAX = 60;

function _bufferMsg(msg) {
  const tid = String(msg.threadID || "dm");
  if (!_msgBuf.has(tid)) _msgBuf.set(tid, []);
  const buf = _msgBuf.get(tid);
  buf.push(msg);
  if (buf.length > MSG_BUF_MAX) buf.shift();
}
global._bufferMsg = _bufferMsg;

// ─── Strip ANSI ───────────────────────────────────────────────────────────────
const stripANSI = s => String(s)
  .replace(/\x1b\[[0-9;]*m/g, "")
  .replace(/\x1b\][^\x07]*\x07/g, "")
  .replace(/\x1b[^a-zA-Z]*[a-zA-Z]/g, "");

// ─── Intercept console → socket ───────────────────────────────────────────────
(function captureConsole() {
  const _orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  function cap(lvl) {
    return (...args) => {
      _orig[lvl](...args);
      const msg   = stripANSI(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
      const entry = { level: lvl, msg, ts: Date.now() };
      _logBuf.push(entry);
      if (_logBuf.length > 800) _logBuf.shift();
      try { if (io) io.emit("log", entry); } catch (_) {}
    };
  }
  console.log   = cap("log");
  console.warn  = cap("warn");
  console.error = cap("error");
  console.info  = cap("info");
})();

// ─── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_").slice(0, 40);
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mp3|ogg|wav|m4a|pdf|txt)$/i.test(file.originalname));
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genToken() { return crypto.randomBytes(32).toString("hex"); }
function getConfig() { try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch (_) { return {}; } }
function getPassword() { return getConfig()?.dashboard?.password || "djamel2025*"; }

function getStats() {
  const cfg    = global.config || {};
  const mem    = process.memoryUsage();
  const sys    = { total: require("os").totalmem(), free: require("os").freemem() };
  const up     = process.uptime();
  const d = Math.floor(up / 86400), h = Math.floor((up % 86400) / 3600),
        m = Math.floor((up % 3600) / 60), s = Math.floor(up % 60);
  return {
    online:      !!global.api,
    botName:     cfg.botName    || "DAVID V1",
    prefix:      cfg.prefix     || "/",
    ownerID:     cfg.ownerID    || "—",
    admins:      (cfg.adminIDs  || []).length,
    commands:    global.commands?.size || 0,
    protection:  16,
    uptime:      [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" "),
    memHeap:     `${(mem.heapUsed / 1048576).toFixed(1)} MB`,
    memTotal:    `${(mem.heapTotal / 1048576).toFixed(1)} MB`,
    sysUsed:     `${((sys.total - sys.free) / 1073741824).toFixed(2)} GB`,
    sysTotal:    `${(sys.total / 1073741824).toFixed(2)} GB`,
    version:     cfg.botVersion || "1.0.0",
    author:      "DJAMEL",
    cookie:      fs.existsSync(ACCOUNT_PATH) ? (fs.readFileSync(ACCOUNT_PATH, "utf8").trim() ? "✅ موجود" : "❌ فارغ") : "❌ غير موجود",
  };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization || req.cookies?.token || req.query?.token;
  if (token && sessions.has(token)) return next();
  res.status(401).json({ error: "غير مصرح" });
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
io = new Server(server, { cors: { origin: "*" } });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(require("cookie-parser")());
app.use(rateLimit({ windowMs: 15 * 60000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password || password !== getPassword()) {
    return res.status(401).json({ ok: false, error: "كلمة المرور غير صحيحة" });
  }
  const token = genToken();
  sessions.set(token, { ts: Date.now() });
  // Expire after 24h
  setTimeout(() => sessions.delete(token), 24 * 3600 * 1000);
  res.json({ ok: true, token });
});

// Logout
app.post("/api/logout", requireAuth, (req, res) => {
  const token = req.headers.authorization || req.query?.token;
  sessions.delete(token);
  res.json({ ok: true });
});

// Stats
app.get("/api/stats", requireAuth, (_req, res) => {
  try { res.json(getStats()); } catch (e) { res.status(500).json({ error: e.message }); }
});

// DB stats
app.get("/api/db-stats", requireAuth, (_req, res) => {
  try {
    const { getStats } = require("../utils/database");
    res.json(getStats());
  } catch (_) { res.json({ totalUsers: 0, totalThreads: 0, totalCommands: 0, recentLogs: [] }); }
});

// Commands list
app.get("/api/commands", requireAuth, (_req, res) => {
  const list = [];
  global.commands?.forEach((cmd, name) => {
    if (cmd.config?.name?.toLowerCase() === name) {
      list.push({ name, aliases: cmd.config?.aliases || [], category: cmd.config?.category || "other" });
    }
  });
  res.json(list);
});

// Get cookie
app.get("/api/cookie", requireAuth, (_req, res) => {
  const raw = fs.existsSync(ACCOUNT_PATH) ? fs.readFileSync(ACCOUNT_PATH, "utf8").trim() : "";
  res.json({ cookie: raw });
});

// Set cookie
app.post("/api/cookie", requireAuth, (req, res) => {
  const { cookie } = req.body;
  if (!cookie || !cookie.trim()) return res.status(400).json({ error: "الكوكي فارغ" });
  try {
    const { parseCookieInput } = require("../utils/cookieParser");
    const { cookies } = parseCookieInput(cookie.trim());
    if (!cookies.length) return res.status(400).json({ error: "الكوكي غير صالح" });
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(cookies, null, 2));
    setTimeout(() => { global._selfWrite = false; }, 6000);
    res.json({ ok: true, count: cookies.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Get config
app.get("/api/config", requireAuth, (_req, res) => {
  const cfg = getConfig();
  if (cfg.dashboard?.password) cfg.dashboard.password = "••••••••";
  if (cfg.facebookAccount?.password) cfg.facebookAccount.password = "••••••••";
  res.json(cfg);
});

// Get admins
app.get("/api/admins", requireAuth, (_req, res) => {
  const cfg = getConfig();
  res.json({ ownerID: cfg.ownerID || "", adminIDs: cfg.adminIDs || [] });
});

// Add admin
app.post("/api/admins/add", requireAuth, (req, res) => {
  const { fbid } = req.body;
  if (!fbid?.trim()) return res.status(400).json({ error: "ID غير صالح" });
  try {
    const cfg = getConfig();
    if (!cfg.adminIDs) cfg.adminIDs = [];
    if (!cfg.adminIDs.includes(fbid.trim())) cfg.adminIDs.push(fbid.trim());
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    if (global.config) global.config.adminIDs = cfg.adminIDs;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Remove admin
app.post("/api/admins/remove", requireAuth, (req, res) => {
  const { fbid } = req.body;
  try {
    const cfg = getConfig();
    cfg.adminIDs = (cfg.adminIDs || []).filter(id => id !== fbid);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    if (global.config) global.config.adminIDs = cfg.adminIDs;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Set owner
app.post("/api/owner", requireAuth, (req, res) => {
  const { ownerID } = req.body;
  if (!ownerID?.trim()) return res.status(400).json({ error: "Owner ID غير صالح" });
  try {
    const cfg = getConfig();
    cfg.ownerID = ownerID.trim();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    if (global.config)  global.config.ownerID  = cfg.ownerID;
    global.ownerID = cfg.ownerID;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Restart bot
app.post("/api/restart", requireAuth, (_req, res) => {
  res.json({ ok: true });
  setTimeout(() => {
    try { global.startBot?.(); } catch (_) { process.exit(0); }
  }, 500);
});

// Send message
app.post("/api/send", requireAuth, (req, res) => {
  const { threadID, message } = req.body;
  if (!global.api) return res.status(503).json({ error: "البوت غير متصل" });
  if (!threadID || !message) return res.status(400).json({ error: "threadID و message مطلوبان" });
  global.api.sendMessage({ body: message }, threadID, (err) => {
    if (err) res.status(500).json({ error: String(err.message || err) });
    else res.json({ ok: true });
  });
});

// Upload file
app.post("/api/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "لم يتم تحميل ملف" });
  res.json({ ok: true, filename: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// Logs
app.get("/api/logs", requireAuth, (req, res) => {
  const n = parseInt(req.query.n) || 100;
  res.json(_logBuf.slice(-n));
});

// Serve SPA for all other routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token && sessions.has(token)) return next();
  next(new Error("Unauthorized"));
});

io.on("connection", (socket) => {
  // Send buffered logs on connect
  socket.emit("log-history", _logBuf.slice(-200));

  // Send current status
  try { socket.emit("bot-status", { status: global.api ? "online" : "offline", message: global.api ? "متصل ✔" : "غير متصل" }); }
  catch (_) {}

  // Send buffered messages
  const msgs = [];
  _msgBuf.forEach(buf => msgs.push(...buf));
  msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  socket.emit("message-history", msgs.slice(-60));

  socket.on("restart-bot", () => {
    try { global.startBot?.(); } catch (_) { process.exit(0); }
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────
function startDashboard(port = 5000) {
  server.listen(port, () => {
    console.log(`\x1b[36m[DASHBOARD]\x1b[0m لوحة التحكم: http://localhost:${port}`);
  });
}

function getIO() { return io; }

module.exports = { startDashboard, getIO };
