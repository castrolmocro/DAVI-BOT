/**
 * DAVID V1 — /nick
 * Copyright © DJAMEL
 */
"use strict";

if (!global._nickActive) global._nickActive = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runNick(api, threadID, name) {
  global._nickActive.set(threadID, true);
  while (global._nickActive.get(threadID)) {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );
      for (const uid of (info?.participantIDs || [])) {
        if (!global._nickActive.get(threadID)) break;
        await new Promise(res => api.changeNickname(name, threadID, uid, () => res()));
        await sleep(800);
      }
    } catch (_) {}
    await sleep(30000);
  }
}

module.exports = {
  config: { name: "nick", aliases: ["nickname"], category: "admin" },
  async execute({ api, event, args, message }) {
    const { threadID } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "off" || sub === "stop") {
      global._nickActive.set(threadID, false);
      return message.reply("🔓 تم إلغاء قفل الكنيات.");
    }

    if (sub === "status") {
      return message.reply(global._nickActive.get(threadID)
        ? "🔒 قفل الكنيات نشط."
        : "💤 قفل الكنيات غير نشط.");
    }

    if (sub === "reset" || sub === "remove") {
      global._nickActive.set(threadID, false);
      try {
        const info = await new Promise((res, rej) =>
          api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
        );
        for (const uid of (info?.participantIDs || [])) {
          await new Promise(res => api.changeNickname("", threadID, uid, () => res()));
          await sleep(600);
        }
        return message.reply("✅ تم حذف جميع الكنيات.");
      } catch (e) { return message.reply(`❌ ${e.message}`); }
    }

    const name = args.join(" ").trim();
    if (!name) return message.reply("⚠️ اكتب اسم الكنية.\nمثال: /nick DAVID");

    global._nickActive.set(threadID, false);
    await sleep(500);
    runNick(api, threadID, name).catch(() => {});
    return message.reply(`🔒 بدأ قفل الكنيات!\nالاسم: "${name}"`);
  },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
