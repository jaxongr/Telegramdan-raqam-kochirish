# 📝 CHANGELOG - Barcha O'zgarishlar

**Sana**: 2025-10-07
**Versiya**: v2.0.0 (yangi funksiyalar)
**Git Commit**: `7235976` → yangi (deploy qilinmagan)

---

## 🎯 UMUMIY XULOSА

**Qo'shildi**:
- ✅ SMS Shablon O'zgaruvchilari (`{{phone}}`, `{{group}}`, `{{name}}`, `{{time}}`, `{{date}}`)
- ✅ Qora Ro'yxat (Blacklist) - SMS yuborishdan oldin avtomatik tekshirish
- ✅ Telegram Bot Interface - bot orqali tizimni boshqarish
- ✅ UI taxi terminologiyasiga o'zgartirildi (Logistika → Taxi)

**O'zgartirildi**:
- 📝 Database structure - `blacklist: []` qo'shildi
- 📝 SMS yuborish funksiyasi - shablon va blacklist qo'shildi
- 📝 Index.js - bot integration

**Qoldi**:
- ⏳ Blacklist UI (1 soat)
- ⏳ Bot `/scan`, `/pause`, `/resume` (2 soat)
- ⏳ Statistika Dashboard (3 soat)

---

## 📂 YANGI FAYLLAR (12 ta)

### 1. Backend Services
```
src/services/telegramBot.js (330 lines)
  └─ Telegram bot service
  └─ Komandalar: /start, /help, /status, /stats, /blacklist
  └─ Admin authentication
  └─ Error handling

src/database/blacklist.js (177 lines)
  └─ Blacklist CRUD operations
  └─ isBlacklisted() - SMS yuborishdan oldin tekshirish
  └─ addToBlacklist(), removeFromBlacklist()
  └─ getAllBlacklist(), searchBlacklist(), getBlacklistStats()
```

### 2. Web Routes
```
src/web/routes/blacklist.js (93 lines)
  └─ GET  /blacklist - Ro'yxat
  └─ GET  /blacklist/add - Qo'shish sahifasi
  └─ POST /blacklist/add - Qo'shish
  └─ POST /blacklist/delete/:id - O'chirish
  └─ GET  /blacklist/api/check/:phone - AJAX tekshirish
```

### 3. Scripts
```
scripts/test-sms-template.js (79 lines)
  └─ SMS shablon test script
  └─ 5 ta test case
  └─ Ishlatish: node scripts/test-sms-template.js
```

### 4. Hujjatlar
```
NEW_FEATURES_PLAN.md (480 lines)
  └─ Yangi funksiyalar rejasi
  └─ Har bir funksiya uchun batafsil reja
  └─ Deploy qilish yo'riqnomasi

YANGI_FUNKSIYALAR_README.md (450 lines)
  └─ Yakuniy hisobot
  └─ Ishga tushirish qo'llanmasi
  └─ Troubleshooting

CHANGELOG.md (bu fayl)
  └─ Barcha o'zgarishlar ro'yxati
```

### 5. Eski hujjatlar (oldingi sessiyadan)
```
TIZIM_TEKSHIRUVI_2025-10-07.md
UPGRADE_PLAN_VAQT_VA_RISK.md
scripts/getSessionNonInteractive.js
scripts/hash-password.js
scripts/server_install.sh
scripts/server_update.sh
scripts/upgrade-security.sh
src/config/keywords.js
src/services/historyScraper_temp.js
src/web/views/groups/telegram-list.ejs
```

---

## 🔧 O'ZGARTIRILGAN FAYLLAR (11 ta)

### 1. src/services/smsService.js
**O'zgarishlar**:
```diff
+ const { isBlacklisted } = require('../database/blacklist');

+ // Qora ro'yxat tekshirish (line 29-35)
+ const blacklisted = await isBlacklisted(toPhone);
+ if (blacklisted) {
+   logger.warn(`🚫 Qora ro'yxatda: ${toPhone}`);
+   return { success: false, error: 'blacklisted' };
+ }

+ // SMS shablon o'zgaruvchilari (line 268-337)
+ function renderSMSTemplate(template, variables = {}) {
+   // {{phone}}, {{group}}, {{name}}, {{time}}, {{date}}
+   // ...
+ }

+ // sendSMS() parametr qo'shildi
- async function sendSMS(toPhone, groupId, messageText)
+ async function sendSMS(toPhone, groupId, messageText, templateVars = null)

+ // Export
+ module.exports = {
+   ...
+   renderSMSTemplate,  // YANGI
+   ...
+ }
```

**Jami qo'shilgan**: ~100 lines
**Sabab**: SMS shablon va blacklist integratsiyasi

---

### 2. src/database/index.js
**O'zgarishlar**:
```diff
let db = {
  groups: [],
  phones: [],
  sms_logs: [],
  semysms_phones: [],
  settings: [],
+ blacklist: []  // YANGI
};

// Database load
db = {
  ...
  settings: Array.isArray(parsed.settings) ? parsed.settings : [],
+ blacklist: Array.isArray(parsed.blacklist) ? parsed.blacklist : []  // YANGI
};

// Export
module.exports = {
  initDatabase,
  query,
  getDB: () => db,
+ getDatabase: () => db,  // YANGI alias
+ saveDatabase           // YANGI
};
```

**Jami qo'shilgan**: ~5 lines
**Sabab**: Blacklist table qo'shish

---

### 3. src/web/app.js
**O'zgarishlar**:
```diff
// Routes
const dashboardRouter = require('./routes/dashboard');
...
const messagesRouter = require('./routes/messages');
+ const blacklistRouter = require('./routes/blacklist');  // YANGI

// Protected routes
app.use('/', requireAuth, dashboardRouter);
...
app.use('/messages', requireAuth, messagesRouter);
+ app.use('/blacklist', requireAuth, blacklistRouter);  // YANGI
```

**Jami qo'shilgan**: 2 lines
**Sabab**: Blacklist routes qo'shish

---

### 4. src/index.js
**O'zgarishlar**:
```diff
  } else {
    console.log("[2/3] LOKAL REJIM...");
  }

+ // 3) Telegram Bot (opsional)
+ if (process.env.TELEGRAM_BOT_ENABLED === 'true' && isServerMode) {
+   console.log('[3/4] Telegram bot ishga tushirilmoqda...');
+   try {
+     const { startBot } = require('./services/telegramBot');
+     await startBot();
+     console.log('Telegram bot tayyor');
+   } catch (botError) {
+     console.error('Telegram bot xatosi:', botError.message);
+   }
+ }

- // 3) Web server
- console.log('[3/3] Web dashboard...');
+ // 4) Web server
+ console.log('[4/4] Web dashboard...');
```

**Jami qo'shilgan**: ~15 lines
**Sabab**: Telegram bot integration

---

### 5. .env.example
**O'zgarishlar**:
```diff
WEB_PASSWORD=admin123
SESSION_SECRET=change_this_to_random_secret_key

+ # ===============================================
+ # TELEGRAM BOT (Ixtiyoriy)
+ # ===============================================
+ # Bot token: @BotFather dan oling
+ # Admin IDs: Faqat bu userlar botdan foydalanishi mumkin
+
+ TELEGRAM_BOT_ENABLED=false
+ TELEGRAM_BOT_TOKEN=8364976076:AAGrM4eI1sAh12VRpQEprBMd9u9fUNQimmg
+ TELEGRAM_ADMIN_IDS=

# MODE SOZLAMASI
MODE=demo
```

**Jami qo'shilgan**: ~10 lines
**Sabab**: Bot sozlamalari

---

### 6. package.json
**O'zgarishlar**:
```diff
"dependencies": {
  ...
  "node-telegram-bot-api": "^0.66.0",
+ "telegraf": "^4.16.3",  // YANGI
  "telegram": "^2.22.2",
  ...
}
```

**Jami qo'shilgan**: 1 line
**Sabab**: Telegram bot framework

---

### 7. src/web/views/groups/add.ejs
**O'zgarishlar**:
```diff
<div class="mb-3">
  <label class="form-label">Guruh nomi</label>
- <input type="text" name="name" class="form-control" placeholder="Logistika Toshkent" required>
+ <input type="text" name="name" class="form-control" placeholder="Toshkent Taxi Xizmati" required>
</div>

<div class="mb-3">
  <label class="form-label">Kalit so'zlar (opsional)</label>
- <textarea name="keywords" class="form-control" rows="3" placeholder="yuk bor, transport kerak, mashina bor"></textarea>
+ <textarea name="keywords" class="form-control" rows="3" placeholder="yo'lovchi kerak, tashiman, ketamiz, taxi, taksi"></textarea>
  <small class="text-muted">Vergul bilan ajratilgan...</small>
</div>

<div class="mb-3">
  <label class="form-label">SMS shablon</label>
- <textarea name="sms_template" class="form-control" rows="5" placeholder="Assalomu alaykum! Sizning e'loningizni ko'rdik..."></textarea>
+ <textarea name="sms_template" class="form-control" rows="5" placeholder="Assalomu alaykum {{name}}! {{group}} guruhida {{time}} da raqamingiz {{phone}} ni ko'rdik..."></textarea>
+ <small class="text-muted">
+   <strong>O'zgaruvchilar:</strong>
+   <code>{{phone}}</code> - Telefon raqam,
+   <code>{{group}}</code> - Guruh nomi,
+   <code>{{name}}</code> - Foydalanuvchi ismi,
+   <code>{{time}}</code> - Vaqt,
+   <code>{{date}}</code> - Sana
+ </small>
</div>
```

**Jami o'zgartirilgan**: 3 joyda text o'zgardi, 7 line qo'shildi
**Sabab**: Taxi terminologiyasi + shablon yordam

---

### 8. src/web/views/groups/edit.ejs
**O'zgarishlar**:
```diff
<div class="mb-3">
  <label class="form-label">SMS shablon</label>
  <textarea name="sms_template" class="form-control" rows="5"><%= group.sms_template || '' %></textarea>
+ <small class="text-muted">
+   <strong>O'zgaruvchilar:</strong>
+   <code>{{phone}}</code> - Telefon raqam,
+   <code>{{group}}</code> - Guruh nomi,
+   <code>{{name}}</code> - Foydalanuvchi ismi,
+   <code>{{time}}</code> - Vaqt,
+   <code>{{date}}</code> - Sana
+ </small>
</div>
```

**Jami qo'shilgan**: 7 lines
**Sabab**: Shablon yordam matn

---

### 9. src/web/views/history/scrape.ejs
**O'zgarishlar**:
```diff
<div class="col-md-3 mb-3">
  <label class="form-label">Fayl nomi (ixtiyoriy)</label>
- <input type="text" name="export_name" class="form-control" placeholder="Logistika_2025" maxlength="50">
+ <input type="text" name="export_name" class="form-control" placeholder="Taxi_Skan_2025" maxlength="50">
  <small class="text-muted">Arxivni ajratish uchun</small>
</div>

<!-- TEZ SKAN bo'limida -->
<div class="col-md-4 mb-3">
  <label class="form-label">Fayl nomi (ixtiyoriy)</label>
- <input type="text" name="export_name" class="form-control" placeholder="Tez_skan_2025" maxlength="50">
+ <input type="text" name="export_name" class="form-control" placeholder="Taxi_Tez_Skan_2025" maxlength="50">
  <small class="text-muted">Arxivni ajratish uchun</small>
</div>
```

**Jami o'zgartirilgan**: 2 joyda placeholder
**Sabab**: Taxi terminologiyasi

---

### 10. src/web/routes/groups.js (oldingi sessiyadan)
**O'zgarishlar**: Delete funksiyasi to'g'irlandi, telegram-list route qo'shildi
**Jami qo'shilgan**: ~150 lines

---

### 11. Boshqa o'zgarishlar (oldingi sessiyadan)
```
src/database/models.js - Queue persistence
src/services/historyScraper.js - Queue persistence, resume
src/services/telegramClient.js - Debug logs
src/web/routes/dashboard.js - UI fixes
src/web/views/dashboard.ejs - UI updates
src/web/views/groups/list.ejs - UI updates
```

---

## 📊 STATISTIKA

### Kod Statistikasi:
```
Yangi fayllar:        12 ta
Yangi kod:            ~1500 lines
O'zgargan fayllar:    11 ta
O'zgargan kod:        ~200 lines
------------------------------
Jami:                 ~1700 lines
```

### Funksiyalar:
```
✅ Tugallandi:        3 ta (SMS shablon, Blacklist backend, Bot)
⏳ Qisman:            1 ta (Blacklist UI qoldi)
📋 Reja:              1 ta (Statistika Dashboard)
```

### Vaqt:
```
Sarflangan:           ~6 soat
Qolgan:               ~6 soat
------------------------------
Jami:                 ~12 soat
```

---

## 🔄 DATABASE O'ZGARISHLARI

### Eski struktura:
```json
{
  "groups": [],
  "phones": [],
  "sms_logs": [],
  "semysms_phones": [],
  "settings": []
}
```

### Yangi struktura:
```json
{
  "groups": [],
  "phones": [],
  "sms_logs": [],
  "semysms_phones": [],
  "settings": [],
  "blacklist": [
    {
      "id": 1733561234567,
      "phone": "998901234567",
      "reason": "spam",
      "notes": "Shikoyat qilgan",
      "created_at": "2025-10-07T10:30:00.000Z"
    }
  ]
}
```

**Migration kerak emas** - avtomatik qo'shiladi

---

## 🔌 API O'ZGARISHLARI

### SMS yuborish:
```javascript
// ESKI (hali ishlaydi)
sendSMS(toPhone, groupId, messageText)

// YANGI (shablon bilan)
sendSMS(toPhone, groupId, messageText, {
  phone: '+998901234567',
  group: 'Toshkent Taxi',
  name: 'Jasur',
  foundAt: new Date()
})

// YANGI (blacklist avtomatik tekshiriladi)
const result = await sendSMS(...);
if (result.error === 'blacklisted') {
  console.log('Qora ro\'yxatda');
}
```

### Blacklist:
```javascript
const {
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  getAllBlacklist,
  searchBlacklist,
  getBlacklistStats
} = require('./database/blacklist');

// Tekshirish
if (await isBlacklisted('+998901234567')) {
  console.log('Blocked!');
}

// Qo'shish
await addToBlacklist('+998901234567', 'spam', 'Ko\'p shikoyat');

// Statistika
const stats = await getBlacklistStats();
// { total: 10, byReason: [{reason: 'spam', count: 5}, ...] }
```

### Telegram Bot:
```javascript
const { startBot, stopBot, getBotStatus } = require('./services/telegramBot');

// Boshlash
await startBot();

// To'xtatish
stopBot();

// Status
const status = getBotStatus();
// { isRunning: true, botToken: '836497607...', adminIds: [123456789] }
```

---

## 🔐 XAVFSIZLIK O'ZGARISHLARI

### 1. Blacklist
- ✅ SMS yuborishdan **OLDIN** tekshiriladi
- ✅ Har bir SMS logga "blocked" status yoziladi
- ✅ Qora ro'yxatga sabab va izoh majburiy

### 2. Bot Auth
- ✅ `TELEGRAM_ADMIN_IDS` faqat admin userlar
- ⚠️ Agar bo'sh bo'lsa - **HAMMA USERLAR** (xavfsiz emas!)
- ✅ Har bir komanda logga yoziladi

### 3. Session
- ✅ Bot'da session davom etadi (server restart'dan keyin)
- ✅ Blacklist database'da saqlanadi

---

## 🐛 BUG FIXES (oldingi sessiyadan)

1. **Queue persistence** - PM2 restart'da navbat saqlanadi
2. **Delete guruh** - Faqat monitoring'dan o'chiradi (Telegram'dan chiqmaydi)
3. **Log bloat** - 213MB → 30MB, auto-cleanup
4. **Memory leak** - completedTasks cleanup

---

## ⚙️ DEPLOY QILISH

### 1. Git push:
```bash
cd "C:\Users\Pro\Desktop\Telegramda raqam yigish va sms yuborish"
git status
git add .
git commit -m "feat: Add SMS templates, blacklist, and Telegram bot

- SMS shablon o'zgaruvchilari: {{phone}}, {{group}}, {{name}}, {{time}}, {{date}}
- Qora ro'yxat (blacklist): SMS yuborishdan oldin avtomatik tekshirish
- Telegram bot: /start, /help, /status, /stats, /blacklist
- UI: Logistika → Taxi terminologiyasi

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### 2. Server deploy:
```bash
ssh root@5.189.141.151
cd /root/telegram-sms

# Backup olish
tar -czf ../telegram-sms-backup-$(date +%Y%m%d-%H%M).tar.gz .

# Pull
git pull origin main

# Packages
npm install

# .env yangilash
nano .env
# TELEGRAM_BOT_ENABLED=true
# TELEGRAM_BOT_TOKEN=8364976076:AAGrM4eI1sAh12VRpQEprBMd9u9fUNQimmg
# TELEGRAM_ADMIN_IDS=123456789

# Restart
pm2 restart telegram-sms

# Verify
pm2 logs telegram-sms --lines 50
```

### 3. Test:
```bash
# SMS shablon test
node scripts/test-sms-template.js

# Bot test (Telegram'da)
# /start
# /help
# /stats
# /blacklist +998901234567
```

---

## 🔙 ROLLBACK (Agar kerak bo'lsa)

```bash
# Git rollback
git log --oneline -5
git reset --hard 7235976  # Backup #2

# Server rollback
ssh root@5.189.141.151
cd /root/telegram-sms
git reset --hard 7235976
pm2 restart telegram-sms
```

---

## 📞 KEYINGI QADAM

1. **Deploy qiling** (skan tugagach)
2. **Test qiling** (bot, blacklist, shablon)
3. **Blacklist UI yarating** (1 soat)
4. **Bot'ni to'ldiring** (2 soat)
5. **Statistika Dashboard** (3 soat)

---

## 📚 HUJJATLAR

**O'qing**:
- `YANGI_FUNKSIYALAR_README.md` - Batafsil qo'llanma
- `NEW_FEATURES_PLAN.md` - Keyingi qadamlar
- `CHANGELOG.md` - Bu fayl

**Test**:
- `scripts/test-sms-template.js` - SMS shablon test

---

**Versiya**: v2.0.0
**Sana**: 2025-10-07
**Status**: ✅ Tayyor (deploy qilinmagan)

🚀 **Hammasi tayyor - deploy qiling!**
