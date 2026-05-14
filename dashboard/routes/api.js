/**
 * DAVID V1 — Dashboard API Routes
 * Copyright © DJAMEL
 */

"use strict";

const express = require("express");
const router  = express.Router();
const os      = require("os");

function formatUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
}

router.get("/stats", (req, res) => {
  const mem = process.memoryUsage();
  const cfg = global.GoatBot?.config || {};
  res.json({
    online:   !!global.GoatBot?.fcaApi,
    uptime:   formatUptime(process.uptime()),
    commands: global.GoatBot?.commands?.size || 0,
    events:   global.GoatBot?.eventCommands?.size || 0,
    memHeap:  `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    memTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    sysTotal: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    sysFree:  `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    admins:   (cfg.adminBot || []).length,
    prefix:   cfg.prefix || "/",
    stealth:  cfg.stealth?.enable ? "active" : "off",
  });
});

router.post("/restart", (req, res) => {
  res.json({ success: true, message: "Restarting bot..." });
  setTimeout(() => process.exit(0), 500);
});

router.get("/commands", (req, res) => {
  const cmds = [];
  global.GoatBot?.commands?.forEach((cmd, name) => {
    cmds.push({
      name,
      aliases:     cmd.config?.aliases || [],
      role:        cmd.config?.role || 0,
      category:    cmd.config?.category || "other",
      description: cmd.config?.shortDescription || "",
    });
  });
  res.json(cmds);
});

module.exports = router;
