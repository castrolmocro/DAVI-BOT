/**
 * DAVID V1 — /uptime command
 * Shows bot uptime, system stats, and bot info
 * Copyright © DJAMEL
 */

"use strict";

const os   = require("os");
const path = require("path");

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function getCPU() {
  const cpus = os.cpus();
  return `${cpus[0]?.model?.trim() || "Unknown"} (${cpus.length} cores)`;
}

module.exports = {
  config: {
    name:      "uptime",
    aliases:   ["up", "ping", "status"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Show bot uptime and system stats",
    longDescription:  "Displays bot uptime, memory usage, CPU info, and system details.",
    guide: "{p}uptime",
  },

  onStart: async function ({ api, event, args, message }) {
    const { senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const uptimeSeconds = process.uptime();
    const mem           = process.memoryUsage();
    const totalMem      = os.totalmem();
    const freeMem       = os.freemem();
    const usedMem       = totalMem - freeMem;
    const cfg           = global.GoatBot?.config || {};
    const cmdCount      = global.GoatBot?.commands?.size || 0;
    const evtCount      = global.GoatBot?.eventCommands?.size || 0;

    const msg = [
      `╔══ 🤖 DAVID V1 STATUS ══╗`,
      ``,
      `⏱ Uptime:      ${formatUptime(uptimeSeconds)}`,
      `🏠 Hostname:    ${os.hostname()}`,
      `💻 Platform:    ${os.platform()} ${os.arch()}`,
      `⚙️  CPU:         ${getCPU()}`,
      ``,
      `🧠 RAM (Heap):  ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
      `🖥️  RAM (System): ${formatBytes(usedMem)} / ${formatBytes(totalMem)}`,
      ``,
      `📦 Commands:    ${cmdCount}`,
      `📡 Events:      ${evtCount}`,
      `🛡️  Protection:  20 Layers Active`,
      `👑 Author:      DJAMEL`,
      ``,
      `╚══════════════════════════╝`,
    ].join("\n");

    return message.reply(msg);
  },
};
