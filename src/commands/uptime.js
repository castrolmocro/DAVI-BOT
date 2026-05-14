/**
 * DAVID V1 — /uptime
 * Copyright © DJAMEL
 */
"use strict";

const os = require("os");

function fmt(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sc = Math.floor(s % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${sc}s`].filter(Boolean).join(" ");
}
function fmtBytes(b) {
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b/1048576).toFixed(1)} MB`;
  return `${(b/1073741824).toFixed(2)} GB`;
}

module.exports = {
  config: { name: "uptime", aliases: ["up", "ping", "status"], category: "admin" },
  async execute({ message }) {
    const mem = process.memoryUsage();
    const sys = { total: os.totalmem(), free: os.freemem() };
    const cpu = os.cpus()[0]?.model?.trim() || "Unknown";
    const cmds = global.commands?.size || 0;

    await message.reply(
`╔══ 🤖 DAVID V1 STATUS ══╗

⏱️ Uptime:      ${fmt(process.uptime())}
🏠 Host:        ${os.hostname()}
💻 Platform:    ${os.platform()} ${os.arch()}
⚙️  CPU:         ${cpu.slice(0, 30)}

🧠 Heap:        ${fmtBytes(mem.heapUsed)} / ${fmtBytes(mem.heapTotal)}
🖥️  RAM:         ${fmtBytes(sys.total - sys.free)} / ${fmtBytes(sys.total)}

📦 Commands:    ${cmds}
🛡️  Protection:  16 Systems Active
👑 Developer:   DJAMEL

╚═════════════════════════╝`
    );
  },
};
