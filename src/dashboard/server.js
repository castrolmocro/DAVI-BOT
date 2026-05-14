/**
 * DAVID V1 — Dashboard Server
 * Copyright © 2025 DJAMEL
 */
"use strict";
const express    = require("express");
const http       = require("http");
const socketio   = require("socket.io");
const path       = require("path");
const fs         = require("fs-extra");
const bodyParser = require("body-parser");
const chalk      = require("chalk");

const ACCOUNT_PATH = path.join(process.cwd(), "account.txt");
const CONFIG_PATH  = path.join(process.cwd(), "config.json");

let _io       = null;
let _server   = null;

// Live stats buffer
const stats = {
  totalMessages: 0,
  totalCommands: 0,
  activeThreads: new Set(),
  activeUsers:   new Set(),
  messageLog:    [],
};

function getIO() { return _io; }

function _bufferMsg(event) {
  stats.totalMessages++;
  if (event.threadID) stats.activeThreads.add(String(event.threadID));
  if (event.senderID) stats.activeUsers.add(String(event.senderID));
  if (stats.messageLog.length >= 50) stats.messageLog.shift();
  stats.messageLog.push({ body: (event.body||"").slice(0, 80), ts: Date.now(), tid: event.threadID });
  if (_io) _io.emit("stats-update", getStats());
}

function _trackMsg(tid, uid, body) {
  if (body?.startsWith(global.GoatBot?.config?.prefix || "/")) stats.totalCommands++;
}

global._bufferMsg = _bufferMsg;
global._trackMsg  = _trackMsg;

function getStats() {
  const upMs = Date.now() - (global.GoatBot?.startTime || Date.now());
  const mem  = process.memoryUsage();
  return {
    uptime:         upMs,
    totalMessages:  stats.totalMessages,
    totalCommands:  stats.totalCommands,
    activeThreads:  stats.activeThreads.size,
    activeUsers:    stats.activeUsers.size,
    commands:       global.GoatBot?.commands?.size || 0,
    botID:          global.GoatBot?.botID || "—",
    botName:        global.GoatBot?.config?.botName || "DAVID V1",
    memMB:          +(mem.heapUsed / 1048576).toFixed(1),
    prefix:         global.GoatBot?.config?.prefix || "/",
    protection:     20,
  };
}

function startDashboard(port = 5000) {
  const app    = express();
  _server      = http.createServer(app);
  _io          = socketio(_server, { cors: { origin: "*" } });

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, "public")));

  // ── API ─────────────────────────────────────────────────────────────────────

  // Get stats
  app.get("/api/stats", (req, res) => res.json(getStats()));

  // Get config
  app.get("/api/config", (req, res) => {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      // hide sensitive
      if (cfg.facebookAccount) { cfg.facebookAccount.password = ""; }
      res.json({ ok: true, config: cfg });
    } catch (e) { res.json({ ok: false, error: e.message }); }
  });

  // Save config
  app.post("/api/config", (req, res) => {
    try {
      const old = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      const updated = Object.assign({}, old, req.body);
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
      if (global.GoatBot) global.GoatBot.config = updated;
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false, error: e.message }); }
  });

  // Upload cookies
  app.post("/api/cookies", (req, res) => {
    const raw = req.body?.cookies;
    if (!raw) return res.json({ ok: false, error: "لا توجد بيانات" });
    try {
      const DjamelFCA = require("../../Djamel-fca");
      const { cookies } = DjamelFCA.parseCookieInput(raw);
      if (!cookies.length) return res.json({ ok: false, error: "صيغة الكوكيز غير معروفة" });
      if (!DjamelFCA.hasMandatory(cookies)) return res.json({ ok: false, error: "كوكيز ناقصة (c_user أو xs مفقود)" });
      global._selfWrite = true;
      fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(cookies, null, 2));
      setTimeout(() => { global._selfWrite = false; }, 6000);
      res.json({ ok: true, count: cookies.length });
      // تسجيل الدخول بعد ثانية
      setTimeout(() => { try { global.startBot?.(); } catch (_) {} }, 1500);
    } catch (e) { res.json({ ok: false, error: e.message }); }
  });

  // Bot control
  app.post("/api/control", async (req, res) => {
    const action = req.body?.action;
    try {
      if (action === "restart") {
        res.json({ ok: true });
        setTimeout(() => { try { global.startBot?.(); } catch (_) {} }, 500);
      } else if (action === "stop") {
        res.json({ ok: true });
        setTimeout(() => { process.exit(0); }, 500);
      } else {
        res.json({ ok: false, error: "action غير معروف" });
      }
    } catch (e) { res.json({ ok: false, error: e.message }); }
  });

  // Get commands list
  app.get("/api/commands", (req, res) => {
    const list = [];
    for (const [name, cmd] of (global.GoatBot?.commands || new Map())) {
      if (cmd?.config?.name?.toLowerCase() === name) {
        list.push({ name: cmd.config.name, aliases: cmd.config.aliases || [],
                    category: cmd.config.category || "other", role: cmd.config.role || 2,
                    description: cmd.config.description || "" });
      }
    }
    res.json({ ok: true, commands: list });
  });

  // Get messages log
  app.get("/api/messages", (req, res) => {
    res.json({ ok: true, messages: stats.messageLog.slice(-20).reverse() });
  });

  // Bot status
  app.get("/api/status", (req, res) => {
    const online = !!global.GoatBot?.fcaApi && !!global.GoatBot?.botID;
    res.json({ ok: true, online, botID: global.GoatBot?.botID || null });
  });

  // WebSocket
  _io.on("connection", (socket) => {
    socket.emit("stats-update", getStats());
    socket.emit("bot-status", {
      status:  global.GoatBot?.fcaApi ? "online" : "offline",
      message: global.GoatBot?.fcaApi ? `متصل ✔ (${global.GoatBot.botID})` : "غير متصل"
    });
    socket.on("ping-bot", () => socket.emit("pong-bot", { ts: Date.now() }));
  });

  // Serve dashboard for any path
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  _server.listen(port, "0.0.0.0", () => {
    console.log();
    console.log(chalk.cyan("  ╔══════════════════════════════════════════╗"));
    console.log(chalk.cyan(`  ║  🌐 لوحة التحكم: http://0.0.0.0:${port}     ║`));
    console.log(chalk.cyan("  ╚══════════════════════════════════════════╝"));
    console.log();
  });

  // Broadcast stats every 5s
  setInterval(() => {
    if (_io) _io.emit("stats-update", getStats());
  }, 5000);

  return { app, server: _server, io: _io };
}

module.exports = { startDashboard, getIO };
