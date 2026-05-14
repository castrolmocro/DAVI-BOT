/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           DAVID V1 — Watchdog / Entry Point             ║
 * ║           Copyright © DJAMEL — All rights reserved      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

"use strict";

const { spawn }  = require("child_process");
const path       = require("path");
const chalk      = require("chalk");

const MAX_RESTARTS  = 15;
const RESTART_DELAY = 5000;

let restartCount = 0;
let child        = null;

function start() {
  if (restartCount >= MAX_RESTARTS) {
    console.error(chalk.red(`[WATCHDOG] Max restarts (${MAX_RESTARTS}) reached. Stopping.`));
    process.exit(1);
  }

  restartCount++;
  const entry = path.join(__dirname, "src", "index.js");

  console.log(chalk.cyan(`\n[WATCHDOG] Starting DAVID V1... (attempt ${restartCount})`));

  child = spawn(process.execPath, [entry], {
    stdio: "inherit",
    env:   process.env,
  });

  child.on("exit", (code, signal) => {
    if (code === 0) {
      console.log(chalk.green("[WATCHDOG] Bot exited cleanly."));
      process.exit(0);
    }
    console.log(chalk.yellow(`[WATCHDOG] Exited with code ${code} signal ${signal} — restarting in ${RESTART_DELAY / 1000}s...`));
    setTimeout(start, RESTART_DELAY);
  });

  child.on("error", (err) => {
    console.error(chalk.red(`[WATCHDOG] Spawn error: ${err.message}`));
    setTimeout(start, RESTART_DELAY);
  });
}

process.on("SIGINT",  () => { if (child) child.kill("SIGINT");  process.exit(0); });
process.on("SIGTERM", () => { if (child) child.kill("SIGTERM"); process.exit(0); });

start();
