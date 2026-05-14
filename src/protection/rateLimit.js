/**
 * DAVID V1 — Rate Limiter (Layer 6)
 * Copyright © DJAMEL
 */
"use strict";

const _map     = new Map();
const _warned  = new Set();

function check(key, limit, windowMs) {
  const now = Date.now();
  let e = _map.get(key);
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + windowMs }; }
  e.count++;
  _map.set(key, e);
  return { exceeded: e.count > limit, warned: _warned.has(key), count: e.count };
}

function setWarned(key) { _warned.add(key); }
function reset(key) { _map.delete(key); _warned.delete(key); }

module.exports = { check, setWarned, reset };
