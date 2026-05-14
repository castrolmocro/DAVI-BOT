/**
 * DAVID V1 — Natural Presence Simulation (Layer 2)
 * Copyright © DJAMEL
 */
"use strict";

let _timer = null;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

module.exports = {
  start(api) {
    clearInterval(_timer);
    _timer = setInterval(() => {
      try {
        if (api?.setPresenceStatus) {
          const states = ["active", "active", "active", "idle"];
          api.setPresenceStatus(states[rand(0, states.length - 1)]);
        }
      } catch (_) {}
    }, rand(12, 25) * 60_000);
  },
  stop() { clearInterval(_timer); _timer = null; },
};
