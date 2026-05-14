/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║              DAVID V1 — by DJAMEL                       ║
 * ║         Watchdog with exponential backoff               ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Copyright © DJAMEL — All rights reserved.
 */

// ─── Node polyfills (required before any require()) ──────────────────────────
if (typeof globalThis.ReadableStream === "undefined") {
  try {
    const { ReadableStream, WritableStream, TransformStream } = require("stream/web");
    globalThis.ReadableStream  = ReadableStream;
    globalThis.WritableStream  = WritableStream;
    globalThis.TransformStream = TransformStream;
  } catch (_) {}
}
if (typeof globalThis.Blob === "undefined") {
  try { globalThis.Blob = require("buffer").Blob; } catch (_) {}
}

const { spawn } = require("child_process");
const log       = require("./logger/log.js");

const MAX_RESTARTS       = 15;
const BASE_DELAY_MS      = 3_000;
const MAX_DELAY_MS       = 5 * 60 * 1_000;
const RESET_AFTER_MS     = 10 * 60 * 1_000;
const BACKOFF_MULTIPLIER = 1.8;

let restartCount = 0;
let currentDelay = BASE_DELAY_MS;
let stableTimer  = null;

function resetCounters() {
  restartCount = 0;
  currentDelay = BASE_DELAY_MS;
}

function startProject() {
  const child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  });

  if (stableTimer) clearTimeout(stableTimer);
  stableTimer = setTimeout(() => {
    if (restartCount > 0) {
      log.info("WATCHDOG", `Bot stable for ${RESET_AFTER_MS / 60000} min — resetting counter.`);
      resetCounters();
    }
  }, RESET_AFTER_MS);

  child.on("close", (code) => {
    if (stableTimer) clearTimeout(stableTimer);

    if (code === 0) {
      log.info("WATCHDOG", "Clean shutdown (code 0). Restarting in 3s...");
      resetCounters();
      setTimeout(() => startProject(), 3_000);
      return;
    }

    restartCount++;

    if (restartCount > MAX_RESTARTS) {
      log.err(
        "WATCHDOG",
        `Bot crashed ${restartCount} times. MAX_RESTARTS exceeded.\nStopping to prevent infinite crash loop.`
      );
      process.exit(1);
    }

    log.warn(
      "WATCHDOG",
      `Crash detected (code ${code}). Restart ${restartCount}/${MAX_RESTARTS} in ${(currentDelay / 1000).toFixed(1)}s...`
    );

    setTimeout(() => {
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      startProject();
    }, currentDelay);
  });

  child.on("error", (err) => {
    log.err("WATCHDOG", `Failed to start process: ${err.message}`);
  });
}

log.info("WATCHDOG", "DAVID V1 Watchdog started — spawning Goat.js");
startProject();
