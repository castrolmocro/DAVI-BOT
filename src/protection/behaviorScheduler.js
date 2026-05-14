/**
 * DAVID V1 — Behavior Scheduler (Layer 4 - Sleep Mode)
 * Copyright © DJAMEL
 */
"use strict";

let _timer = null;

module.exports = {
  start() {
    clearInterval(_timer);
    _timer = setInterval(() => {
      const hour = new Date().getHours();
      const cfg  = global.config?.stealth || {};
      const s    = cfg.sleepStart ?? 1;
      const e    = cfg.sleepEnd   ?? 7;
      if (hour >= s && hour < e) {
        global.djamelbot = global.djamelbot || {};
        global.djamelbot.sleeping = true;
      } else {
        if (global.djamelbot) global.djamelbot.sleeping = false;
      }
    }, 60_000);
  },
  stop() { clearInterval(_timer); _timer = null; },
};
