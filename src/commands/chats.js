/**
 * DAVID V1 — /chats
 * Copyright © DJAMEL
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const DM_PATH = path.join(__dirname, "../../data/dmLock.json");

function getDmLocked() {
  try { return fs.existsSync(DM_PATH) ? JSON.parse(fs.readFileSync(DM_PATH)).locked : false; } catch { return false; }
}
function setDmLocked(v) {
  fs.ensureDirSync(path.dirname(DM_PATH));
  fs.writeFileSync(DM_PATH, JSON.stringify({ locked: !!v }));
}

module.exports = {
  config: { name: "chats", aliases: ["dm", "dmlock"], category: "admin" },
  async execute({ args, message }) {
    const sub = (args[0] || "").toLowerCase();
    const val = (args[1] || "").toLowerCase();

    if (sub === "dmlock") {
      if (val === "on" || val === "enable") { setDmLocked(true); return message.reply("🔒 DM Lock مُفعَّل. فقط الأدمن يمكنهم مراسلة البوت."); }
      if (val === "off" || val === "disable") { setDmLocked(false); return message.reply("🔓 DM Lock مُعطَّل."); }
      return message.reply(`📩 DM Lock: ${getDmLocked() ? "🔒 ON" : "🔓 OFF"}`);
    }

    const cmds = global.commands?.size || 0;
    const cfg  = global.config || {};
    return message.reply(
`💬 إعدادات البوت — DAVID V1

🔧 Prefix:    ${cfg.prefix || "/"}
📩 DM Lock:   ${getDmLocked() ? "🔒 ON" : "🔓 OFF"}
👑 Admins:    ${(cfg.adminIDs || []).length}
📦 Commands:  ${cmds}
🛡️  Protection: 16 Systems
👑 Developer: DJAMEL`
    );
  },
};
