/**
 * DAVID V1 — Outgoing Message Throttle
 * 20-Layer Protection — Layer 7: Outgoing throttle
 * Copyright © DJAMEL
 */

"use strict";

const MIN_GAP_MS  = 800;
const MAX_GAP_MS  = 3_200;
const BURST_LIMIT = 6;
const BURST_COOL  = 30_000;

let queue       = [];
let processing  = false;
let burstCount  = 0;
let lastSent    = 0;
let coolUntil   = 0;

function randGap() {
  return Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS + 1)) + MIN_GAP_MS;
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const now = Date.now();
    if (now < coolUntil) {
      await new Promise(r => setTimeout(r, coolUntil - now));
    }
    const { fn, resolve, reject } = queue.shift();
    const wait = Math.max(0, lastSent + randGap() - Date.now());
    await new Promise(r => setTimeout(r, wait));
    burstCount++;
    if (burstCount >= BURST_LIMIT) {
      burstCount = 0;
      coolUntil  = Date.now() + BURST_COOL;
    }
    lastSent = Date.now();
    try { resolve(await fn()); } catch (e) { reject(e); }
  }
  processing = false;
}

module.exports = {
  throttle(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      processQueue();
    });
  },
  queueLength: () => queue.length,
};
