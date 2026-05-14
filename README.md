# DAVID V1 — Facebook Messenger Bot

> **المطور: DJAMEL** — جميع الحقوق محفوظة

بوت فيسبوك ماسنجر متكامل مبني على **DjamelBot Engine** ومكتبة **Djamel-fca** المخصصة.

---

## المميزات

- 🤖 **DjamelBot Engine** — محرك بوت كامل ومتطور
- 🍪 **c3c Cookie Login** — يدعم تنسيق fca-eryxenx و @dongdev
- 🛡️ **16 نظام حماية** — Anti-flood, stealth, session refresh, وأكثر
- 🎛️ **لوحة تحكم جميلة** — Socket.IO للتحديثات الفورية، تدعم PC والموبايل
- 👑 **نظام أدمن صارم** — يتجاهل رسائل غير الأدمن كلياً بدون أي رد
- 🔄 **إعادة تسجيل دخول تلقائية** — عند انتهاء صلاحية الكوكي

---

## الأوامر (للأدمن فقط)

| الأمر | الوظيفة |
|-------|---------|
| `/angel` | إرسال رسائل تحفيزية دورية للمجموعة |
| `/divel` | مراقبة إعدادات المجموعة وحمايتها |
| `/nick [اسم]` | قفل كنيات جميع الأعضاء |
| `/nm [اسم]` | قفل اسم المجموعة وتجديده تلقائياً |
| `/uptime` | إحصائيات البوت والنظام |
| `/chats` | إدارة DM Lock وإعدادات البوت |
| `/groupimg` | قفل صورة المجموعة |
| `/song [اسم]` | تحميل أغنية من YouTube |
| `/tik [استعلام]` | تحميل فيديو TikTok بدون علامة مائية |

> ⚠️ **مهم:** البوت يتجاهل رسائل غير الأدمن كلياً — لا يرد، لا يسجّل

---

## التثبيت

```bash
git clone https://github.com/castrolmocro/DAVI-BOT.git
cd DAVI-BOT
npm install
```

### إضافة الكوكيز

الصق الكوكي في `account.txt` أو من لوحة التحكم.

### الإعداد

عدّل `config.json`:

```json
{
  "ownerID": "YOUR_FACEBOOK_ID",
  "adminIDs": [],
  "prefix": "/",
  "dashboard": { "port": 5000, "password": "djamel2025*" }
}
```

### التشغيل

```bash
node index.js
```

لوحة التحكم: `http://localhost:5000`
كلمة المرور الافتراضية: `djamel2025*`

---

## أنظمة الحماية (16 نظام)

| # | النظام | الوصف |
|---|--------|-------|
| 01 | Presence Cycling | تدوير حالة الحضور عشوائياً |
| 02 | Human Browsing | تصفح فيسبوك بهيدرز حقيقية |
| 03 | Read Simulation | قراءة الرسائل بتأخير طبيعي |
| 04 | Sleep Mode | تقليل النشاط في ساعات النوم |
| 05 | UA Rotation | تدوير User-Agent |
| 06 | Rate Limiting | تحديد معدل الرسائل |
| 07 | Outgoing Throttle | تباعد الرسائل الصادرة |
| 08 | HTTP Fingerprinting | هيدرز Sec-Fetch الواقعية |
| 09 | Warmup Mode | نشاط محدود في أول 15 دقيقة |
| 10 | Typing Indicator | عرض "يكتب…" قبل كل رد |
| 11 | Action Jitter | تأخيرات عشوائية صغيرة |
| 12 | MQTT Health Check | مراقبة صحة الاتصال |
| 13 | Keep-Alive Ping | ping دوري للحفاظ على الجلسة |
| 14 | Cookie Freshness | فحص صحة الكوكي دورياً |
| 15 | Session Refresher | تحديث AppState تلقائياً |
| 16 | Anti-Detection | تمويه عملية البوت |

---

## هيكل الملفات

```
DAVI-BOT/
├── index.js              # Watchdog (إعادة تشغيل عند الانهيار)
├── config.json           # إعدادات البوت
├── account.txt           # كوكيز فيسبوك
├── package.json
├── railway.toml          # إعدادات Railway
│
├── src/
│   ├── index.js          # محرك DjamelBot الرئيسي
│   ├── handler/
│   │   └── handlerEvents.js   # معالج الأحداث (تجاهل تام لغير الأدمن)
│   ├── commands/         # الأوامر التسعة
│   ├── dashboard/        # Express + Socket.IO
│   ├── utils/            # قاعدة بيانات، محلل الكوكيز، المحمّل
│   └── protection/       # 16 نظام حماية
│
├── Djamel-fca/           # مكتبة الـ FCA المخصصة
└── data/                 # قاعدة البيانات SQLite
```

---

**Copyright © DJAMEL — DAVID V1 — DjamelBot Engine**
