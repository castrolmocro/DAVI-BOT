/**
 * DAVID V1 — /nm (Name Manager) command
 * Lock and enforce group name on a schedule
 * Copyright © DJAMEL
 */

"use strict";

if (!global._nmIntervals) global._nmIntervals = new Map();
if (!global._nmLocks)     global._nmLocks     = new Map();

const intervals = global._nmIntervals;
const locks     = global._nmLocks;

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function randBetween(min, max) {
  if (min >= max) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getIntervalMs(lock) {
  const min = lock.minDelay ?? lock.delay ?? 30;
  const max = lock.maxDelay ?? min;
  return randBetween(min, max) * 1_000;
}

function stopInterval(threadID) {
  const t = intervals.get(threadID);
  if (t) { clearTimeout(t); intervals.delete(threadID); }
}

function startInterval(threadID, lock) {
  stopInterval(threadID);
  if (!lock?.enabled || !lock?.name) return;
  locks.set(threadID, lock);

  function schedule() {
    const delay = getIntervalMs(lock);
    const t = setTimeout(async () => {
      intervals.delete(threadID);
      const current = locks.get(threadID);
      if (!current?.enabled || !current?.name) return;
      const api = global.GoatBot?.fcaApi;
      if (!api) { schedule(); return; }
      try {
        await new Promise(res => api.setTitle(current.name, threadID, () => res()));
      } catch (_) {}
      schedule();
    }, delay);
    intervals.set(threadID, t);
  }

  schedule();
}

module.exports = {
  config: {
    name:      "nm",
    aliases:   ["namelock", "groupname"],
    version:   "1.0.0",
    author:    "DJAMEL",
    countDown: 5,
    role:      2,
    category:  "admin",
    shortDescription: "Lock the group name",
    longDescription:  "/nm [name] — Lock group name\n/nm off — Unlock\n/nm status — View status\n/nm time [s] — Set interval",
    guide: "{p}nm [name]\n{p}nm off\n{p}nm time [seconds]\n{p}nm status",
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, senderID } = event;

    if (!isBotAdmin(senderID)) {
      return message.reply("⛔ Only bot admins can use this command.");
    }

    const sub = (args[0] || "").toLowerCase();
    const tid = String(threadID);

    if (sub === "off" || sub === "stop" || sub === "unlock") {
      stopInterval(tid);
      locks.delete(tid);
      return message.reply("🔓 Name lock disabled.");
    }

    if (sub === "status") {
      const lock = locks.get(tid);
      if (!lock?.enabled) return message.reply("💤 Name lock is off.");
      return message.reply(
        `🔒 Name lock: ON\n📝 Name: "${lock.name}"\n⏱ Interval: ${lock.minDelay}–${lock.maxDelay}s`
      );
    }

    if (sub === "time") {
      const lock = locks.get(tid);
      if (!lock) return message.reply("⚠️ Start name lock first with /nm [name]");
      const min = parseInt(args[1]);
      const max = parseInt(args[2]) || min;
      if (!min || min < 5) return message.reply("⚠️ Minimum interval is 5 seconds.");
      lock.minDelay = min;
      lock.maxDelay = max;
      startInterval(tid, lock);
      return message.reply(`✅ Interval updated: ${min}–${max}s`);
    }

    // Lock name
    const name = args.join(" ").trim();
    if (!name) return message.reply("⚠️ Provide a group name.\nUsage: /nm [name]");

    const lock = { name, enabled: true, minDelay: 30, maxDelay: 60 };
    startInterval(tid, lock);

    // Apply immediately
    try {
      await new Promise(res => api.setTitle(name, tid, () => res()));
    } catch (_) {}

    return message.reply(`🔒 Name lock enabled!\n📝 Name: "${name}"\n⏱ Enforced every 30–60s`);
  },
};
