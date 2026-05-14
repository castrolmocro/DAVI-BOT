/**
 * DAVID V1 — Human Read Receipt (Layer 3)
 * Copyright © DJAMEL
 */
"use strict";

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

module.exports = {
  start(api) {
    global._humanRead = async (threadID) => {
      await new Promise(r => setTimeout(r, rand(1500, 5000)));
      try { api.markAsRead?.(threadID, () => {}); } catch (_) {}
    };
  },
};
