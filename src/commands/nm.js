/**
 * DAVID V1 — /nm (Name Manager)
 * Copyright © DJAMEL
 */
"use strict";

if (!global._nmTimers) global._nmTimers = new Map();
if (!global._nmConfigs) global._nmConfigs = new Map();

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function stopNm(threadID) {
  const t = global._nmTimers.get(threadID);
  if (t) { clearTimeout(t); global._nmTimers.delete(threadID); }
}

function scheduleNm(api, threadID) {
  stopNm(threadID);
  const cfg = global._nmConfigs.get(threadID);
  if (!cfg?.enabled) return;
  const delay = rand(cfg.minDelay || 30, cfg.maxDelay || 60) * 1000;
  const t = setTimeout(async () => {
    try { await new Promise(res => api.setTitle(cfg.name, threadID, () => res())); } catch (_) {}
    scheduleNm(api, threadID);
  }, delay);
  global._nmTimers.set(threadID, t);
}

module.exports = {
  config: { name: "nm", aliases: ["namelock", "groupname"], category: "admin" },
  async execute({ api, event, args, message }) {
    const { threadID } = event;
    const sub = (args[0] || "").toLowerCase();

    if (sub === "off" || sub === "stop" || sub === "unlock") {
      stopNm(threadID);
      global._nmConfigs.delete(threadID);
      return message.reply("🔓 تم إلغاء قفل اسم المجموعة.");
    }

    if (sub === "status") {
      const cfg = global._nmConfigs.get(threadID);
      if (!cfg?.enabled) return message.reply("💤 قفل الاسم غير نشط.");
      return message.reply(`🔒 قفل الاسم نشط\n📝 الاسم: "${cfg.name}"\n⏱ كل ${cfg.minDelay}–${cfg.maxDelay}ث`);
    }

    if (sub === "time") {
      const cfg = global._nmConfigs.get(threadID);
      if (!cfg) return message.reply("⚠️ شغّل قفل الاسم أولاً.");
      const min = parseInt(args[1]); const max = parseInt(args[2]) || min;
      if (!min || min < 5) return message.reply("⚠️ الحد الأدنى 5 ثوان.");
      cfg.minDelay = min; cfg.maxDelay = max;
      scheduleNm(api, threadID);
      return message.reply(`✅ الفاصل الزمني: ${min}–${max}ث`);
    }

    const name = args.join(" ").trim();
    if (!name) return message.reply("⚠️ اكتب اسم المجموعة.\nمثال: /nm اسم المجموعة");

    const cfg = { name, enabled: true, minDelay: 30, maxDelay: 60 };
    global._nmConfigs.set(threadID, cfg);
    scheduleNm(api, threadID);

    try { await new Promise(res => api.setTitle(name, threadID, () => res())); } catch (_) {}
    return message.reply(`🔒 قفل الاسم بدأ!\n📝 الاسم: "${name}"\n⏱ كل 30–60 ثانية`);
  },
};
