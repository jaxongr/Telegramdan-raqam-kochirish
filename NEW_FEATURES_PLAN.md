# 🎉 YANGI FUNKSIYALAR REJASI

**Sana**: 2025-10-07
**Holat**: Qisman bajarildi

---

## ✅ BAJARILDI

### 1. SMS Shablon O'zgaruvchilari ⭐

**Status**: ✅ Tugallandi

**Fayllar**:
- `src/services/smsService.js` - `renderSMSTemplate()` funksiyasi
- `src/web/views/groups/add.ejs` - Shablon yordam matnlari
- `src/web/views/groups/edit.ejs` - Shablon yordam matnlari
- `scripts/test-sms-template.js` - Test script

**Qo'llab-quvvatlanadigan o'zgaruvchilar**:
- `{{phone}}` - Telefon raqam
- `{{group}}` - Guruh nomi
- `{{name}}` - Foydalanuvchi ismi
- `{{time}}` - Vaqt (HH:MM)
- `{{date}}` - Sana (DD.MM.YYYY)

**Misol**:
```
Assalomu alaykum {{name}}! {{group}} guruhida {{time}}da raqamingiz {{phone}}ni ko'rdik.
```

**Test**:
```bash
node scripts/test-sms-template.js
```

---

### 2. Qora Ro'yxat (Blacklist) ⭐⭐⭐

**Status**: ✅ Tugallandi (UI qoldi)

**Fayllar**:
- `src/database/blacklist.js` - CRUD operations
- `src/database/index.js` - `blacklist: []` qo'shildi
- `src/services/smsService.js` - SMS yuborishdan oldin blacklist tekshirish
- `src/web/routes/blacklist.js` - Web routes

**Qolgan ishlar**:
- [ ] `src/web/views/blacklist/list.ejs` - Ro'yxat sahifasi
- [ ] `src/web/views/blacklist/add.ejs` - Qo'shish sahifasi
- [ ] Sidebar'ga link qo'shish

**Funksiyalar**:
- Qora ro'yxatga qo'shish (telefon, sabab, izoh)
- Qora ro'yxatdan o'chirish
- Qora ro'yxat tekshirish (SMS yuborishdan oldin)
- Qidirish va statistika

---

## ⏳ BOSHLANGAN LEKIN TUGALLANMAGAN

### 3. Statistika Dashboard ⭐⭐

**Reja**:
- Kunlik/haftalik telefon raqam yig'ilgan statistika
- SMS yuborilgan/yuborilmagan soni
- Eng faol guruhlar (top 5)
- Chart.js bilan grafiklar

**Kerakli fayllar**:
```
src/web/routes/stats.js
src/web/views/stats/dashboard.ejs
```

**Package**:
```bash
# (Agar kerak bo'lsa)
# npm install chart.js
```

---

### 4. Telegram Bot Interface ⭐⭐⭐⭐

**Status**: ✅ Tugallandi

**Fayllar**:
- `src/services/telegramBot.js` - Bot service
- `src/index.js` - Bot integration
- `.env.example` - Bot sozlamalari

**Package**: `telegraf` (o'rnatilgan ✅)

**Komandalar**:
- `/start` - Botni boshlash
- `/help` - Yordam
- `/status` - Hozirgi skanerlash holati
- `/stats` - Umumiy statistika
- `/scan [guruh_nomi]` - Skanerlash boshlash (TODO)
- `/blacklist <raqam>` - Qora ro'yxatga qo'shish
- `/pause` - To'xtatish (TODO)
- `/resume` - Davom ettirish (TODO)

**Bot Token**: `8364976076:AAGrM4eI1sAh12VRpQEprBMd9u9fUNQimmg`

**Sozlash (.env)**:
```
TELEGRAM_BOT_ENABLED=true
TELEGRAM_BOT_TOKEN=8364976076:AAGrM4eI1sAh12VRpQEprBMd9u9fUNQimmg
TELEGRAM_ADMIN_IDS=123456789,987654321
```

**Xavfsizlik**:
- Faqat `TELEGRAM_ADMIN_IDS` da ko'rsatilgan userlar botdan foydalana oladi
- Agar `ADMIN_IDS` bo'sh bo'lsa, barcha userlar foydalanishi mumkin (xavfsiz emas!)

---

## 💡 KEYINGI BOSQICHLAR

### Priority 1 - Blacklist UI (1 soat)
```bash
# 1. list.ejs yaratish
# 2. add.ejs yaratish
# 3. Sidebar'ga link qo'shish
# 4. Test qilish
```

### Priority 2 - Statistika Dashboard (3 soat)
```bash
# 1. Stats route yaratish
# 2. Dashboard view yaratish
# 3. Chart.js integratsiyasi
# 4. API endpoints
```

### Priority 3 - Telegram Bot (6 soat)
```bash
# 1. Telegraf setup
# 2. Komandalar qo'shish
# 3. Admin tekshirish
# 4. Testing
```

---

## 🔧 Deploy Qilish

### Lokal Test:
```bash
# Restart kerak yo'q - faqat brauzer refresh
```

### Server Deploy:
```bash
# 1. Git push
git add .
git commit -m "Add SMS templates and blacklist"
git push

# 2. Server'da pull
ssh root@5.189.141.151
cd /root/telegram-sms
git pull

# 3. PM2 restart
pm2 restart telegram-sms

# 4. Verify
pm2 logs telegram-sms --lines 50
```

---

## 📝 ESLATMALAR

1. **SMS Shablon** - `sendSMS()` funksiyasiga 4-parameter qo'shildi:
   ```javascript
   sendSMS(toPhone, groupId, messageText, templateVars)
   ```

2. **Blacklist** - Avtomatik tekshiriladi, log'ga "blocked" status bilan yoziladi

3. **Database** - JSON format, `data/database.json` da `blacklist: []` array qo'shildi

4. **Restart** - Hech qaysi funksiya restart talab qilmaydi ✅

---

**Keyingi qadam**: Blacklist UI yaratish (1 soat)
