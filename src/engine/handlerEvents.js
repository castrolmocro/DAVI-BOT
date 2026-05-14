/**
 * DAVID V1 — Event Handler (GoatBot Compatible)
 * Copyright © DJAMEL
 */
"use strict";

const { check: rateCheck } = require("../protection/rateLimit");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRole(senderID) {
  const cfg = global.GoatBot?.config || {};
  const sid = String(senderID);
  const admins     = (cfg.adminBot      || []).map(String);
  const superAdmins = (cfg.superAdminBot || [cfg.ownerID]).map(String);
  if (superAdmins.includes(sid) || sid === String(cfg.ownerID)) return 3;
  if (admins.includes(sid)) return 2;
  return 0;
}

function isAdminOnly() {
  return global.GoatBot?.config?.adminOnly?.enable === true;
}

function buildMessage(api, event) {
  return {
    reply: async (msg, cb) => {
      const delay = global.utils?.calcHumanTypingDelay?.(
        typeof msg === "string" ? msg : msg?.body || ""
      ) || 1200;
      await global.utils?.simulateTyping?.(api, event.threadID, delay);
      return api.sendMessage(msg, event.threadID, cb);
    },
    unsend: (mid, cb) => api.unsendMessage(mid || event.messageID, cb),
    react:  (emoji, mid, cb) => api.setMessageReaction(emoji, mid || event.messageID, () => {}, true),
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function handlerEvents(api, event, commands) {
  if (!event || !api) return;

  global.lastMqttActivity = Date.now();

  // ── handle reply callbacks ──────────────────────────────────────────────────
  if (event.type === "message_reply" || event.messageReply) {
    const replyMap = global.GoatBot?.onReply;
    if (replyMap?.size) {
      for (const [key, handler] of replyMap) {
        if (handler.messageID === event.messageReply?.messageID &&
            handler.author    === event.senderID) {
          try {
            await handler.callback({ api, event, message: buildMessage(api, event) });
          } catch (e) { global.log?.error?.("REPLY", e.message); }
          return;
        }
      }
    }
  }

  // ── only process message events ────────────────────────────────────────────
  if (event.type !== "message") return;
  if (!event.body) return;

  const senderID = String(event.senderID);
  const body     = event.body.trim();
  const prefix   = global.GoatBot?.config?.prefix || "/";

  // ── Admin-only mode ────────────────────────────────────────────────────────
  if (isAdminOnly() && getRole(senderID) < 2) return;

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const rateKey = `${event.threadID}:${senderID}`;
  const cfg     = global.GoatBot?.config?.rateLimit || {};
  const rateResult = rateCheck(rateKey, cfg.maxMessagesPerWindow || 5, cfg.windowMs || 8000);
  if (rateResult.exceeded) return;

  // ── Buffer for dashboard ───────────────────────────────────────────────────
  try {
    if (typeof global._bufferMsg === "function") {
      global._bufferMsg({ ...event, ts: Date.now() });
    }
    // Track for panel
    if (typeof global._trackMsg === "function") {
      global._trackMsg(event.threadID, senderID, body);
    }
  } catch (_) {}

  // ── Command detection ──────────────────────────────────────────────────────
  if (!body.startsWith(prefix)) return;

  const parts = body.slice(prefix.length).trim().split(/\s+/);
  const cmdName = parts[0]?.toLowerCase();
  const args    = parts.slice(1);

  if (!cmdName) return;

  const cmd = commands?.get(cmdName) || global.GoatBot?.commands?.get(cmdName);
  if (!cmd) return;

  // ── Permission check ────────────────────────────────────────────────────────
  const role     = getRole(senderID);
  const required = cmd.config?.role ?? 2;
  if (role < required) {
    try { await api.sendMessage("⛔ هذا الأمر للأدمن فقط.", event.threadID); } catch (_) {}
    return;
  }

  // ── Execute ─────────────────────────────────────────────────────────────────
  try {
    const ctx = {
      api, event, args,
      commandName: cmdName,
      message: buildMessage(api, event),
      prefix,
      role,
    };

    if (typeof cmd.onStart === "function") {
      await cmd.onStart(ctx);
    } else if (typeof cmd.run === "function") {
      await cmd.run(ctx);
    }
  } catch (e) {
    global.log?.error?.("HANDLER", `خطأ في أمر ${cmdName}: ${e.message}`);
    try { await api.sendMessage(`❌ خطأ في الأمر: ${e.message}`, event.threadID); } catch (_) {}
  }
}

module.exports = handlerEvents;
