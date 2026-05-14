/**
 * DAVID V1 — Logger System
 * Copyright © DJAMEL
 */
"use strict";

const chalk   = require("chalk");
const moment  = require("moment-timezone");

const TZ = () => (global.GoatBot?.config?.timezone || "Africa/Algiers");

const ts = () => {
  try { return moment().tz(TZ()).format("HH:mm:ss"); }
  catch (_) { return new Date().toTimeString().slice(0, 8); }
};

const strip = s => String(s).replace(/\x1b\[[0-9;]*m/g, "");

function fmt(icon, color, label, msg) {
  const time  = chalk.gray(ts());
  const lbl   = color(`[${label}]`);
  const text  = typeof msg === "object" ? JSON.stringify(msg) : String(msg ?? "");
  return `${time} ${icon} ${lbl} ${text}`;
}

const log = {
  info:    (label, msg) => console.log(fmt("•", chalk.cyan,    label, msg)),
  ok:      (label, msg) => console.log(fmt("✔", chalk.green,   label, msg)),
  warn:    (label, msg) => console.log(fmt("⚠", chalk.yellow,  label, msg)),
  error:   (label, msg) => console.log(fmt("✘", chalk.red,     label, msg)),
  err:     (label, msg) => console.log(fmt("✘", chalk.red,     label, msg)),
  success: (label, msg) => console.log(fmt("★", chalk.bold.green, label, msg)),
  master:  (label, msg) => console.log(fmt("👑", chalk.magenta, label, msg)),
};

module.exports = log;
