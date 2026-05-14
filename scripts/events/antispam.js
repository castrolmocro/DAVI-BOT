/**
 * DAVID V1 — Anti-Spam Event (Layer 17)
 * Copyright © DJAMEL
 */

"use strict";

const { check, setWarned, reset } = require("../../bot/protection/rateLimit.js");

const SPAM_THRESHOLD = 20;
const SPAM_WINDOW    = 30_000;
const warnedUsers    = new Set();

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

function isDuplicateMessage(body, senderID) {
  if (!body || body.length < 5) return false;
  const key = `dup:${senderID}:${body.slice(0, 50)}`;
  const result = check(key, 3, 10_000);
  return result.exceeded;
}

module.exports = {
  config: {
    name:      "antispam",
    eventType: ["message"],
    version:   "1.0.0",
    author:    "DJAMEL",
  },

  onEvent: async function ({ api, event }) {
    const { threadID, senderID, body = "" } = event;
    if (!threadID || !senderID) return;
    if (isBotAdmin(senderID)) return;

    const key    = `spam:${senderID}`;
    const result = check(key, SPAM_THRESHOLD, SPAM_WINDOW);

    if (result.exceeded && !warnedUsers.has(senderID)) {
      warnedUsers.add(senderID);
      await api.sendMessage(
        "🚫 Spam detected. Please reduce your message frequency.",
        threadID
      ).catch(() => {});
      setTimeout(() => {
        warnedUsers.delete(senderID);
        reset(key);
      }, 60_000);
    }

    if (isDuplicateMessage(body, senderID)) {
      // silently ignore duplicate messages
    }
  },
};
