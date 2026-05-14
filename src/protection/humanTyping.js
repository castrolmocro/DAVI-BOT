/**
 * DAVID V1 — Human Typing Wrapper (Layer 10)
 * Copyright © DJAMEL
 */
"use strict";

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  wrapWithTyping(api) {
    const original = api.sendMessage.bind(api);
    api.sendMessage = function(msg, threadID, callback, msgID) {
      const body = typeof msg === "string" ? msg : (msg?.body || "");
      const words = body.split(/\s+/).length;
      const delay = Math.min(Math.max(words * rand(60, 120), 800), 6000);

      sleep(rand(200, 600)).then(() => {
        try {
          const stop = api.sendTypingIndicator?.(threadID);
          return sleep(delay).then(() => {
            if (typeof stop === "function") stop();
            if (msgID) original(msg, threadID, callback, msgID);
            else       original(msg, threadID, callback);
          });
        } catch (_) {
          if (msgID) original(msg, threadID, callback, msgID);
          else       original(msg, threadID, callback);
        }
      });
    };
  },
};
