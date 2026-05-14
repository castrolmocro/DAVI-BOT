# DAVID V1 — Facebook Messenger Bot

> **Developed by DJAMEL** — All rights reserved.

A powerful, stable, and human-like Facebook Messenger bot built on the **White Bot Engine** and powered by **Djamel-fca** abstractions. DAVID V1 is designed for Railway deployment with a beautiful web dashboard, 20-layer protection system, and full cookie security.

---

## Features

- 🤖 **Messenger Bot** — Reads and responds to Facebook messages in real time
- 🛡️ **20-Layer Protection** — Anti-flood, anti-spam, stealth engine, cookie protection, auto re-login, and more
- 🍪 **c3c Cookie Login** — Supports fca-eryxenx appState JSON (c3c cookie format)
- 🎛️ **Beautiful Dashboard** — Responsive web panel for PC and mobile
- 👑 **Bot Admin System** — Only configured admins can control the bot
- 🔄 **Auto Re-Login** — Automatically refreshes session when cookie expires
- 🚀 **Railway Ready** — One-click deploy with included railway.toml

---

## Commands

| Command | Description |
|---------|-------------|
| `/angel` | Send scheduled motivational messages to a group |
| `/divel` | Monitor and auto-restore group settings |
| `/nick [name]` | Lock all member nicknames |
| `/nm [name]` | Lock the group name on a schedule |
| `/uptime` | Show bot uptime and system stats |
| `/chats` | Manage DM lock and chat settings |
| `/groupimg` | Lock and enforce group profile image |
| `/song [name]` | Search and send a song from YouTube |
| `/tik [query]` | Search and download TikTok videos |

> All commands are **admin-only** — only users listed in `adminBot` can use them.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOURNAME/DAVI-BOT.git
cd DAVI-BOT
npm install
```

### 2. Configure

Edit `config.json`:

```json
{
  "adminBot": ["YOUR_FACEBOOK_ID"],
  "prefix": "/"
}
```

### 3. Add your Cookie

Paste your Facebook appState JSON into `account.txt`.
Use the browser extension **c3c-cookie-editor** to export your cookies.

### 4. Start

```bash
node index.js
```

The dashboard will be available at `http://localhost:5000`

---

## Dashboard

Access the web dashboard at your deployed URL (or `localhost:5000`):

- **Login** — Default: `admin` / `david_v1_2024` (change in config.json)
- **Home** — Live bot stats, protection layers, system info
- **Bot Admins** — Add/remove bot admin Facebook IDs
- **Cookie / Login** — Update your Facebook session cookie
- **Config** — View current configuration

---

## 20-Layer Protection System

| Layer | Name | Description |
|-------|------|-------------|
| 01 | Presence Cycling | Randomizes online/idle presence |
| 02 | Human Browsing | Browses Facebook with real browser headers |
| 03 | Read Simulation | Marks messages as read naturally |
| 04 | Sleep Mode | Reduces activity during 01:00–08:00 |
| 05 | UA Rotation | Rotates user-agent strings |
| 06 | Rate Limiting | Limits messages per minute |
| 07 | Outgoing Throttle | Spaces out sent messages |
| 08 | HTTP Fingerprinting | Uses Sec-Fetch headers |
| 09 | Warmup Mode | Minimal activity for first 15 min |
| 10 | Typing Indicator | Shows typing before every reply |
| 11 | Action Jitter | Random micro-delays on actions |
| 12 | MQTT Health Check | Monitors connection health |
| 13 | Keep-Alive Ping | Periodic ping to keep session alive |
| 14 | Cookie Freshness | Checks cookie validity periodically |
| 15 | Auto Re-Login | Re-authenticates on cookie expiry |
| 16 | Anti-Flood | Blocks message flooding |
| 17 | Anti-Spam | Detects and mutes spammers |
| 18 | DM Lock | Blocks non-admins in private DMs |
| 19 | Anti-Impersonation | Guards against bot impersonation |
| 20 | Bot-Detection Evasion | Natural timing and behavior patterns |

---

## Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables if needed
4. Done! Railway will auto-detect `railway.toml` and start the bot

---

## Djamel-fca Library

The `Djamel-fca/` folder contains a custom abstraction library for Facebook API operations:

```js
const fca = require("./Djamel-fca");

// Human-like message sending
await fca.humanSend(api, "Hello!", threadID);

// Cookie utilities
const valid = fca.isValidAppState(appState);

// Promise-based helpers
const info = await fca.getThreadInfoAsync(api, threadID);
```

---

## File Structure

```
DAVI-BOT/
├── index.js              # Watchdog (restarts bot on crash)
├── Goat.js               # Main bot engine
├── config.json           # Bot configuration
├── account.txt           # Facebook cookie (appState JSON)
├── package.json
├── railway.toml          # Railway deployment config
├── nixpacks.toml         # Build config
│
├── bot/
│   ├── login/            # Login, cookie check, re-login
│   ├── handler/          # Event & command routing
│   ├── stealth/          # Human camouflage system (20 layers)
│   ├── protection/       # Rate limiting
│   ├── keepAlive/        # Session keep-alive
│   ├── autoRelogin/      # Automatic re-authentication
│   └── mqttHealthCheck/  # MQTT connection monitoring
│
├── scripts/
│   ├── cmds/             # Bot commands (/angel, /divel, etc.)
│   └── events/           # Event listeners (antiflood, antispam)
│
├── dashboard/
│   ├── app.js            # Express web server
│   ├── routes/           # Login, dashboard, API routes
│   ├── views/            # ETA templates
│   └── css/              # Stylesheets
│
├── database/
│   ├── connectDB/        # SQLite connection
│   ├── controller/       # Data controllers
│   └── data/             # Database files
│
├── Djamel-fca/           # Custom FCA abstractions library
├── func/                 # Color & utility functions
├── logger/               # Logging system
└── languages/            # Language files
```

---

## Credits

- **Developer**: DJAMEL — Full project design, architecture, and implementation
- **Bot Engine**: White Bot Engine (inspired by WHITE-V3)
- **FCA Library**: fca-eryxenx (c3c cookie compatible)
- **Dashboard**: Express + ETA templates

---

**Copyright © DJAMEL — DAVID V1 — All rights reserved.**
