/**
 * DAVID V1 — Event Handler (DjamelBot)
 * يتجاهل جميع رسائل غير الأدمن كلياً — لا يرد
 * Copyright © DJAMEL
 */

"use strict";

const chalk  = require("chalk");
const moment = require("moment-timezone");
const { getOrCreateUser, getOrCreateThread, logCommand } = require("../utils/database");

// ─── Spam map (للأدمن فقط — من الأحداث الأخرى) ──────────────────────────────
const _spamMap = new Map();
const SPAM_LIM = 12;
const SPAM_WIN = 10000;

function checkSpam(senderID) {
  const now = Date.now();
  let e = _spamMap.get(senderID);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + SPAM_WIN }; }
  e.count++;
  _spamMap.set(senderID, e);
  return e.count > SPAM_LIM;
}

// ─── Logger ───────────────────────────────────────────────────────────────────
const tz = () => global.config?.timezone || "Africa/Algiers";
const ts = () => moment().tz(tz()).format("HH:mm:ss");

function logMsg(senderID, threadID, body, isGroup, isCmd) {
  const icon   = isGroup ? chalk.blue("👥") : chalk.green("💬");
  const who    = chalk.bold.cyan(senderID);
  const where  = isGroup ? chalk.bold.blue(`[${threadID}]`) : chalk.bold.green("DM");
  const pre    = isCmd ? chalk.magenta("⚡ ") : "";
  console.log(`${chalk.gray(ts())} ${icon} ${where} ← ${who}: ${pre}${chalk.white(String(body||"").slice(0,100))}`);
}

// ─── Duplicate message guard ──────────────────────────────────────────────────
const _seen = new Set();
function isDuplicate(msgID) {
  if (!msgID) return false;
  if (_seen.has(msgID)) return true;
  _seen.add(msgID);
  if (_seen.size > 3000) { const arr = [..._seen]; _seen.clear(); arr.slice(-1500).forEach(m => _seen.add(m)); }
  return false;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
module.exports = async function handlerEvents(api, event, commands) {
  if (!event) return;

  // Dedup
  if (event.messageID && isDuplicate(event.messageID)) return;

  const { type, senderID, threadID, body = "", attachments = [] } = event;
  const botUID = api.getCurrentUserID();

  // Ignore own messages
  if (String(senderID) === String(botUID)) return;

  // ── STRICT ADMIN CHECK ────────────────────────────────────────────────────
  // If sender is NOT an admin/owner → COMPLETELY IGNORE, no reply, no log
  if (!global.isAdmin(senderID) && !global.isOwner(senderID)) {
    // Silently drop — no response whatsoever
    return;
  }

  // Below this point: only admins/owners are processed ─────────────────────

  global._lastActivity = Date.now();

  // Notify MQTT health check
  try { require("../protection/mqttHealthCheck").onMqttActivity(); } catch (_) {}

  // Live dashboard broadcast
  try {
    const io = require("../dashboard/server").getIO();
    if (io && global._bufferMsg) {
      const entry = { senderID, threadID, body: String(body).slice(0, 200), ts: Date.now(), type };
      global._bufferMsg(entry);
      io.emit("message", entry);
    }
  } catch (_) {}

  const prefix    = global.commandPrefix || "/";
  const isGroup   = event.isGroup ?? (threadID !== senderID);
  const isMessage = type === "message" || type === "message_reply";

  // ── Spam check (even for admins) ──────────────────────────────────────────
  if (isMessage && checkSpam(senderID)) return;

  // ── Handle group events (non-message) ────────────────────────────────────
  if (!isMessage) {
    // Log event type
    console.log(`${chalk.gray(ts())} ${chalk.yellow("⚡")} ${chalk.yellow(type)} @ ${chalk.cyan(threadID)}`);
    return;
  }

  // ── Database sync ─────────────────────────────────────────────────────────
  try { await getOrCreateUser(senderID); } catch (_) {}
  try { await getOrCreateThread(threadID); } catch (_) {}

  // ── Command routing ───────────────────────────────────────────────────────
  const trimmedBody = String(body).trim();
  const isCmd       = trimmedBody.startsWith(prefix);

  logMsg(senderID, threadID, trimmedBody, isGroup, isCmd);

  if (!isCmd) return; // Not a command — ignore (no reply)

  const parts       = trimmedBody.slice(prefix.length).trim().split(/\s+/);
  const cmdName     = (parts[0] || "").toLowerCase();
  const args        = parts.slice(1);

  if (!cmdName) return;

  const cmd = commands.get(cmdName);
  if (!cmd) return; // Unknown command — ignore silently

  // ── Build message helpers ─────────────────────────────────────────────────
  const message = {
    reply: (msg) => new Promise((res, rej) =>
      api.sendMessage(typeof msg === "string" ? { body: msg } : msg, threadID,
        (err, info) => err ? rej(err) : res(info), event.messageID)
    ),
    send: (msg) => new Promise((res, rej) =>
      api.sendMessage(typeof msg === "string" ? { body: msg } : msg, threadID,
        (err, info) => err ? rej(err) : res(info))
    ),
    react: (emoji) => new Promise((res) =>
      api.setMessageReaction(emoji, event.messageID, () => res(), true)
    ),
    unsend: (msgID) => new Promise((res) =>
      api.unsendMessage(msgID, () => res())
    ),
  };

  // ── Execute ───────────────────────────────────────────────────────────────
  try {
    await cmd.execute({ api, event, args, prefix, message, commands });
    try { await logCommand(senderID, threadID, cmdName, args, true); } catch (_) {}
  } catch (e) {
    log.error(`/${cmdName}: ${e.message}`);
    try { await logCommand(senderID, threadID, cmdName, args, false); } catch (_) {}
    try { await message.reply(`❌ خطأ: ${e.message}`); } catch (_) {}
  }
};
