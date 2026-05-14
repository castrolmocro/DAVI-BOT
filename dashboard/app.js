/**
 * DAVID V1 — Dashboard Server
 * Copyright © DJAMEL
 */

"use strict";

const express      = require("express");
const session      = require("express-session");
const cookieParser = require("cookie-parser");
const flash        = require("connect-flash");
const path         = require("path");
const fs           = require("fs-extra");
const rateLimit    = require("express-rate-limit");
const { Eta }      = require("eta");

const loginRouter     = require("./routes/login.js");
const dashboardRouter = require("./routes/dashBoard.js");
const apiRouter       = require("./routes/api.js");

const app = express();
const cfg = global.GoatBot?.config?.dashboard || {};
const PORT = process.env.PORT || cfg.port || 5000;

// ─── View engine ──────────────────────────────────────────────────────────────
const eta = new Eta({ views: path.join(__dirname, "views"), cache: false });
app.engine("eta", (filePath, data, cb) => {
  try {
    const result = eta.render(path.basename(filePath, ".eta"), data);
    cb(null, result);
  } catch (e) {
    cb(e);
  }
});
app.set("view engine", "eta");
app.set("views", path.join(__dirname, "views"));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

// Rate limiting — dashboard protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  "Too many requests — please try again later.",
});
app.use(limiter);

// Session
app.use(session({
  secret:            cfg.sessionSecret || "david_v1_secret_2024",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
  },
}));

app.use(flash());

// ─── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  req.flash("error", "Please log in to access the dashboard.");
  res.redirect("/login");
}

app.use((req, res, next) => {
  res.locals.flash      = req.flash();
  res.locals.botName    = global.GoatBot?.config?.botName || "DAVID V1";
  res.locals.isLoggedIn = !!req.session?.authenticated;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/", loginRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/api", requireAuth, apiRouter);

// 404
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>404 — DAVID V1</title>
    <style>body{background:#0a0e1a;color:#00b4d8;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;}h1{font-size:4rem;margin:0;}p{color:#90e0ef;}</style>
    </head><body>
    <h1>404</h1><p>Page not found — <a href="/" style="color:#00b4d8">Go home</a></p>
    </body></html>
  `);
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[DASHBOARD ERROR]", err.message);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, () => {
  const log = global.utils?.log;
  log?.info?.("DASHBOARD", `Dashboard running on port ${PORT}`);
  log?.info?.("DASHBOARD", `Open: http://localhost:${PORT}`);
});

module.exports = app;
