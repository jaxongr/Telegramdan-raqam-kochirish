# MONITORING MUAMMOSI VA YECHIMI

## 🔴 MUAMMO

Sizning sistemada **25 ta guruh** bor, lekin monitoring faqat **22 ta guruhni** kuzatayapti.

**Sabab:** 3 ta guruh database'da `active = 0` yoki `active = NULL` holatda bo'lib qolgan.

## 📊 MUAMMONI TEKSHIRISH

models.js:9 qatorida `getActiveGroups()` funksiyasi faqat active guruhlarni qaytaradi:

```javascript
async function getActiveGroups() {
  return await query('SELECT * FROM groups WHERE active = 1 OR active = true');
}
```

Shuning uchun inactive guruhlar monitoring'ga kiritilmayapti.

## ✅ YECHIM

### 1. Serverga ulanish va kod yangilash

```bash
ssh root@188.245.180.98
cd /root/telegram-sms
git pull
```

### 2. Qaysi guruhlar inactive ekanligini tekshirish

```bash
node check_groups.js
```

Bu command sizga barcha guruhlarni ko'rsatadi:
- ✓ = Active
- ✗ = Inactive

Agar inactive guruhlar bo'lsa, ularning ID, nomi va telegram_id'si ko'rsatiladi.

### 3. Inactive guruhlarni tuzatish

```bash
node fix_inactive_groups.js
```

Bu script:
1. Barcha guruhlarni ko'rsatadi (active/inactive)
2. Barcha guruhlarni `active = 1` va `sms_enabled = 1` qiladi
3. Natijani tekshiradi

Yoki SQL bilan to'g'ridan-to'g'ri:

```bash
sqlite3 data/database.sqlite "UPDATE groups SET active = 1, sms_enabled = 1;"
```

### 4. Monitoring'ni qayta ishga tushirish

```bash
pm2 restart telegram-sms
```

### 5. Natijani tekshirish

```bash
pm2 logs telegram-sms --lines 50
```

Log'da quyidagicha yozuv paydo bo'lishi kerak:

```
✅ 25 ta guruh topildi
✅ MUVAFFAQIYATLI: 25 ta guruh monitoring ostida
```

## 📝 QOSHIMCHA MA'LUMOT

**Yaratilgan fayllar:**

1. **check_groups.js** - Barcha guruhlarni active/inactive holatini ko'rsatadi
2. **fix_inactive_groups.js** - Inactive guruhlarni tuzatadi
3. **check_active_groups.js** - Detalliroq tekshirish (check_groups.js bilan bir xil)

**Monitoring qanday ishlaydi:**

1. `telegramClient.js:66` - `getActiveGroups()` chaqiriladi
2. `models.js:9` - Faqat `active = 1` guruhlar qaytariladi
3. `telegramClient.js:67` - Log'da guruhlar soni ko'rsatiladi
4. Event handler barcha xabarlarni ushlab, guruh active yoki yo'qligini tekshiradi

## 🚨 AGAR MUAMMO DAVOM ETSA

1. Barcha guruhlar active ekanligini qayta tekshiring:
   ```bash
   node check_groups.js
   ```

2. Database'ni to'g'ridan-to'g'ri tekshiring:
   ```bash
   sqlite3 data/database.sqlite "SELECT id, name, active FROM groups;"
   ```

3. PM2 log'larni tekshiring:
   ```bash
   pm2 logs telegram-sms --lines 100
   ```

4. Monitoring qayta ishga tushganini tekshiring:
   ```bash
   pm2 status
   ```

## 🎯 KUTILGAN NATIJA

Fix'dan keyin:
- ✅ 25 ta guruh active
- ✅ Monitoring 25 ta guruhni kuzatadi
- ✅ "G'uzor - Qarshi - Toshkent" guruhidagi xabarlar ham ushlanadi
- ✅ PM2 log'da "✅ 25 ta guruh topildi" ko'rsatiladi
