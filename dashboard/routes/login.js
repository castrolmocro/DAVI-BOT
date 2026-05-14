/**
 * DAVID V1 — Login Routes
 * Copyright © DJAMEL
 */

"use strict";

const express = require("express");
const router  = express.Router();

function getAdminCreds() {
  const cfg = global.GoatBot?.config?.dashboard || {};
  return {
    username: cfg.adminUsername || "admin",
    password: cfg.adminPassword || "david_v1_2024",
  };
}

router.get("/", (req, res) => {
  if (req.session?.authenticated) return res.redirect("/dashboard");
  res.redirect("/login");
});

router.get("/login", (req, res) => {
  if (req.session?.authenticated) return res.redirect("/dashboard");
  res.render("login", { error: req.flash("error"), success: req.flash("success") });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const creds = getAdminCreds();

  if (username === creds.username && password === creds.password) {
    req.session.authenticated = true;
    req.session.username      = username;
    return res.redirect("/dashboard");
  }

  req.flash("error", "Invalid username or password.");
  res.redirect("/login");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
