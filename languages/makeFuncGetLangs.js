/**
 * DAVID V1 — Language helper
 * Copyright © DJAMEL
 */

"use strict";

const fs   = require("fs-extra");
const path = require("path");

const cache = {};

function getLangData(lang) {
  if (cache[lang]) return cache[lang];
  const p = path.join(process.cwd(), `languages/${lang}.lang`);
  if (fs.existsSync(p)) {
    try {
      cache[lang] = JSON.parse(fs.readFileSync(p, "utf8"));
      return cache[lang];
    } catch (_) {}
  }
  if (lang !== "en") return getLangData("en");
  return {};
}

module.exports = function getText({ lang = "en", head }, key, ...args) {
  const data = getLangData(lang);
  let str = head ? data?.[head]?.[key] : data?.[key];
  if (!str) return key;
  for (let i = 0; i < args.length; i++) {
    str = str.replace(new RegExp(`\\{${i + 1}\\}`, "g"), String(args[i]));
  }
  return str;
};
