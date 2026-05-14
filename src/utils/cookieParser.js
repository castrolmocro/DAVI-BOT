/**
 * DAVID V1 — Universal Cookie Parser
 * Copyright © DJAMEL
 * يدعم: JSON Array | Cookie String | Netscape format
 */

"use strict";

const FAR = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
const NOW = () => new Date().toISOString();

function normalizeEntry(c) {
  const key   = c.key || c.name;
  const value = String(c.value ?? "");
  if (!key || key === "x-referer") return null;
  return {
    key,
    value,
    domain:       (c.domain || "facebook.com").replace(/^\./, ""),
    path:         c.path        || "/",
    hostOnly:     c.hostOnly    ?? false,
    creation:     c.creation    || NOW(),
    lastAccessed: c.lastAccessed|| NOW(),
    expires:      c.expires || (c.expirationDate
      ? new Date(c.expirationDate * 1000).toISOString()
      : FAR()),
  };
}

function dedup(arr) {
  if (!Array.isArray(arr)) return [];
  const map = new Map();
  for (const c of arr) map.set(`${c.key}@${c.domain}`, c);
  return [...map.values()];
}

function isNetscape(raw) {
  return typeof raw === "string" &&
    /(.+)\t(TRUE|FALSE)\t([\w\/.-]*)\t(TRUE|FALSE)\t\d+\t([\w-]+)\t(.+)/i.test(raw);
}

function parseNetscape(raw) {
  return raw.split("\n").map(line => {
    if (line.trim().startsWith("#") || !line.trim()) return null;
    const parts = line.split("\t").map(s => s.trim());
    if (parts.length < 7) return null;
    return normalizeEntry({ domain: parts[0], hostOnly: parts[1] === "TRUE", path: parts[2], key: parts[5], value: parts[6], creation: new Date(parseInt(parts[4]) * 1000).toISOString() });
  }).filter(Boolean);
}

function parseCookieInput(raw) {
  if (typeof raw === "string") {
    raw = raw.trim();
    if (isNetscape(raw)) return { isToken: false, cookies: dedup(parseNetscape(raw).filter(Boolean)) };
    if (raw.includes("=") && !raw.trimStart().startsWith("[") && !raw.trimStart().startsWith("{")) {
      const entries = raw.split(/[;\n]/).map(p => {
        const eq = p.indexOf("=");
        if (eq < 1) return null;
        return normalizeEntry({ key: p.slice(0, eq).trim(), value: p.slice(eq + 1).trim() });
      }).filter(Boolean);
      if (entries.length) return { isToken: false, cookies: dedup(entries) };
    }
    try { raw = JSON.parse(raw); } catch { throw new Error("صيغة الكوكيز غير مدعومة"); }
  }
  if (!Array.isArray(raw) || !raw.length) throw new Error("يجب أن يكون JSON مصفوفة غير فارغة");
  return { isToken: false, cookies: dedup(raw.map(normalizeEntry).filter(Boolean)) };
}

function cookiesToString(arr) {
  return arr.map(c => `${c.key}=${c.value}`).join("; ");
}

function hasMandatory(cookies) {
  const keys = cookies.map(c => c.key);
  return keys.includes("c_user") && keys.includes("xs");
}

module.exports = { parseCookieInput, cookiesToString, hasMandatory, dedup, normalizeEntry };
