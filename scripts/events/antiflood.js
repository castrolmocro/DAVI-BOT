/**
 * DAVID V1 — Anti-Flood Event (Layer 16)
 * Copyright © DJAMEL
 */

"use strict";

const { check, setWarned, reset } = require("../../bot/protection/rateLimit.js");

const FLOOD_THRESHOLD = 8;
const FLOOD_WINDOW    = 6_000;
const MUTE_DURATION   = 30_000;
const muteTimers      = new Map();

function isBotAdmin(uid) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(uid));
}

module.exports = {
  config: {
    name:     "antiflood",
    eventType: ["message"],
    version:  "1.0.0",
    author:   "DJAMEL",
  },

  onEvent: async function ({ api, event }) {
    const { threadID, senderID } = event;
    if (!threadID || !senderID) return;
    if (!event.isGroup) return;
    if (isBotAdmin(senderID)) return;

    const key    = `flood:${threadID}:${senderID}`;
    const result = check(key, FLOOD_THRESHOLD, FLOOD_WINDOW);

    if (result.exceeded && !result.warned) {
      setWarned(key);
      await api.sendMessage(
        `⚠️ @${senderID} You are sending messages too fast! Please slow down or you will be temporarily muted.`,
        threadID
      ).catch(() => {});
    } else if (result.exceeded && result.warned && !muteTimers.has(`${threadID}:${senderID}`)) {
      try {
        const muteKey = `${threadID}:${senderID}`;
        muteTimers.set(muteKey, true);
        setTimeout(() => {
          muteTimers.delete(muteKey);
          reset(key);
        }, MUTE_DURATION);
      } catch (_) {}
    }
  },
};
