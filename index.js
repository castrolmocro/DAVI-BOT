/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         DAVID V1 — Watchdog / Entry Point                       ║
 * ║         Copyright © 2025 DJAMEL — All rights reserved          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * يراقب العملية الرئيسية ويعيد تشغيلها عند الانهيار
 * مع backoff تصاعدي وحد أقصى للمحاولات
 */
"use strict";

const { spawn } = require("child_process");
const path      = require("path");
const chalk     = require("chalk");

const MAX_RESTARTS      = 20;
const BASE_DELAY_MS     = 3000;
const MAX_DELAY_MS      = 5 * 60 * 1000;
const BACKOFF_MULTIPLIER = 1.8;
const RESET_AFTER_MS    = 10 * 60 * 1000;

let restartCount = 0;
let currentDelay = BASE_DELAY_MS;
let stableTimer  = null;
let child        = null;

function log(msg) {
  const t = new Date().toTimeString().slice(0, 8);
  console.log(`${chalk.gray(t)} ${chalk.cyan("[WATCHDOG]")} ${msg}`);
}

function start() {
  if (restartCount >= MAX_RESTARTS) {
    log(chalk.red(`وصل لأقصى إعادات تشغيل (${MAX_RESTARTS}). توقف.`));
    process.exit(1);
  }

  restartCount++;
  log(chalk.cyan(`تشغيل DAVID V1... (محاولة ${restartCount})`));

  child = spawn(process.execPath, [path.join(__dirname, "Goat.js")], {
    stdio: "inherit",
    env:   process.env,
  });

  // إعادة تعيين العداد بعد استقرار البوت
  if (stableTimer) clearTimeout(stableTimer);
  stableTimer = setTimeout(() => {
    if (restartCount > 0) {
      log(chalk.green(`البوت مستقر ${RESET_AFTER_MS / 60000} دقيقة — إعادة تعيين العداد`));
      restartCount = 0;
      currentDelay = BASE_DELAY_MS;
    }
  }, RESET_AFTER_MS);

  child.on("exit", (code, signal) => {
    if (stableTimer) clearTimeout(stableTimer);

    // الخروج النظيف (exit 0) — إعادة تشغيل سريعة (أمر /restart)
    if (code === 0) {
      log(chalk.green("خروج نظيف — إعادة تشغيل فورية…"));
      restartCount = 0; currentDelay = BASE_DELAY_MS;
      setTimeout(start, 1000);
      return;
    }

    log(chalk.yellow(`خرج بكود ${code} إشارة ${signal} — إعادة تشغيل بعد ${Math.round(currentDelay/1000)}s…`));
    setTimeout(() => {
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      start();
    }, currentDelay);
  });

  child.on("error", err => {
    log(chalk.red(`خطأ spawn: ${err.message}`));
    setTimeout(start, currentDelay);
  });
}

process.on("SIGINT",  () => { if (child) child.kill("SIGINT");  process.exit(0); });
process.on("SIGTERM", () => { if (child) child.kill("SIGTERM"); process.exit(0); });

start();
