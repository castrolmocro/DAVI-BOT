/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              DAVID V1 — Main Bot Engine                 ║
 * ║         Powered by Djamel-fca & White Bot Engine       ║
 * ║              Copyright © DJAMEL                        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Based on the White Bot Engine architecture.
 * All rights reserved — DJAMEL.
 */

// ─── Polyfills — MUST be first ────────────────────────────────────────────────
(function applyPolyfills() {
  if (typeof globalThis.ReadableStream === "undefined") {
    try {
      const sw = require("stream/web");
      globalThis.ReadableStream  = sw.ReadableStream;
      globalThis.WritableStream  = sw.WritableStream;
      globalThis.TransformStream = sw.TransformStream;
    } catch (_) {}
  }
  if (typeof globalThis.Blob === "undefined") {
    try { globalThis.Blob = require("buffer").Blob; } catch (_) {}
  }
  if (typeof globalThis.File === "undefined") {
    try {
      const { File } = require("buffer");
      if (File) globalThis.File = File;
    } catch (_) {}
  }
  if (typeof globalThis.File === "undefined") {
    const BaseBlob = globalThis.Blob || class Blob {};
    globalThis.File = class File extends BaseBlob {
      constructor(chunks, name, opts = {}) {
        super(chunks, opts);
        this._name = name || "";
        this._lastModified = opts.lastModified ?? Date.now();
      }
      get name()         { return this._name; }
      get lastModified() { return this._lastModified; }
    };
  }
  if (typeof globalThis.TextEncoder === "undefined") {
    try {
      const { TextEncoder, TextDecoder } = require("util");
      globalThis.TextEncoder = TextEncoder;
      globalThis.TextDecoder = TextDecoder;
    } catch (_) {}
  }
})();

process.on("unhandledRejection", e => console.error("[DAVID V1] UnhandledRejection:", e?.message || e));
process.on("uncaughtException",  e => console.error("[DAVID V1] UncaughtException:", e?.message || e));

const fs   = require("fs-extra");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, "config.json");
if (!fs.existsSync(CONFIG_PATH)) {
  console.error("[DAVID V1] config.json not found!");
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (e) {
  console.error("[DAVID V1] config.json parse error:", e.message);
  process.exit(1);
}

// ─── Global GoatBot namespace ─────────────────────────────────────────────────
global.GoatBot = {
  config,
  commands:      new Map(),
  aliases:       new Map(),
  eventCommands: new Map(),
  fcaApi:        null,
  startTime:     Date.now(),

  // State maps (used by various commands)
  angelIntervals: {},
  divelWatchers:  {},
  dmLocked:       false,

  // References
  dirConfig: CONFIG_PATH,
};

global.client = {
  dirConfig: CONFIG_PATH,
};

// ─── Utils ───────────────────────────────────────────────────────────────────
global.utils = require("./utils.js");

// ─── Validate account.txt or config credentials ──────────────────────────────
const ACCOUNT_PATH = path.join(__dirname, "account.txt");
const hasAccount   = fs.existsSync(ACCOUNT_PATH) && (() => {
  try {
    const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
    if (!raw || !raw.startsWith("[")) return false;
    const arr = JSON.parse(raw);
    const cu  = arr.find(c => c.key === "c_user");
    return cu && cu.value && !cu.value.startsWith("YOUR_");
  } catch (_) { return false; }
})();

const hasCreds = config.facebookAccount?.email && config.facebookAccount?.password;

if (!hasAccount && !hasCreds) {
  global.utils.log.err(
    "STARTUP",
    "No valid credentials found!\n" +
    "→ Edit account.txt with your Facebook cookies (appState)\n" +
    "→ OR set email + password in config.json under facebookAccount\n" +
    "→ Then restart the bot."
  );
  // Don't exit — let dashboard start so user can configure via web panel
}

// ─── Ensure data directories exist ───────────────────────────────────────────
const dataDirs = [
  path.join(__dirname, "database/data"),
  path.join(__dirname, "scripts/cmds/cache"),
  path.join(__dirname, "scripts/events/data"),
];
for (const dir of dataDirs) fs.ensureDirSync(dir);

// ─── Start ────────────────────────────────────────────────────────────────────
const startLogin = require("./bot/login/login.js");

(async () => {
  if (hasAccount || hasCreds) {
    try {
      await startLogin();
    } catch (e) {
      global.utils.log.err("STARTUP", `Login failed: ${e.message || JSON.stringify(e)}`);
      // Start dashboard anyway so user can reconfigure cookies
      try { require("./dashboard/app.js"); } catch (_) {}
      // Retry in 30 seconds
      setTimeout(async () => {
        try { await startLogin(); } catch (_) {}
      }, 30_000);
    }
  } else {
    global.utils.log.warn("STARTUP", "Starting dashboard only (no valid credentials)");
    try { require("./dashboard/app.js"); } catch (e) {
      global.utils.log.err("DASHBOARD", e.message);
    }
  }
})();
