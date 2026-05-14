/**
 * DAVID V1 — /angel
 * Copyright © DJAMEL
 */
"use strict";

if (!global._angelTimers) global._angelTimers = new Map();

const MSGS = [
  "🌟 أنت أقوى مما تتخيل، استمر!",
  "💙 انشر الخير — لا شيء يكلف أقل من الابتسامة.",
  "🌈 كل يوم هو فرصة جديدة للتميز.",
  "✨ لديك القدرة على صنع الفرق.",
  "🕊️ السلام والمحبة لجميع أعضاء المجموعة.",
  "🌺 اليوم هو هدية — استثمره بذكاء.",
  "🦋 النمو يحدث خارج منطقة الراحة.",
  "⭐ إمكانياتك لا حدود لها.",
  "🌙 استرح جيداً وابدأ غداً بقوة أكبر.",
  "💪 النجاح يبدأ بالإيمان بنفسك.",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
  config: { name: "angel", aliases: [], category: "admin" },
  async execute({ api, event, args, message }) {
    const { threadID } = event;
    const sub = (args[0] || "start").toLowerCase();

    if (sub === "stop" || sub === "off") {
      const t = global._angelTimers.get(threadID);
      if (t) { clearInterval(t); global._angelTimers.delete(threadID); }
      return message.reply("🛑 تم إيقاف رسائل الملاك.");
    }

    if (sub === "status") {
      return message.reply(global._angelTimers.has(threadID)
        ? "👼 رسائل الملاك نشطة في هذه المجموعة."
        : "💤 رسائل الملاك غير نشطة.");
    }

    const minutes = parseInt(args[0]) || parseInt(args[1]) || 60;
    if (minutes < 1 || minutes > 1440) return message.reply("⚠️ الفاصل الزمني بين 1 و1440 دقيقة.");

    const existing = global._angelTimers.get(threadID);
    if (existing) clearInterval(existing);

    // Send first message immediately
    await api.sendMessage(`👼 رسالة الملاك:\n\n${rand(MSGS)}`, threadID);

    const timer = setInterval(() => {
      api.sendMessage(`👼 رسالة الملاك:\n\n${rand(MSGS)}`, threadID).catch(() => {});
    }, minutes * 60_000);

    global._angelTimers.set(threadID, timer);
    return message.reply(`✅ رسائل الملاك بدأت! كل ${minutes} دقيقة.`);
  },
};
