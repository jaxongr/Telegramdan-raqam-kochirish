# 📱 Telegram SMS Automation Tizim

Telegram guruhlaridan telefon raqamlarni avtomatik yig'ib SMS yuboradigan to'liq tizim.

## 🚀 XUSUSIYATLAR

### ✅ Telegram Monitoring
- **Gramjs** (MTProto) bilan real-time monitoring
- Copy-protection bypass (API orqali to'liq matnni olish)
- Maksimum 5 ta guruhni bir vaqtda kuzatish
- 100+ kalit so'z bilan avtomatik filterlash

### ✅ Telefon Extraction (100+ Format)
- `901234567` → `+998901234567`
- `+998(90)123-45-67` → `+998901234567`
- `90-123-45-67`, `90 123 45 67`, `90.123.45.67`
- `t.me/+998901234567`, `wa.me/998901234567`
- Kontekst bilan ishlash (Toshkent, Beeline, va h.k.)
- Barcha O'zbekiston operator kodlari

### ✅ SemySMS Integration
- 100 tagacha sender raqam
- Round-robin algoritm
- Balans auto-check
- Kunlik limit (2 SMS/raqam)
- Xato handling va retry

### ✅ Web Dashboard (O'zbek tilida)
- 📊 Real-time statistika
- 👥 Guruhlar boshqaruvi
- 📞 Telefon raqamlar bazasi
- 💬 SMS loglar
- 📱 SemySMS raqamlar
- ⚙️ Sozlamalar

### ✅ Database
- Auto-detect: SQLite / PostgreSQL / MySQL
- Full schema bilan tayyor
- CSV export

## 📦 O'RNATISH

### Windows

```cmd
# 1. Loyihani yuklab olish yoki git clone
cd "Telegramda raqam yigish va sms yuborish"

# 2. Install script ishga tushirish
scripts\install.bat
```

### Linux / Mac

```bash
# 1. Loyihani yuklab olish
cd "Telegramda raqam yigish va sms yuborish"

# 2. Install script ishga tushirish
chmod +x scripts/install.sh
./scripts/install.sh
```

### Manual o'rnatish

```bash
# 1. Dependencies
npm install

# 2. Sozlash
node scripts/setup.js

# 3. Ishga tushirish
npm start
```

## ⚙️ SOZLASH

### 1. Telegram API

https://my.telegram.org/apps ga kiring va API credentials oling:
- API ID
- API Hash

### 2. SemySMS API

https://semysms.net/ saytidan API key oling.

### 3. .env Fayl

`scripts/setup.js` orqali avtomatik yoki qo'lda:

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
SEMYSMS_API_KEY=your_api_key

DATABASE_TYPE=sqlite
WEB_PORT=3000
WEB_USERNAME=admin
WEB_PASSWORD=admin123
# yoki xavfsizroq:
# WEB_PASSWORD_HASH=<bcrypt_hash>

# Rejim: demo | server | production
MODE=server
```

## 🏃 ISHGA TUSHIRISH

### Oddiy rejim
```bash
npm start
```

### Background (PM2)
```bash
npm run pm2:start
npm run pm2:logs
npm run pm2:stop
```

### Web Dashboard
```
http://localhost:3000
Login: admin
Parol: admin123
```

## 📁 FAYL STRUKTURASI

```
├── src/
│   ├── database/
│   │   ├── index.js          # Database connection
│   │   └── models.js         # CRUD operations
│   ├── services/
│   │   ├── telegramMonitor.js   # Telegram monitoring
│   │   ├── phoneExtractor.js   # 100+ format extraction
│   │   └── smsService.js        # SemySMS integration
│   ├── web/
│   │   ├── app.js               # Express app
│   │   ├── routes/              # Web routes
│   │   └── views/               # EJS templates
│   ├── utils/
│   │   └── logger.js            # Winston logging
│   └── index.js                 # Main entry
├── scripts/
│   ├── setup.js                 # Interactive setup
│   ├── install.bat              # Windows installer
│   └── install.sh               # Linux/Mac installer
├── data/                        # SQLite database (auto-created)
├── logs/                        # Log files (auto-created)
├── .env                         # Config (create from setup)
├── package.json
└── ecosystem.config.js          # PM2 config
```

## 🔧 ISHLATISH

### 1. Guruh Qo'shish

Web dashboard → Guruhlar → Qo'shish

- Telegram guruhlaringiz ro'yxatdan tanlang
- SMS shablon yozing
- Custom kalit so'zlar (opsional)
- Faollashtiring

### 2. SemySMS Raqamlar

Web dashboard → SemySMS raqamlar → Qo'shish

- Telefon raqam kiriting
- Balans auto-check
- Test SMS yuboring

### 3. Monitoring

Tizim avtomatik:
1. Guruhlarni kuzatadi
2. Kalit so'zlarni qidiradi
3. Telefon raqamlarni extract qiladi
4. SMS yuboradi (round-robin)
5. Logga yozadi

### 4. Statistika

Bosh sahifada:
- Guruhlar soni
- Telefon raqamlar
- Yuborilgan SMS
- SemySMS balans

## 🎯 KALIT SO'ZLAR (100+)

```
yuk bor, mashina kerak, transport bor, haydovchi kerak,
isuzu bor, kamaz bor, fura kerak, tonna yuk, tovar bor,
arzon, tez, bugun, ertaga, toshkent, samarqand, buxoro,
sement, pilomaterial, g'isht, mebel, qurilish, ...
```

Guruh sozlamalarida custom kalit so'z qo'shishingiz mumkin.

## 📊 DATABASE SCHEMA

### groups
- id, name, telegram_id, keywords, sms_template, active

### phones
- id, phone, group_id, first_date, last_date, repeat_count, lifetime_unique

### sms_logs
- id, to_phone, group_id, message, sent_at, semysms_phone, status, error

### semysms_phones
- id, phone, balance, status, last_used, total_sent

### settings
- key, value

## 🛠️ TROUBLESHOOTING

### Telegram ulanmayapti
- API ID/Hash to'g'ri ekanligini tekshiring
- https://my.telegram.org/apps dan qayta oling
- Session faylini o'chiring va qayta login qiling

### SMS yuborilmayapti
- SemySMS API key to'g'ri ekanligini tekshiring
- SemySMS raqamlar balansini tekshiring
- Kunlik limit (2 SMS/raqam) ga yetmaganligini ko'ring

### Database xatosi
- SQLite uchun: `data/` papka mavjudligini tekshiring
- PostgreSQL/MySQL uchun: Connection string to'g'ri ekanligini tekshiring

### Telefon raqam topilmayapti
- `src/services/phoneExtractor.js` da test qiling:
```bash
node -e "require('./src/services/phoneExtractor').testExtraction()"
```

## 📝 API ENDPOINTS

### Web Dashboard Routes
- `GET /` - Bosh sahifa
- `GET /groups` - Guruhlar ro'yxati
- `GET /phones` - Telefon raqamlar
- `GET /sms` - SMS loglar
- `GET /semysms` - SemySMS raqamlar
- `GET /settings` - Sozlamalar

## 🔐 XAVFSIZLIK

- `.env` faylini git ga qo'shmang
- Web dashboard parolni o'zgartiring
- SemySMS API key ni xavfsiz saqlang
- VPS da firewall sozlang (faqat 3000 port)

## 📈 PRODUCTION DEPLOYMENT

### VPS (Ubuntu/Debian)

```bash
# 1. Node.js o'rnatish
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Git clone
git clone <repo>
cd telegram-sms-automation

# 3. O'rnatish
chmod +x scripts/install.sh
./scripts/install.sh

# 4. PM2 bilan ishga tushirish
npm run pm2:start

# 5. Auto-restart on reboot
pm2 startup
pm2 save
```

### Nginx Reverse Proxy (opsional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🤝 YORDAM

Savol yoki muammo bo'lsa:
1. README ni qayta o'qing
2. Logs tekshiring: `npm run pm2:logs` yoki `logs/` papka
3. GitHub Issues

## 📄 LICENSE

MIT

---

**Made with ❤️ for logistics business**

🚚 Avtomatlashtiring. Vaqt tejang. Daromad oshiring.
