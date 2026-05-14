/**
 * DAVID V1 — Database (better-sqlite3)
 * Copyright © DJAMEL
 */

"use strict";

const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs-extra");

const DATA_DIR = path.join(__dirname, "../../data");
const DB_PATH  = path.join(DATA_DIR, "david.sqlite");

fs.ensureDirSync(DATA_DIR);

let db;

function initDB() {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userID    TEXT PRIMARY KEY,
      name      TEXT DEFAULT 'Unknown',
      exp       INTEGER DEFAULT 0,
      money     INTEGER DEFAULT 0,
      banned    INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threads (
      threadID  TEXT PRIMARY KEY,
      name      TEXT DEFAULT 'Unknown',
      prefix    TEXT DEFAULT '/',
      banned    INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS command_logs (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      userID    TEXT,
      threadID  TEXT,
      command   TEXT,
      args      TEXT,
      success   INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bot_data (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  return Promise.resolve();
}

function getDB() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

// ── Users ──────────────────────────────────────────────────────────────────────
function getOrCreateUser(userID, name) {
  try {
    const d = getDB();
    const row = d.prepare("SELECT * FROM users WHERE userID = ?").get(String(userID));
    if (row) return row;
    d.prepare("INSERT OR IGNORE INTO users (userID, name) VALUES (?, ?)").run(String(userID), name || "Unknown");
    return d.prepare("SELECT * FROM users WHERE userID = ?").get(String(userID));
  } catch (_) { return null; }
}

function getUser(userID) {
  try { return getDB().prepare("SELECT * FROM users WHERE userID = ?").get(String(userID)); }
  catch (_) { return null; }
}

function updateUser(userID, fields) {
  try {
    const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
    const vals = Object.values(fields);
    getDB().prepare(`UPDATE users SET ${sets} WHERE userID = ?`).run(...vals, String(userID));
  } catch (_) {}
}

function getAllUsers() {
  try { return getDB().prepare("SELECT * FROM users").all(); }
  catch (_) { return []; }
}

// ── Threads ────────────────────────────────────────────────────────────────────
function getOrCreateThread(threadID, name) {
  try {
    const d = getDB();
    const row = d.prepare("SELECT * FROM threads WHERE threadID = ?").get(String(threadID));
    if (row) return row;
    d.prepare("INSERT OR IGNORE INTO threads (threadID, name) VALUES (?, ?)").run(String(threadID), name || "Unknown");
    return d.prepare("SELECT * FROM threads WHERE threadID = ?").get(String(threadID));
  } catch (_) { return null; }
}

function getAllThreads() {
  try { return getDB().prepare("SELECT * FROM threads").all(); }
  catch (_) { return []; }
}

// ── Command logs ───────────────────────────────────────────────────────────────
function logCommand(userID, threadID, command, args, success = true) {
  try {
    const argsStr = Array.isArray(args) ? args.join(" ") : (args || "");
    getDB().prepare("INSERT INTO command_logs (userID, threadID, command, args, success) VALUES (?, ?, ?, ?, ?)").run(
      String(userID), String(threadID), command, argsStr, success ? 1 : 0
    );
  } catch (_) {}
}

function getRecentLogs(limit = 20) {
  try { return getDB().prepare("SELECT * FROM command_logs ORDER BY createdAt DESC LIMIT ?").all(limit); }
  catch (_) { return []; }
}

// ── Stats ──────────────────────────────────────────────────────────────────────
function getStats() {
  try {
    const d = getDB();
    return {
      totalUsers:    d.prepare("SELECT COUNT(*) as c FROM users").get().c || 0,
      totalThreads:  d.prepare("SELECT COUNT(*) as c FROM threads").get().c || 0,
      totalCommands: d.prepare("SELECT COUNT(*) as c FROM command_logs").get().c || 0,
      recentLogs:    getRecentLogs(10),
    };
  } catch (_) { return { totalUsers: 0, totalThreads: 0, totalCommands: 0, recentLogs: [] }; }
}

// ── Bot data (key-value) ───────────────────────────────────────────────────────
function setBotData(key, value) {
  try { getDB().prepare("INSERT OR REPLACE INTO bot_data (key, value) VALUES (?, ?)").run(key, JSON.stringify(value)); }
  catch (_) {}
}

function getBotData(key, def = null) {
  try {
    const row = getDB().prepare("SELECT value FROM bot_data WHERE key = ?").get(key);
    return row ? JSON.parse(row.value) : def;
  } catch (_) { return def; }
}

module.exports = {
  initDB, getDB,
  getOrCreateUser, getUser, updateUser, getAllUsers,
  getOrCreateThread, getAllThreads,
  logCommand, getRecentLogs,
  getStats,
  setBotData, getBotData,
};
