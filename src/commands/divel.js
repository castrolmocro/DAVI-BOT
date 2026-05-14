/**
 * DAVID V1 — /divel
 * Copyright © DJAMEL
 */
"use strict";

if (!global._divelWatchers) global._divelWatchers = new Map();

function stopWatcher(threadID) {
  const t = global._divelWatchers.get(threadID);
  if (t) { clearInterval(t); global._divelWatchers.delete(threadID); }
}

module.exports = {
  config: { name: "divel", aliases: [], category: "admin" },
  async execute({ api, event, args, message }) {
    const { threadID } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "stop" || sub === "off") {
      stopWatcher(threadID);
      return message.reply("🛑 تم إيقاف مراقبة المجموعة.");
    }

    if (sub === "status") {
      return message.reply(global._divelWatchers.has(threadID)
        ? "👁️ المراقبة نشطة في هذه المجموعة."
        : "💤 المراقبة غير نشطة.");
    }

    const name     = args.slice(1).join(" ").trim() || null;
    const minutes  = parseInt(args[0]) || 10;

    stopWatcher(threadID);

    const timer = setInterval(async () => {
      try {
        const info = await new Promise((res, rej) =>
          api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
        );
        if (name && info?.name !== name) {
          await new Promise(res => api.setTitle(name, threadID, () => res()));
        }
      } catch (_) {}
    }, minutes * 60_000);

    global._divelWatchers.set(threadID, timer);
    return message.reply(`✅ بدأت مراقبة المجموعة!\n📝 اسم مقفل: ${name || "لا"}\n⏱ فحص كل ${minutes} دقيقة.`);
  },
};
