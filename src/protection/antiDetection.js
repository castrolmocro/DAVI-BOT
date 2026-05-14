/**
 * DAVID V1 — Anti-Detection (Layer 20)
 * Copyright © DJAMEL
 */
"use strict";

module.exports = {
  start() {
    // Randomize process title to avoid fingerprinting
    try { process.title = `node_${Math.random().toString(36).slice(2, 8)}`; } catch (_) {}
  },
};
