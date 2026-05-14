/**
 * DAVID V1 — /chats command
 * Manage bot chat settings (DM lock, angel status, etc.)
 * Copyright © DJAMEL
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

const DM_LOCK_PATH  = path.join(process.cwd(), "database/data/dmLock.json");
const ANGEL_PATH    = path.join(process.cwd(), "database/data/angelData.json");

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function getDmLocked() {
  try {
    if (fs.existsSync(DM_LOCK_PATH)) return JSON.parse(fs.readFileSync(DM_LOCK_PATH, "utf8")).locked;
  } catch (_) {}
  return false;
}

function setDmLocked(val) {
  global.GoatBot.dmLocked = !!val;
  fs.ensureDirSync(path.dirname(DM_LOCK_PATH));
  fs.writeFileSync(DM_LOCK_PATH, JSON.stringify({ locked: !!val }, null, 2));
}

function getAngelGroups() {
  try {
    if (fs.existsSync(ANGEL_PATH)) {
      const data = JSON.parse(fs.readFileSync(ANGEL_PATH, "utf8"));
      return Object.keys(data).length;
    }
  } catch (_) {}
  return 0;
}

module.exports = {
  config: {
    name:      "chats",
    aliases:   ["dm", "dmlock", "botinfo"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Manage bot chat & DM settings",
    longDescription:  "/chats — Show chat info\n/chats dmlock on/off — Lock/unlock DMs\n/chats stats — Show stats",
    guide: "{p}chats\n{p}chats dmlock on\n{p}chats dmlock off\n{p}chats stats",
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();
    const val = (args[1] || "").toLowerCase();

    if (sub === "dmlock") {
      if (val === "on" || val === "enable") {
        setDmLocked(true);
        return message.reply("🔒 DM Lock enabled. Only bot admins can message the bot in DMs.");
      }
      if (val === "off" || val === "disable") {
        setDmLocked(false);
        return message.reply("🔓 DM Lock disabled. Anyone can message the bot.");
      }
      const status = getDmLocked();
      return message.reply(`📩 DM Lock is currently: ${status ? "🔒 ON" : "🔓 OFF"}`);
    }

    if (sub === "stats") {
      const cmdCount  = global.GoatBot?.commands?.size || 0;
      const evtCount  = global.GoatBot?.eventCommands?.size || 0;
      const angelGroups = getAngelGroups();
      return message.reply(
        `📊 DAVID V1 Stats\n\n` +
        `📦 Commands: ${cmdCount}\n` +
        `📡 Events: ${evtCount}\n` +
        `👼 Angel Groups: ${angelGroups}\n` +
        `🔒 DM Lock: ${getDmLocked() ? "ON" : "OFF"}\n` +
        `🛡️ Protection: 20 Layers`
      );
    }

    // Default: show chat settings
    const dmLocked = getDmLocked();
    const cfg      = global.GoatBot?.config || {};
    const prefix   = cfg.prefix || "/";

    return message.reply(
      `💬 Chat Settings — DAVID V1\n\n` +
      `🔧 Prefix: ${prefix}\n` +
      `📩 DM Lock: ${dmLocked ? "🔒 ON" : "🔓 OFF"}\n` +
      `👑 Admin Only: ${cfg.adminOnly?.enable ? "✅ YES" : "❌ NO"}\n` +
      `🛡️ Protection: 20 Layers Active\n\n` +
      `Use ${prefix}chats dmlock on/off to toggle DM lock.`
    );
  },
};
