/**
 * DAVID V1 — MQTT Health Check
 * Copyright © 2025 DJAMEL
 */
"use strict";

let _timer = null;
let _restartCount = 0;
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;

function getCfg() {
  const c = global.GoatBot?.config?.mqttHealthCheck || {};
  return {
    enable:        c.enable !== false,
    silentMs:      (c.silentTimeoutMinutes    || 10) * 60000,
    minMs:         (c.checkIntervalMinMinutes || 2)  * 60000,
    maxMs:         (c.checkIntervalMaxMinutes || 5)  * 60000,
    maxRestarts:   c.maxRestarts || 5,
    notifyAdmins:  c.notifyAdmins !== false,
  };
}

function notify(msg) {
  try {
    const api = global.GoatBot?.fcaApi;
    const ids  = [...(global.GoatBot?.config?.adminBot||[]), ...(global.GoatBot?.config?.superAdminBot||[])];
    if (!api) return;
    for (const id of ids) { try { api.sendMessage(msg, String(id)).catch(()=>{}); } catch(_) {} }
  } catch(_) {}
}

async function check() {
  const cfg = getCfg();
  if (!cfg.enable) return schedule();
  const api = global.GoatBot?.fcaApi;
  if (!api) return schedule();

  const last   = global.lastMqttActivity || global.GoatBot?.startTime || Date.now();
  const silent = Date.now() - last;

  if (silent < cfg.silentMs) { if (_restartCount > 0) _restartCount = 0; return schedule(); }
  if (global.isRelogining)   return schedule();

  if (_restartCount >= cfg.maxRestarts) {
    global.log?.error?.("MQTT_HEALTH", "تجاوز الحد الأقصى لإعادة الاتصال");
    return schedule();
  }

  _restartCount++;
  global.log?.warn?.("MQTT_HEALTH", `صمت ${Math.round(silent/60000)}m — إعادة تسجيل الدخول (#${_restartCount})`);
  if (cfg.notifyAdmins) notify(`⚠️ [DAVID V1] إعادة الاتصال التلقائية (#${_restartCount})`);

  try { await global.GoatBot?.reLoginBot?.(); } catch(_) {}
  schedule();
}

function schedule() {
  const cfg = getCfg();
  _timer = setTimeout(check, rand(cfg.minMs, cfg.maxMs));
}

function startHealthCheck() { if (!_timer) schedule(); }
function stopHealthCheck()  { if (_timer)  { clearTimeout(_timer); _timer = null; } }

module.exports = { startHealthCheck, stopHealthCheck, onMqttActivity: () => { global.lastMqttActivity = Date.now(); } };
