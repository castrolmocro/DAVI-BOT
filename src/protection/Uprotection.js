/**
 * DAVID V1 — Universal Protection Wrapper
 * Copyright © 2025 DJAMEL
 * طبقة حماية شاملة: Anti-Bot Detection, Session Guard, Flood Control
 */
"use strict";

let _api = null;
let _sendCount = 0;
let _sendWindow = Date.now();
const MAX_SENDS = 30;
const WINDOW_MS = 60000;

function start(api) {
  _api = api;
  // Reset send counter every minute
  setInterval(() => { _sendCount = 0; _sendWindow = Date.now(); }, WINDOW_MS);
}

// يُستدعى قبل كل إرسال للتحقق من عدم تجاوز الحد
function preSend() {
  _sendCount++;
  if (_sendCount > MAX_SENDS) {
    global.log?.warn?.("U_PROTECT", `⚠️ Send rate high: ${_sendCount}/${MAX_SENDS}`);
    return false;
  }
  return true;
}

module.exports = { start, preSend };
