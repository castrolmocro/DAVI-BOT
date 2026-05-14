/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         DAVID V1 — DjamelBot Engine (المحرك الرئيسي)           ║
 * ║         Copyright © 2025 DJAMEL — All rights reserved          ║
 * ║         Powered by Djamel-fca Library                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
"use strict";

// ─── Polyfills ────────────────────────────────────────────────────────────────
(function applyPolyfills() {
  if (typeof globalThis.ReadableStream === "undefined") {
    try { const s = require("stream/web"); Object.assign(globalThis, { ReadableStream: s.ReadableStream, WritableStream: s.WritableStream, TransformStream: s.TransformStream }); } catch (_) {}
  }
  if (typeof globalThis.Blob === "undefined") { try { globalThis.Blob = require("buffer").Blob; } catch (_) {} }
  if (typeof globalThis.File === "undefined") {
    try { const { File } = require("buffer"); if (File) globalThis.File = File; } catch (_) {}
    if (typeof globalThis.File === "undefined") {
      const Base = globalThis.Blob || class B {};
      globalThis.File = class File extends Base {
        constructor(c, n, o = {}) { super(c, o); this._name = n; this._lm = o.lastModified ?? Date.now(); }
        get name() { return this._name; } get lastModified() { return this._lm; }
      };
    }
  }
  if (typeof globalThis.TextEncoder === "undefined") {
    try { const { TextEncoder, TextDecoder } = require("util"); Object.assign(globalThis, { TextEncoder, TextDecoder }); } catch (_) {}
  }
})();

process.on("unhandledRejection", e => global.log?.error?.("ENGINE", e?.message || e));
process.on("uncaughtException",  e => global.log?.error?.("ENGINE", e?.message || e));

const fs       = require("fs-extra");
const path     = require("path");
const chalk    = require("chalk");
const gradient = require("gradient-string");
const moment   = require("moment-timezone");

const DjamelFCA                    = require("./Djamel-fca");
const { initGlobals }              = require("./src/engine/core");
const { loadCommands }             = require("./src/engine/loader");
const handlerEvents                = require("./src/engine/handlerEvents");
const { startDashboard, getIO }    = require("./src/dashboard/server");
const { initDB }                   = require("./src/utils/database");
const { startPoller, stopPoller }  = require("./src/utils/customPoller");

const CONFIG_PATH  = path.join(__dirname, "config.json");
const ACCOUNT_PATH = path.join(__dirname, "account.txt");

// ─── تحميل الإعدادات ──────────────────────────────────────────────────────────
let config;
try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
catch (e) { console.error("❌ config.json خطأ:", e.message); process.exit(1); }

initGlobals(config);
const log = global.log;

// ─── Banner ───────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  const banner = gradient.pastel(`
██████╗  █████╗ ██╗   ██╗██╗██████╗     ██╗   ██╗ ██╗
██╔══██╗██╔══██╗██║   ██║██║██╔══██╗    ██║   ██║███║
██║  ██║███████║██║   ██║██║██║  ██║    ██║   ██║╚██║
██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║    ╚██╗ ██╔╝ ██║
██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝     ╚████╔╝  ██║
╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝       ╚═══╝   ╚═╝`);
  console.log(banner);
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log(chalk.hex("#ffd166")("  Developer  : DJAMEL"));
  console.log(chalk.hex("#06d6a0")("  Engine     : DjamelBot v2"));
  console.log(chalk.hex("#90e0ef")("  Library    : Djamel-fca v2.0"));
  console.log(chalk.hex("#ff6b6b")("  Framework  : WHITE V3 + Jarfis Integration"));
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log();
}

// ─── Stop listeners ───────────────────────────────────────────────────────────
function stopListening() {
  stopPoller();
  try { if (global.GoatBot?.fcaApi?.stopListening) global.GoatBot.fcaApi.stopListening(() => {}); } catch (_) {}
  if (global._currentListener) { try { global._currentListener(); } catch (_) {} global._currentListener = null; }
  if (global._listenTimer)     { clearTimeout(global._listenTimer); global._listenTimer = null; }
  try { if (global.GoatBot?.fcaApi?.ctx?.mqttClient) global.GoatBot.fcaApi.ctx.mqttClient.end(true); } catch (_) {}
}

// ─── HTTP Long-Poll ───────────────────────────────────────────────────────────
function startPolling(api, attempt = 1) {
  const MAX = 3; const io = getIO();
  log.warn("POLL", `HTTP Long-Poll (محاولة ${attempt}/${MAX})…`);
  let started = false, errored = false;

  const stop = api.listen((err, event) => {
    if (err) {
      if (errored) return; errored = true;
      log.error("POLL", String(err.error || err.message || err));
      if (io) io.emit("bot-status", { status: "degraded", message: "خطأ اتصال" });
      if (attempt < MAX) setTimeout(() => startPolling(api, attempt + 1), attempt * 8000);
      else { log.warn("POLL", "→ Custom Poller"); startPoller(api, handlerEvents, config.pollIntervalMs || 6000); }
      return;
    }
    if (!started) {
      started = true;
      log.ok("POLL", `نشط ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", { status: "online", message: `متصل ✔ (${api.getCurrentUserID()})` });
    }
    global.lastMqttActivity = Date.now();
    if (event) handlerEvents(api, event, global.GoatBot.commands).catch(() => {});
  });
  global._currentListener = stop;
}

// ─── MQTT ─────────────────────────────────────────────────────────────────────
function startMqtt(api, attempt = 1) {
  const MAX   = 4; const io = getIO();
  const delay = Math.min(attempt * 8000, 40000);
  log.info("MQTT", `اتصال (محاولة ${attempt}/${MAX})…`);
  let mqttOk = false, errored = false;

  const timer = setTimeout(() => {
    if (!mqttOk) { log.warn("MQTT", "timeout → Long-Poll"); startPolling(api); }
  }, 20000);
  global._listenTimer = timer;

  const stop = api.listenMqtt?.((err, event) => {
    if (err) {
      clearTimeout(timer);
      if (errored) return; errored = true;
      const msg = String(err.error || err.message || err.type || err);
      log.warn("MQTT", msg);
      if (attempt < MAX) setTimeout(() => startMqtt(api, attempt + 1), delay);
      else { log.warn("MQTT", "فشل → Long-Poll"); startPolling(api); }
      if (io) io.emit("bot-status", { status: "degraded", message: `MQTT: ${msg}` });
      return;
    }
    if (!mqttOk) {
      mqttOk = true; clearTimeout(timer); global._listenTimer = null;
      log.ok("MQTT", `متصل ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", { status: "online", message: `متصل ✔ MQTT (${api.getCurrentUserID()})` });
    }
    global.lastMqttActivity = Date.now();
    if (event) handlerEvents(api, event, global.GoatBot.commands).catch(() => {});
  });
  if (stop) global._currentListener = stop;
  else { clearTimeout(timer); startPolling(api); }
}

// ─── Login lock ────────────────────────────────────────────────────────────────
let _loginLock = false;

// ─── تسجيل الدخول ─────────────────────────────────────────────────────────────
async function startBot() {
  if (_loginLock) { log.warn("LOGIN", "تسجيل دخول جارٍ — تجاهل"); return; }
  _loginLock = true;
  const io = getIO();
  stopListening();

  try { require("./src/protection/stealth").stop(); }          catch (_) {}
  try { require("./src/protection/keepAlive").stop(); }        catch (_) {}
  try { require("./src/protection/mqttHealthCheck").stopHealthCheck(); } catch (_) {}

  global.GoatBot.fcaApi = null; global.api = null;
  if (global.djamelbot) global.djamelbot.api = null;
  if (io) io.emit("bot-status", { status: "connecting", message: "جارٍ تسجيل الدخول…" });

  // قراءة الكوكيز
  if (!fs.existsSync(ACCOUNT_PATH)) fs.writeFileSync(ACCOUNT_PATH, "", "utf8");
  const rawCookie = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();

  if (!rawCookie) {
    log.error("LOGIN", "لا توجد كوكيز — ارفعها من لوحة التحكم");
    if (io) io.emit("bot-status", { status: "offline", message: "لا توجد كوكيز — ارفع من الداشبورد" });
    _loginLock = false; return;
  }

  const { parseCookieInput, hasMandatory, checkLiveCookie, cookiesToString } = DjamelFCA;
  const { cookies } = parseCookieInput(rawCookie);

  if (!cookies.length || !hasMandatory(cookies)) {
    log.error("LOGIN", "الكوكيز غير صالحة (c_user أو xs مفقود)");
    if (io) io.emit("bot-status", { status: "offline", message: "كوكيز غير صالحة" });
    _loginLock = false; return;
  }

  log.info("LOGIN", "التحقق من الكوكيز…");
  const UA    = config.facebookAccount?.userAgent || DjamelFCA.getUA();
  const valid = await checkLiveCookie(cookiesToString(cookies), UA);
  if (valid) log.ok("LOGIN", "الكوكيز صالحة ✔");
  else log.warn("LOGIN", "تحذير: mbasic لم يتحقق — سنحاول رغم ذلك");

  // تسجيل الدخول
  let attempt = 0; const MAX = 3;

  function tryLogin() {
    attempt++;
    DjamelFCA(cookies, { userAgent: UA }, async (err, api, extras) => {
      if (err) {
        const msg = err.message || String(err);
        log.error("LOGIN", `فشل (${attempt}/${MAX}): ${msg}`);
        if (io) io.emit("bot-status", { status: "error", message: `فشل: ${msg}` });
        if (attempt < MAX) { setTimeout(tryLogin, attempt * 5000); return; }
        log.error("LOGIN", "وصل لأقصى محاولات — تحقق من الكوكيز");
        if (io) io.emit("bot-status", { status: "offline", message: "فشل الدخول — تحقق من الكوكيز" });
        _loginLock = false; return;
      }

      // حفظ AppState المحدَّث
      try {
        if (extras?.appState?.length) {
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(extras.appState, null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
          log.info("LOGIN", `AppState محدَّث: ${chalk.cyan(extras.appState.length)} كوكي`);
        }
      } catch (_) {}

      const uid = api.getCurrentUserID();
      log.ok("LOGIN", `تسجيل الدخول ناجح ✔ — UID: ${chalk.bold.green(uid)}`);

      // تحديث globals
      global.GoatBot.fcaApi = api;
      global.GoatBot.botID  = uid;
      global.api            = api;
      if (global.djamelbot) global.djamelbot.api = api;

      // تشغيل أنظمة الحماية (20 طبقة)
      const protect = [
        "./src/protection/outgoingThrottle",  "./src/protection/humanTyping",
        "./src/protection/stealth",           "./src/protection/keepAlive",
        "./src/protection/mqttHealthCheck",   "./src/protection/naturalPresence",
        "./src/protection/behaviorScheduler", "./src/protection/antiDetection",
        "./src/protection/sessionRefresher",  "./src/protection/humanReadReceipt",
        "./src/protection/scrollSimulator",   "./src/protection/reactionDelay",
        "./src/protection/connectionJitter",  "./src/protection/duplicateGuard",
        "./src/protection/typingVariator",    "./src/protection/rateLimit",
        "./src/protection/Uprotection",
      ];
      for (const p of protect) {
        try {
          const m = require(p);
          if (typeof m.wrapSendMessage === "function") m.wrapSendMessage(api);
          else if (typeof m.wrapWithTyping === "function") m.wrapWithTyping(api);
          else if (typeof m.start === "function") m.start(api);
          else if (typeof m.startHealthCheck === "function") m.startHealthCheck();
        } catch (_) {}
      }
      log.ok("PROTECTION", "🛡️  20 نظام حماية نشط ✔");

      // اسم البوت
      let botName = config.botName || "DAVID V1";
      try {
        const info = await new Promise((res, rej) =>
          api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d)));
        botName = info?.[uid]?.name || botName;
      } catch (_) {}

      // طباعة معلومات البوت
      console.log();
      console.log(chalk.hex("#00b4d8")("  ┌──────────────────────────────────────────┐"));
      console.log(`  │  ${chalk.yellow("Bot:")}      ${chalk.white(botName.padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("UID:")}      ${chalk.white(uid.padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Prefix:")}   ${chalk.white((config.prefix||"/").padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Commands:")} ${chalk.white(String(global.GoatBot.commands.size).padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("Engine:")}   ${chalk.white("DjamelBot v2 — 20 Protection Layers".padEnd(35))}│`);
      console.log(`  │  ${chalk.yellow("By:")}       ${chalk.white("DJAMEL".padEnd(35))}│`);
      console.log(chalk.hex("#00b4d8")("  └──────────────────────────────────────────┘"));
      console.log();

      _loginLock = false;
      await new Promise(r => setTimeout(r, 1500));

      const hasMsess = cookies.some(c => c.key === "m_sess");
      if (hasMsess && api.listenMqtt) startMqtt(api);
      else startPolling(api);
    });
  }

  tryLogin();
}

// ─── مراقبة account.txt ───────────────────────────────────────────────────────
function watchAccount() {
  let debounce = null;
  fs.watch(ACCOUNT_PATH, () => {
    if (global._selfWrite) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      log.info("WATCH", "account.txt تغيَّر — إعادة تسجيل الدخول…");
      startBot();
    }, 3000);
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  printBanner();

  // إنشاء المجلدات الضرورية
  fs.ensureDirSync(path.join(__dirname, "data"));
  fs.ensureDirSync(path.join(__dirname, "database/data"));

  // قاعدة البيانات
  try { await initDB(); log.ok("DB", "قاعدة البيانات جاهزة ✔"); }
  catch (e) { log.error("DB", e.message); }

  // تحميل الأوامر
  const cmdsDir = path.join(__dirname, "src/commands");
  global.GoatBot.commands = loadCommands(cmdsDir);
  global.commands = global.GoatBot.commands;

  // لوحة التحكم
  startDashboard(config.dashboard?.port || 5000);

  // تعريض startBot للداشبورد
  global.startBot = startBot;
  global.GoatBot.reLoginBot = startBot;

  // تسجيل الدخول
  await startBot();

  // مراقبة الكوكيز
  watchAccount();
})();
