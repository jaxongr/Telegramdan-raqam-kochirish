# 📚 TO'LIQ FOYDALANISH QO'LLANMASI

## 📋 MUNDARIJA
1. [Tizim Haqida](#tizim-haqida)
2. [O'rnatish Bosqichma-Bosqich](#ornatish)
3. [Birinchi Ishga Tushirish](#birinchi-ishga-tushirish)
4. [Web Dashboard](#web-dashboard)
5. [Guruhlar Boshqaruvi](#guruhlar-boshqaruvi)
6. [SemySMS Sozlash](#semysms-sozlash)
7. [Misollar](#misollar)
8. [Xatolarni Hal Qilish](#xatolarni-hal-qilish)

---

## 🎯 TIZIM HAQIDA

Bu tizim **24/7 avtomatik ishlaydi** va:

1. **Telegram guruhlaringizni kuzatadi**
2. **Kalit so'zlar bilan xabarlarni filtr qiladi**
3. **100+ formatda telefon raqamlarni topadi**
4. **Avtomatik SMS yuboradi** (SemySMS orqali)
5. **Statistika va loglar** yig'adi

### Qanday ishlaydi?

```
Telegram Guruh → Yangi Xabar → Kalit So'z Bor?
    ↓                              ↓
   Yo'q                           Ha
    ↓                              ↓
O'tkazib yuborish          Telefon Topish
                                   ↓
                           SMS Yuborish (Round-Robin)
                                   ↓
                           Bazaga Saqlash + Log
```

---

## 🔧 O'RNATISH

### WINDOWS UCHUN

**1. Node.js o'rnatish**
- https://nodejs.org/ dan yuklab oling
- "Windows Installer (.msi)" ni tanlang
- O'rnatish - Next, Next, Install
- Terminal ochib tekshiring: `node --version`

**2. Loyihani tayyorlash**
```cmd
cd Desktop
cd "Telegramda raqam yigish va sms yuborish"
```

**3. Avtomatik o'rnatish**
```cmd
scripts\install.bat
```

Yoki qo'lda:
```cmd
npm install
node scripts/setup.js
```

### LINUX/MAC UCHUN

**1. Node.js o'rnatish**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Mac (Homebrew)
brew install node
```

**2. Loyihani tayyorlash**
```bash
cd ~/Desktop
cd "Telegramda raqam yigish va sms yuborish"
chmod +x scripts/install.sh
./scripts/install.sh
```

---

## 🚀 BIRINCHI ISHGA TUSHIRISH

### 1. Telegram API Olish

**Bosqichlar:**

1. https://my.telegram.org/ ochiladi
2. Telefon raqamingiz bilan login
3. "API development tools" bosiladi
4. Yangi app yarating:
   - App title: `SMS Automation`
   - Short name: `smsbot`
   - Platform: `Desktop`
5. **API ID** va **API Hash** ni ko'chirib oling

### 2. SemySMS API Olish

1. https://semysms.net/ ro'yxatdan o'ting
2. Balans to'ldiring (minimum 1000 so'm)
3. "API" bo'limida API key oling
4. Telefon raqam qo'shing (sozlamalar)

### 3. Sozlash (setup.js)

```bash
node scripts/setup.js
```

**Savollar:**
```
Telegram API ID: 12345678
Telegram API Hash: abcdef1234567890abcdef1234567890
SemySMS API Key: your-semysms-api-key
Web port (3000): [Enter]
Admin username (admin): [Enter]
Admin password (admin123): strong_password_123
Database (1=SQLite): 1
```

### 4. Ishga Tushirish

**Development (loglarni ko'rish uchun):**
```bash
npm start
```

**Production (background):**
```bash
npm run pm2:start
npm run pm2:logs     # Loglarni ko'rish
npm run pm2:stop     # To'xtatish
```

### 5. Web Dashboard Ochish

Browser:
```
http://localhost:3000
```

Login:
- Username: `admin`
- Password: `admin123` (yoki o'zingiz belgilagan)

---

## 🖥️ WEB DASHBOARD

### Bosh Sahifa

**Statistika:**
- ✅ Guruhlar soni (faol/jami)
- ✅ Telefon raqamlar (unikal)
- ✅ Bugun yuborilgan SMS
- ✅ SemySMS balans

**Telegram Status:**
- 🟢 Ulangan / 🔴 Uzilgan
- 🟢 Monitoring faol / 🟡 O'chiq

**Oxirgi SMS:**
- Vaqt, raqam, guruh, xabar, holat

---

## 👥 GURUHLAR BOSHQARUVI

### Guruh Qo'shish

1. **Guruhlar** → **Qo'shish**
2. Telegram guruhlaringiz ro'yxatdan tanlang
3. To'ldiring:
   - **Nom**: Mening logistika guruhim
   - **Kalit so'zlar** (opsional): `yuk bor, transport kerak`
   - **SMS shablon**: `Assalomu alaykum! Sizning e'loningizni ko'rdik.`
4. **Saqlash**

### SMS Shablon

**O'zgaruvchilar:**
- `{ism}` - Guruh nomi
- `{yuk}` - Yuk turi (agar topilsa)
- `{joy}` - Joylashuv (agar topilsa)

**Misol:**
```
Assalomu alaykum!

Sizning "{yuk}" yuklash e'loningizni ko'rdik.

Bizning xizmatlarimiz:
- Tez yetkazib berish
- Arzon narxlar
- Ishonchli

Qo'ng'iroq qiling: +998901234567
```

### Kalit So'zlar

Tizim **100+ standart kalit so'z** bilan keladi:

**Logistika:**
- yuk bor, mashina kerak, transport bor, haydovchi kerak

**Transport:**
- isuzu, kamaz, fura, trailer, konteyner, tent

**Joylashuv:**
- toshkent, samarqand, buxoro, andijon, farg'ona

**Maxsulot:**
- sement, pilomaterial, g'isht, mebel, oziq-ovqat

**Custom kalit so'z qo'shish:**
```
yuk bor, transport kerak, arzon narx, tez yetkazish
```
(vergul bilan ajratilgan)

---

## 📱 SEMYSMS SOZLASH

### Telefon Raqam Qo'shish

1. **SemySMS raqamlar** → **Qo'shish**
2. Telefon raqamni kiriting: `+998901234567`
3. Balans avtomatik tekshiriladi
4. **Saqlash**

### Round-Robin Algoritm

Tizim navbat bilan ishlatadi:

```
1-raqam → SMS → 2-raqam → SMS → 3-raqam → SMS → 1-raqam...
```

**Afzalliklari:**
- Bir raqam overload bo'lmaydi
- Balans teng taqsimlanadi
- Agar biri ishlamasa, keyingisiga o'tadi

### Test SMS

1. **SemySMS raqamlar** sahifasida
2. **Test SMS** tugmasi
3. To'ldiring:
   - **Qayerdan**: `+998901234567` (sizning SemySMS raqam)
   - **Qayerga**: `+998901111111` (test raqam)
   - **Matn**: `Test SMS`
4. **Yuborish**

### Balansni Tekshirish

**Avtomatik:**
- Har 1 soatda balans yangilanadi
- SMS yuborishdan oldin tekshiriladi

**Qo'lda:**
- **Barcha balanslarni yangilash** tugmasi

---

## 📊 TELEFON RAQAMLAR BAZASI

### Filtr

- **Guruh bo'yicha**: Ma'lum guruhdan kelgan raqamlar
- **Umrbod unikal**: Hech qachon SMS yuborilmaydigan raqamlar

### Umrbod Unikal Qilish

Agar kimdir "SMS yubormaslik" so'rasa:

1. **Telefon raqamlar** → Raqamni toping
2. **Umrbod unikal qilish** tugmasi
3. ✅ Bu raqamga hech qachon SMS yuborilmaydi

### CSV Export

- **Export** tugmasi
- Excel yoki Google Sheets ga import qiling

---

## 📝 SMS LOGLAR

### Ko'rish

**SMS loglar** sahifasi:
- Vaqt
- Qayerga
- Guruh
- Xabar matni
- Holat (Yuborildi ✅ / Xato ❌)
- Xato sababi (agar bo'lsa)

### Filtr

- **Guruh bo'yicha**
- **Holat bo'yicha** (success/failed)
- **Limit**: Ko'rsatish soni

---

## 💡 MISOLLAR

### Misol 1: Logistika Guruhi

**Guruh:**
- Nom: `Logistika Toshkent`
- Telegram ID: `-1001234567890`
- Kalit so'zlar: `yuk bor, mashina kerak, fura bor`

**Telegram xabar:**
```
Yuk bor!
Toshkentdan Samarqandga 5 tonna sement
Telefon: 90-123-45-67
```

**Natija:**
- ✅ Kalit so'z topildi: "yuk bor"
- ✅ Telefon topildi: `+998901234567`
- ✅ SMS yuborildi
- ✅ Bazaga saqlandi

### Misol 2: Ko'p Raqamli Xabar

**Telegram xabar:**
```
Transport kerak!

Toshkent: 90-111-22-33
Samarqand: 91-222-33-44
Buxoro: 93-333-44-55
```

**Natija:**
- ✅ 3 ta telefon topildi
- ✅ Har biriga SMS yuborildi
- ✅ Round-robin: 3 xil SemySMS raqamdan

### Misol 3: Noto'g'ri Format

**Telegram xabar:**
```
Mashina bor. Tel: 88 810 68 28
```

**Natija:**
- ✅ Kalit so'z: "mashina bor"
- ✅ Telefon: `88 810 68 28` → `+998881068828`
- ✅ SMS yuborildi

---

## 🔧 XATOLARNI HAL QILISH

### Telegram ulanmayapti

**Xato:** `Telegram client xatosi`

**Yechim:**
1. API ID/Hash to'g'ri ekanini tekshiring:
   ```bash
   cat .env | grep TELEGRAM
   ```
2. Session faylini o'chiring:
   ```bash
   rm telegram_session.session
   npm start
   ```
3. Qayta login qiling

### SMS yuborilmayapti

**Xato:** `No active SemySMS phones`

**Yechim:**
1. SemySMS raqam qo'shing
2. Balansni tekshiring (minimum 100 so'm)
3. API key to'g'ri ekanini tekshiring:
   ```bash
   cat .env | grep SEMYSMS
   ```

**Xato:** `Daily limit reached`

**Yechim:**
- Bu raqamga bugun 2 marta SMS yuborilgan
- Ertaga avtomatik reset bo'ladi
- Yoki limitni oshiring (.env: `SMS_DAILY_LIMIT_PER_NUMBER=5`)

### Telefon topilmayapti

**Test qiling:**
```bash
node -e "console.log(require('./src/services/phoneExtractor').extractPhones('90-123-45-67'))"
```

**Natija:** `[ '+998901234567' ]`

Agar bo'sh array `[]` bo'lsa:
- Format noto'g'ri
- Operator kod noto'g'ri (71, 90, 91, ... bo'lishi kerak)

### Database xatosi

**SQLite xatosi:**
```bash
mkdir data
npm start
```

**PostgreSQL/MySQL xatosi:**
- Connection string tekshiring
- Database yaratilganligini ko'ring
- User privileges tekshiring

### Web dashboard ochmayapti

1. Port band bo'lmaganligini tekshiring:
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # Linux/Mac
   lsof -i :3000
   ```

2. Boshqa portda ishga tushiring:
   ```bash
   # .env da o'zgartiring
   WEB_PORT=8080
   npm start
   ```

---

## 🎓 KEYINGI QADAMLAR

### 1. VPS ga joylashtirish

**Ubuntu Server:**
```bash
# SSH orqali ulanish
ssh user@your-server-ip

# Node.js o'rnatish
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git clone
git clone https://github.com/your-repo/telegram-sms.git
cd telegram-sms

# O'rnatish
npm install
node scripts/setup.js

# PM2 bilan ishga tushirish
npm install -g pm2
npm run pm2:start

# Auto-restart on reboot
pm2 startup
pm2 save
```

### 2. Domain ulash

**Nginx:**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/telegram-sms
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

```bash
sudo ln -s /etc/nginx/sites-available/telegram-sms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 📞 YORDAM

**Muammo yechilmasa:**

1. **Loglarni ko'ring:**
   ```bash
   npm run pm2:logs
   # yoki
   cat logs/app-*.log
   ```

2. **GitHub Issues:**
   - https://github.com/your-repo/issues

3. **Telegram:**
   - @yourusername

---

## ✅ CHECKLIST

O'rnatish to'g'ri bo'lganligini tekshirish:

- [ ] Node.js o'rnatilgan (`node --version`)
- [ ] npm packages o'rnatilgan (`npm install`)
- [ ] .env fayl yaratilgan
- [ ] Telegram API sozlangan
- [ ] SemySMS API sozlangan
- [ ] Database ishlamoqda
- [ ] Web dashboard ochiladi (http://localhost:3000)
- [ ] Login qila olasiz
- [ ] Telegram ulangan (dashboard da yashil)
- [ ] Guruh qo'shilgan
- [ ] SemySMS raqam qo'shilgan
- [ ] Test SMS yuborildi ✅

**HAMMASI TAYYOR! 🎉**

---

**Muvaffaqiyatli biznes avtomatlashtirishlar tilaymiz! 🚀**
