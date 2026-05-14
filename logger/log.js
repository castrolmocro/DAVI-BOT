/**
 * DAVID V1 — Logger
 * Copyright © DJAMEL
 */

const { colors } = require("../func/colors.js");
const moment     = require("moment-timezone");

function rtl(text) {
  if (!text) return text;
  return "\u202B" + text + "\u202C";
}

function fixArabic(str) {
  if (typeof str !== "string") return str;
  return str.replace(/([\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][^a-zA-Z0-9\n]*)+/g, m => rtl(m));
}

const getTime = () => {
  const tz = global.GoatBot?.config?.timeZone || "Africa/Algiers";
  return colors.gray(moment().tz(tz).format("HH:mm:ss DD/MM/YYYY"));
};

const ICO = {
  info:    "✅",
  warn:    "⚠️ ",
  err:     "❌",
  success: "💚",
  master:  "📌",
  dev:     "🔧",
};

function fmt(icon, labelColor, prefix, message) {
  const time  = getTime();
  const label = labelColor(`  ${prefix}  `);
  const msg   = fixArabic(typeof message === "string" ? message : String(message ?? ""));
  return `${time}  ${icon}  ${label} ${msg}`;
}

function printExtras(args) {
  for (const extra of Object.values(args).slice(2)) {
    const out = typeof extra === "object" && !extra?.stack ? JSON.stringify(extra, null, 2) : extra;
    console.log("              ", typeof out === "string" ? fixArabic(out) : out);
  }
}

module.exports = {
  rtl,
  fixArabic,

  err(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "ERROR"; }
    console.log(fmt(ICO.err, colors.bgRed, prefix, message));
    if (rest.length) printExtras({ 0: null, 1: null, ...rest });
  },

  warn(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "WARN"; }
    console.log(fmt(ICO.warn, colors.bgYellow, prefix, message));
    if (rest.length) printExtras({ 0: null, 1: null, ...rest });
  },

  info(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "INFO"; }
    console.log(fmt(ICO.info, colors.bgCyan, prefix, message));
    if (rest.length) printExtras({ 0: null, 1: null, ...rest });
  },

  success(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "OK"; }
    console.log(fmt(ICO.success, colors.bgGreen, prefix, message));
    if (rest.length) printExtras({ 0: null, 1: null, ...rest });
  },

  master(prefix, message, ...rest) {
    if (message === undefined) { message = prefix; prefix = "MASTER"; }
    console.log(fmt(ICO.master, colors.bgMagenta, prefix, message));
    if (rest.length) printExtras({ 0: null, 1: null, ...rest });
  },
};
