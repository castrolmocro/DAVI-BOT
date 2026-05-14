/**
 * DAVID V1 — MQTT Health Check (Layer 12)
 * Copyright © DJAMEL
 */

"use strict";

const INTERVAL_MS   = 5 * 60_000;
const STALE_LIMIT   = 8 * 60_000;

let timer       = null;
let lastMsgTime = Date.now();

function log(level, msg) {
  const l = global.utils?.log;
  if (level === "info") return l?.info("MQTT_HEALTH", msg);
  if (level === "warn") return l?.warn("MQTT_HEALTH", msg);
}

module.exports = {
  markActivity() {
    lastMsgTime = Date.now();
  },

  start(api, onStale) {
    clearInterval(timer);
    timer = setInterval(async () => {
      const stale = Date.now() - lastMsgTime > STALE_LIMIT;
      if (stale) {
        log("warn", "MQTT appears stale — connection may be dead");
        if (typeof onStale === "function") {
          try { await onStale(api); } catch (_) {}
        }
      } else {
        log("info", "MQTT connection healthy");
      }
    }, INTERVAL_MS);
  },

  stop() {
    clearInterval(timer);
  },
};
