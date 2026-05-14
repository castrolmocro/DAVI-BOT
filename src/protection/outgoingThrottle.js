/**
 * DAVID V1 — Outgoing Message Throttle (Layer 7)
 * Copyright © DJAMEL
 */
"use strict";

const MIN_GAP = 700;
const MAX_GAP = 2500;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

let _queue = [], _running = false;

function enqueue(fn) {
  return new Promise((res, rej) => {
    _queue.push({ fn, res, rej });
    if (!_running) process();
  });
}

async function process() {
  _running = true;
  while (_queue.length > 0) {
    const { fn, res, rej } = _queue.shift();
    const gap = rand(MIN_GAP, MAX_GAP);
    await new Promise(r => setTimeout(r, gap));
    try { res(await fn()); } catch (e) { rej(e); }
  }
  _running = false;
}

module.exports = {
  throttle: (fn) => enqueue(fn),
  wrapSendMessage(api) {
    const original = api.sendMessage.bind(api);
    api.sendMessage = function (msg, threadID, callback, msgID) {
      enqueue(() => new Promise((res, rej) => {
        const cb = (err, info) => { if (err) rej(err); else res(info); if (callback) callback(err, info); };
        if (msgID) original(msg, threadID, cb, msgID);
        else       original(msg, threadID, cb);
      })).catch(() => {});
    };
  },
};
