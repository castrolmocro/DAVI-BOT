/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        DAVID V1 — DjamelBot Engine (محرك البوت)         ║
 * ║        Copyright © DJAMEL — All rights reserved         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

"use strict";

// ─── Polyfills ────────────────────────────────────────────────────────────────
(function polyfill() {
  try { if (!global.ReadableStream) { const { ReadableStream, WritableStream, TransformStream } = require("stream/web"); Object.assign(global, { ReadableStream, WritableStream, TransformStream }); } } catch (_) {}
  try { if (!global.Blob) global.Blob = require("buffer").Blob; } catch (_) {}
  try { if (!global.TextEncoder) { const { TextEncoder, TextDecoder } = require("util"); Object.assign(global, { TextEncoder, TextDecoder }); } } catch (_) {}
  if (!global.File) {
    global.File = class File extends (global.Blob || Object) {
      constructor(c, n, o = {}) { try { super(c, o); } catch (_) {} this._name = n; this._lm = o.lastModified ?? Date.now(); }
      get name() { return this._name; }
      get lastModified() { return this._lm; }
    };
  }
})();

process.on("unhandledRejection", (e) => log.error(`UnhandledRejection: ${e?.message || e}`));
process.on("uncaughtException",  (e) => log.error(`UncaughtException: ${e?.message || e}`));

const loginFCA = require("@dongdev/fca-unofficial");
const fs       = require("fs-extra");
const path     = require("path");
const chalk    = require("chalk");
const gradient = require("gradient-string");
const moment   = require("moment-timezone");

const { parseCookieInput, cookiesToString, hasMandatory, dedup } = require("./utils/cookieParser");
const checkLiveCookie  = require("./utils/checkLiveCookie");
const { initDB }       = require("./utils/database");
const { loadCommands } = require("./utils/loader");
const { startDashboard, getIO } = require("./dashboard/server");
const handlerEvents    = require("./handler/handlerEvents");
const { startPoller, stopPoller } = require("./utils/customPoller");

const CONFIG_PATH  = path.join(__dirname, "../config.json");
const ACCOUNT_PATH = path.join(__dirname, "../account.txt");

// ─── Config ───────────────────────────────────────────────────────────────────
let config = {};
try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
catch (e) { console.error("config.json error:", e.message); process.exit(1); }

global.config      = config;
global.ownerID     = config.ownerID || "";
global.commandPrefix = config.prefix || "/";
global.commands    = new Map();
global.djamelbot   = { startTime: Date.now(), version: config.botVersion || "1.0.0", api: null };

// ─── Logger ───────────────────────────────────────────────────────────────────
const tz = config.timezone || "Africa/Algiers";
const ts = () => moment().tz(tz).format("HH:mm:ss");

const log = {
  info:    (m) => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} ${m}`),
  ok:      (m) => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green(m)}`),
  warn:    (m) => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow(m)}`),
  error:   (m) => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red(m)}`),
  success: (m) => console.log(`${chalk.gray(ts())} ${chalk.green("★")} ${chalk.bold.green(m)}`),
};
global.log = log;

// ─── Permission helpers ───────────────────────────────────────────────────────
const isOwner = (id) => String(id) === String(global.ownerID);
const isAdmin = (id) => isOwner(id) || (global.config?.adminIDs || []).map(String).includes(String(id));
global.isOwner = isOwner;
global.isAdmin = isAdmin;

// ─── Banner ───────────────────────────────────────────────────────────────────
function printBanner() {
  console.clear();
  const banner = gradient.pastel(`
██████╗  █████╗ ██╗   ██╗██╗██████╗
██╔══██╗██╔══██╗██║   ██║██║██╔══██╗
██║  ██║███████║██║   ██║██║██║  ██║
██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║
██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝
╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝  V1
`);
  console.log(banner);
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log(chalk.hex("#ffd166")(`  Developer : DJAMEL`));
  console.log(chalk.hex("#06d6a0")(`  Engine    : DjamelBot`));
  console.log(chalk.hex("#90e0ef")(`  Library   : Djamel-fca`));
  console.log(chalk.hex("#00b4d8")("  ═".repeat(30)));
  console.log();
}

// ─── Stop listener ────────────────────────────────────────────────────────────
function stopListening() {
  stopPoller();
  try { if (global.api?.stopListening) global.api.stopListening(() => {}); } catch (_) {}
  if (global._currentListener) { try { global._currentListener(); } catch (_) {} global._currentListener = null; }
  if (global._listenTimer) { clearTimeout(global._listenTimer); global._listenTimer = null; }
  try { if (global.api?.ctx?.mqttClient) global.api.ctx.mqttClient.end(true); } catch (_) {}
}

// ─── HTTP Long-Poll ───────────────────────────────────────────────────────────
function startPolling(api, attempt = 1) {
  const MAX = 3;
  const io  = getIO();
  log.warn(`HTTP Long-Poll (محاولة ${attempt}/${MAX})…`);

  let started = false, errored = false;
  const stop = api.listen((err, event) => {
    if (err) {
      if (errored) return;
      errored = true;
      log.error(`api.listen: ${String(err.error || err.message || err)}`);
      if (io) io.emit("bot-status", { status: "degraded", message: `خطأ في الاتصال` });
      if (attempt < MAX) {
        setTimeout(() => startPolling(api, attempt + 1), attempt * 8000);
      } else {
        log.warn("تحويل إلى Custom Poller…");
        startPoller(api, handlerEvents, global.config?.pollIntervalMs || 6000);
      }
      return;
    }
    if (!started) {
      started = true;
      log.ok(`HTTP Long-Poll نشط ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", { status: "online", message: `متصل ✔ (${api.getCurrentUserID()})` });
    }
    global._lastActivity = Date.now();
    if (event) handlerEvents(api, event, global.commands).catch(() => {});
  });
  global._currentListener = stop;
}

// ─── MQTT Listener ────────────────────────────────────────────────────────────
function startMqtt(api, attempt = 1) {
  const MAX   = 4;
  const delay = Math.min(attempt * 8000, 40000);
  const io    = getIO();
  log.info(`MQTT اتصال (محاولة ${attempt}/${MAX})…`);

  let mqttStarted = false, errored = false;

  const timer = setTimeout(() => {
    if (!mqttStarted) { log.warn("MQTT timeout → Long-Poll"); startPolling(api, 1); }
  }, 20000);
  global._listenTimer = timer;

  const stop = api.listenMqtt?.((err, event) => {
    if (err) {
      clearTimeout(timer);
      if (errored) return;
      errored = true;
      const msg = String(err.error || err.message || err.type || err);
      log.warn(`MQTT: ${msg}`);
      if (attempt < MAX) { setTimeout(() => startMqtt(api, attempt + 1), delay); }
      else { log.warn("فشل MQTT → Long-Poll"); startPolling(api, 1); }
      if (io) io.emit("bot-status", { status: "degraded", message: `MQTT: ${msg}` });
      return;
    }
    if (!mqttStarted) {
      mqttStarted = true;
      clearTimeout(timer);
      global._listenTimer = null;
      log.ok(`MQTT متصل ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", { status: "online", message: `متصل ✔ MQTT (${api.getCurrentUserID()})` });
    }
    global._lastActivity = Date.now();
    if (event) handlerEvents(api, event, global.commands).catch(() => {});
  });
  if (stop) global._currentListener = stop;
  else { clearTimeout(timer); startPolling(api, 1); }
}

// ─── Load cookies ─────────────────────────────────────────────────────────────
async function loadCookies() {
  if (!fs.existsSync(ACCOUNT_PATH)) { fs.writeFileSync(ACCOUNT_PATH, "", "utf8"); return null; }
  const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
  if (!raw) return null;

  const UA = global.config?.userAgent || "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

  let parsed;
  try { parsed = parseCookieInput(raw); }
  catch (e) { log.error(`تحليل account.txt: ${e.message}`); return null; }

  const cookies = parsed.cookies;
  if (!cookies.length) { log.error("account.txt فارغ من الكوكيز"); return null; }
  if (!hasMandatory(cookies)) { log.error("c_user أو xs مفقود من الكوكيز"); return null; }

  log.info("التحقق من الكوكيز عبر mbasic.facebook.com…");
  const valid = await checkLiveCookie(cookiesToString(cookies), UA);
  if (valid) log.ok("الكوكيز صالحة ✔");
  else log.warn("تحذير: mbasic لم يتحقق — سنحاول رغم ذلك");

  return cookies;
}

// ─── Login lock ───────────────────────────────────────────────────────────────
let _loginLock = false;

// ─── Main bot start ───────────────────────────────────────────────────────────
async function startBot() {
  if (_loginLock) { log.warn("تسجيل دخول جارٍ — تجاهل"); return; }
  _loginLock = true;

  const io = getIO();
  stopListening();

  try { require("./protection/stealth").stop(); } catch (_) {}
  try { require("./protection/keepAlive").stop(); } catch (_) {}
  try { require("./protection/mqttHealthCheck").stopHealthCheck(); } catch (_) {}
  global.api = null;
  if (global.djamelbot) global.djamelbot.api = null;

  if (io) io.emit("bot-status", { status: "connecting", message: "جارٍ تسجيل الدخول…" });

  let cookies;
  try { cookies = await loadCookies(); }
  catch (e) { log.error(`خطأ: ${e.message}`); cookies = null; }

  if (!cookies) {
    log.error("لا توجد كوكيز — ارفع الكوكيز من لوحة التحكم");
    if (io) io.emit("bot-status", { status: "offline", message: "لا توجد كوكيز — ارفع من الداشبورد" });
    _loginLock = false;
    return;
  }

  const hasMsess = cookies.some(c => c.key === "m_sess");
  const UA = global.config?.userAgent || "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

  const loginOptions = {
    appState:         cookies,
    forceLogin:       false,
    logLevel:         "silent",
    listenEvents:     true,
    selfListen:       false,
    autoReconnect:    false,
    autoMarkDelivery: false,
    autoMarkRead:     false,
    userAgent:        UA,
  };

  let loginAttempt = 0;
  const MAX_LOGIN  = 3;

  function tryLogin() {
    loginAttempt++;
    loginFCA(loginOptions, async (err, api) => {
      if (err) {
        const msg = err.error || err.message || String(err);
        log.error(`فشل تسجيل الدخول (${loginAttempt}/${MAX_LOGIN}): ${msg}`);
        if (io) io.emit("bot-status", { status: "error", message: `فشل الدخول: ${msg}` });
        if (loginAttempt < MAX_LOGIN) { setTimeout(tryLogin, loginAttempt * 5000); return; }
        log.error("وصل لأقصى عدد محاولات — تحقق من الكوكيز");
        if (io) io.emit("bot-status", { status: "offline", message: "فشل الدخول — تحقق من الكوكيز" });
        _loginLock = false;
        return;
      }

      // Save refreshed appState
      try {
        const fresh = dedup(api.getAppState() || []);
        if (fresh.length) {
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(fresh, null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
          log.info(`AppState محدَّث: ${chalk.cyan(fresh.length)} كوكي`);
        }
      } catch (_) {}

      const uid = api.getCurrentUserID();
      log.ok(`تسجيل الدخول ناجح ✔ — UID: ${chalk.bold.green(uid)}`);
      global.api = api;
      if (global.djamelbot) global.djamelbot.api = api;

      api.setOptions({ listenEvents: true, selfListen: false, autoReconnect: false, userAgent: UA });

      if (io) io.emit("bot-status", { status: "connecting", message: `دخول ✔ (${uid}) — جارٍ تشغيل الليستنر…` });

      // ── Start protection systems ───────────────────────────────────────────
      try { require("./protection/outgoingThrottle").wrapSendMessage(api); } catch (_) {}
      try { require("./protection/humanTyping").wrapWithTyping(api); } catch (_) {}
      try { require("./protection/stealth").start(api); } catch (_) {}
      try { require("./protection/keepAlive").start(); } catch (_) {}
      try { require("./protection/mqttHealthCheck").startHealthCheck(); } catch (_) {}
      try { require("./protection/naturalPresence").start(api); } catch (_) {}
      try { require("./protection/behaviorScheduler").start(); } catch (_) {}
      try { require("./protection/antiDetection").start(); } catch (_) {}
      try { require("./protection/sessionRefresher").start(api); } catch (_) {}
      try { require("./protection/humanReadReceipt").start(api); } catch (_) {}
      try { require("./protection/scrollSimulator").start(api); } catch (_) {}
      try { require("./protection/reactionDelay").start(api); } catch (_) {}
      try { require("./protection/connectionJitter").start(api); } catch (_) {}
      try { require("./protection/duplicateGuard").start(); } catch (_) {}
      try { require("./protection/typingVariator").start(api); } catch (_) {}
      try { require("./protection/rateLimit"); } catch (_) {}
      log.ok("🛡️  جميع أنظمة الحماية (16 نظام) نشطة");

      // ── Print info ─────────────────────────────────────────────────────────
      let botName = "DAVID V1";
      try {
        const info = await new Promise((res, rej) => api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d)));
        botName = info?.[uid]?.name || botName;
      } catch (_) {}

      console.log();
      console.log(chalk.hex("#00b4d8")("  ┌──────────────────────────────────────┐"));
      console.log(`  │  ${chalk.yellow("Bot:")} ${chalk.white(botName.padEnd(33))}│`);
      console.log(`  │  ${chalk.yellow("UID:")} ${chalk.white(uid.padEnd(33))}│`);
      console.log(`  │  ${chalk.yellow("Prefix:")} ${chalk.white((global.commandPrefix || "/").padEnd(30))}│`);
      console.log(`  │  ${chalk.yellow("Commands:")} ${chalk.white(String(global.commands.size).padEnd(28))}│`);
      console.log(`  │  ${chalk.yellow("Protection:")} ${chalk.white("16 Systems Active".padEnd(26))}│`);
      console.log(chalk.hex("#00b4d8")("  └──────────────────────────────────────┘"));
      console.log();

      _loginLock = false;

      await new Promise(r => setTimeout(r, 1500));
      if (hasMsess && api.listenMqtt) startMqtt(api, 1);
      else startPolling(api, 1);
    });
  }

  tryLogin();
}

// ─── File watcher for account.txt ────────────────────────────────────────────
function watchAccount() {
  let _debounce = null;
  fs.watch(ACCOUNT_PATH, () => {
    if (global._selfWrite) return;
    clearTimeout(_debounce);
    _debounce = setTimeout(() => {
      log.info("account.txt تغيَّر — إعادة تسجيل الدخول…");
      startBot();
    }, 3000);
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  printBanner();

  // Ensure data dir
  fs.ensureDirSync(path.join(__dirname, "../data"));

  // Init DB
  try { await initDB(); log.ok("قاعدة البيانات جاهزة ✔"); }
  catch (e) { log.error(`DB: ${e.message}`); }

  // Load commands
  const cmdsDir = path.join(__dirname, "commands");
  global.commands = loadCommands(cmdsDir);
  log.ok(`تم تحميل ${global.commands.size} أمر ✔`);

  // Start dashboard
  startDashboard(config.dashboard?.port || 5000);

  // Expose startBot globally for dashboard restarts
  global.startBot = startBot;

  // Start bot
  await startBot();

  // Watch for cookie changes
  watchAccount();
})();
