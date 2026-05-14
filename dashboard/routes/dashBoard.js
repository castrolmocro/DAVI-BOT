/**
 * DAVID V1 — Dashboard Routes
 * Copyright © DJAMEL
 */

"use strict";

const express = require("express");
const fs      = require("fs-extra");
const path    = require("path");
const router  = express.Router();

const ACCOUNT_PATH = path.join(process.cwd(), "account.txt");
const CONFIG_PATH  = path.join(process.cwd(), "config.json");

function getStats() {
  const cfg       = global.GoatBot?.config || {};
  const commands  = global.GoatBot?.commands?.size || 0;
  const events    = global.GoatBot?.eventCommands?.size || 0;
  const uptime    = process.uptime();
  const mem       = process.memoryUsage();
  const isOnline  = !!global.GoatBot?.fcaApi;
  const adminCount = (cfg.adminBot || []).length;

  return {
    botName:    cfg.botName || "DAVID V1",
    version:    cfg.botVersion || "1.0.0",
    prefix:     cfg.prefix || "/",
    commands,
    events,
    uptime:     formatUptime(uptime),
    memUsed:    formatBytes(mem.heapUsed),
    memTotal:   formatBytes(mem.heapTotal),
    isOnline,
    adminCount,
    protection: "20 Layers",
    stealth:    cfg.stealth?.enable ? "Active" : "Disabled",
  };
}

function formatUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
}

function formatBytes(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

router.get("/", (req, res) => {
  res.render("dashboard", { stats: getStats(), page: "home" });
});

router.get("/config", (req, res) => {
  let configStr = "";
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    // Remove sensitive fields before showing
    if (cfg.facebookAccount) {
      cfg.facebookAccount.password  = cfg.facebookAccount.password  ? "••••••••" : "";
      cfg.facebookAccount["2FASecret"] = cfg.facebookAccount["2FASecret"] ? "••••••••" : "";
    }
    if (cfg.dashboard?.adminPassword) cfg.dashboard.adminPassword = "••••••••";
    configStr = JSON.stringify(cfg, null, 2);
  } catch (e) {
    configStr = `Error reading config: ${e.message}`;
  }
  res.render("config", { configStr, page: "config" });
});

router.get("/admins", (req, res) => {
  const cfg    = global.GoatBot?.config || {};
  const admins = cfg.adminBot || [];
  const supers = cfg.superAdminBot || [];
  res.render("admins", { admins, supers, page: "admins" });
});

router.post("/admins/add", (req, res) => {
  const { fbid } = req.body;
  if (!fbid || !fbid.trim()) {
    req.flash("error", "Please provide a valid Facebook ID.");
    return res.redirect("/dashboard/admins");
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (!cfg.adminBot) cfg.adminBot = [];
    if (!cfg.adminBot.includes(fbid.trim())) {
      cfg.adminBot.push(fbid.trim());
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
      if (global.GoatBot) global.GoatBot.config.adminBot = cfg.adminBot;
    }
    req.flash("success", `Admin ${fbid} added successfully.`);
  } catch (e) {
    req.flash("error", `Error: ${e.message}`);
  }
  res.redirect("/dashboard/admins");
});

router.post("/admins/remove", (req, res) => {
  const { fbid } = req.body;
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    cfg.adminBot = (cfg.adminBot || []).filter(id => id !== fbid);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    if (global.GoatBot) global.GoatBot.config.adminBot = cfg.adminBot;
    req.flash("success", `Admin ${fbid} removed.`);
  } catch (e) {
    req.flash("error", `Error: ${e.message}`);
  }
  res.redirect("/dashboard/admins");
});

router.get("/cookie", (req, res) => {
  let cookie = "";
  try {
    cookie = fs.readFileSync(ACCOUNT_PATH, "utf8");
  } catch (_) {}
  res.render("cookie", { cookie, page: "cookie" });
});

router.post("/cookie", (req, res) => {
  const { cookie } = req.body;
  try {
    JSON.parse(cookie);
    fs.writeFileSync(ACCOUNT_PATH, cookie);
    req.flash("success", "Cookie saved successfully! Restart the bot to apply.");
  } catch (e) {
    req.flash("error", `Invalid JSON cookie: ${e.message}`);
  }
  res.redirect("/dashboard/cookie");
});

module.exports = router;
