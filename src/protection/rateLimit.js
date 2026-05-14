/**
 * DAVID V1 — Rate Limit Store
 * Copyright © 2025 DJAMEL
 */
"use strict";
const store = new Map();

function check(key, maxEvents, windowMs) {
  const now = Date.now();
  if (!store.has(key)) store.set(key, { events: [], warned: false });
  const entry = store.get(key);
  entry.events = entry.events.filter(t => now - t < windowMs);
  entry.events.push(now);
  return { exceeded: entry.events.length > maxEvents, count: entry.events.length, warned: entry.warned };
}

function setWarned(key) { if (store.has(key)) store.get(key).warned = true; }
function reset(key)     { store.delete(key); }
function cleanup(wMs = 60000) {
  const now = Date.now();
  for (const [k, e] of store) {
    e.events = e.events.filter(t => now - t < wMs);
    if (!e.events.length) store.delete(k);
  }
}
setInterval(() => cleanup(5 * 60000), 5 * 60000);
module.exports = { check, setWarned, reset, cleanup };
