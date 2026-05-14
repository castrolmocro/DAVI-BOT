/**
 * DAVID V1 — MQTT Health Check (Layer 12)
 * Copyright © DJAMEL
 */
"use strict";

let _timer = null;
let _lastActivity = Date.now();
const STALE_LIMIT = 8 * 60_000;

module.exports = {
  onMqttActivity() { _lastActivity = Date.now(); },

  startHealthCheck() {
    clearInterval(_timer);
    _timer = setInterval(() => {
      const stale = Date.now() - _lastActivity > STALE_LIMIT;
      if (stale) {
        try { global.log?.warn("MQTT stale — restarting bot"); } catch (_) {}
        setTimeout(() => process.exit(1), 2000);
      }
    }, 5 * 60_000);
  },

  stopHealthCheck() { clearInterval(_timer); _timer = null; },
};
