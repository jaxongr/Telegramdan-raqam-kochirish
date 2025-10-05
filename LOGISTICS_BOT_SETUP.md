# 🚛 Logistics Bot - Sozlash Ko'rsatmasi

## O'rnatish

### 1. `.env` faylni to'ldirish

```env
# Bot token (BotFather'dan olingan)
LOGISTICS_BOT_TOKEN=8417102559:AAHYiDE8GQBCaqjTNdS4ZXCV0FaF8ME2lxo

# Mavzuli guruh ID (Yoldauz | Rasmiy)
LOGISTICS_TARGET_GROUP_ID=-1002345678901

# Admin ID'lari (vergul bilan ajratilgan)
LOGISTICS_ADMIN_IDS=123456789,987654321
```

---

## Guruh Sozlash

### 2. "Yoldauz | Rasmiy" guruhni yaratish

1. **Telegram'da yangi guruh yarating**
   - Guruh nomi: **Yoldauz | Rasmiy**
   - Type: **Supergroup**

2. **Forum (Topics) yoqish**
   - Guruh Settings → General → Topics
   - "Enable Topics" ni yoqing

3. **2 ta topic yarating:**
   - 📦 **Yukchi e'lonlari** (Topic ID: 1)
   - 🚗 **Dispecher e'lonlari** (Topic ID: 2)

4. **Bot'ni admin qiling:**
   - Guruhga bot'ni qo'shing: `@<botusername>`
   - Bot'ni admin qiling (Post Messages huquqi kerak)

5. **Guruh ID'sini olish:**

```bash
# Bot'ga /start buyrug'ini yuboring
# Keyin guruhga xabar yuboring va bot console'da ID'ni ko'rsatadi
```

yoki

```bash
# Forwarded xabar orqali:
# 1. Guruhdan biror xabarni forward qiling @username_to_id_bot ga
# 2. ID'ni ko'rsatadi (masalan: -1002345678901)
```

---

## Admin ID olish

### 3. O'z Telegram ID'ingizni olish

1. **@username_to_id_bot ga /start yuboring**
2. ID'ni ko'rsatadi (masalan: `123456789`)
3. `.env` fayliga qo'shing:

```env
LOGISTICS_ADMIN_IDS=123456789
```

Bir nechta admin bo'lsa:

```env
LOGISTICS_ADMIN_IDS=123456789,987654321,456123789
```

---

## Ishlash Mexanizmi

### E'lon Klassifikatsiyasi (Ball Tizimi)

Bot har e'lonni **ball tizimi** orqali baholaydi:

```
≤15 logistics guruh     = +30 ball (YUKCHI)
≤2 e'lon/kun (kalendar) = +25 ball (YUKCHI)
Logistika so'z YO'Q     = +20 ball (YUKCHI)
Ayol ismi YO'Q          = +15 ball (YUKCHI)
Bitta yo'nalish         = +20 ball (YUKCHI)

40+ ball → YUKCHI
40 dan kam → DISPECHER
```

---

## Foydalanuvchi Registration

### User Journey:

1. **User /start bosadi**
   - Bot 3 kunlik BEPUL trial beradi

2. **Telefon raqam beradi**
   - Bot adminga xabar yuboradi
   - Admin `/invite_{user_id}` buyrug'i bilan guruhga qo'shadi

3. **3 kundan keyin**
   - Bot userni guruhdan chiqaradi
   - To'lov qilishni so'raydi

4. **To'lov**
   - User karta raqamiga pul o'tkazadi
   - Screenshot yuboradi
   - Admin tasdiqlaydi
   - Bot qayta guruhga qo'shadi

---

## Admin Paneli

### Admin buyruqlari:

- `/start` - Botni ishga tushirish
- `/stats` - Statistika
- `/invite_123456789` - Userni guruhga qo'shish

### Admin Inline Buttons (har e'londa):

```
[📞 Raqamni olish]
[✅ Yukchi] [❌ Dispecher]  ← Faqat adminlar ko'radi
```

Admin "Yukchi" yoki "Dispecher" bosib to'g'rilasa:
- Database'ga saqlanadi
- Keyingi safar o'sha user'ning e'lonlari to'g'ri klassifikatsiya qilinadi (learning)

---

## To'lov Narxlari

Dashboarddan sozlanadi (keyingi versiyada):

```
Kunlik: 5000 so'm
Haftalik: 30000 so'm
Oylik: 100000 so'm
Donali (bir marta): 10000 so'm
```

---

## Database

Logistics bot alohida database ishlatadi: `data/logistics.db`

### Jadvallar:

- `yukchi_phones` - Yukchi raqamlar (umrboqiy)
- `dispecher_phones` - Dispecher raqamlar (umrboqiy)
- `announcements` - Barcha e'lonlar
- `user_classifications` - User klassifikatsiyalari (learning)
- `subscribers` - Bot foydalanuvchilari
- `payments` - To'lovlar
- `admin_corrections` - Admin to'g'rilashlari
- `duplicate_cache` - Dublikat detection (1 soat)

---

## Test Qilish

### Lokal test:

1. `.env` faylda `MODE=local` qo'ying
2. `npm start`
3. Bot'ga `/start` yuboring
4. Guruhda test e'lon yuboring (telefon raqam bilan)

### Server deploy:

1. Kodni serverga yuklang
2. `.env` faylda `MODE=server` qo'ying
3. `pm2 restart telegram-sms`
4. `pm2 logs telegram-sms` - loglarni kuzating

---

## Dashboard (Keyingi Versiya)

Dashboard'da ko'rinadi:

- 📊 Statistika (yukchi/dispecher raqamlar, e'lonlar)
- 💰 To'lovlar (pending, approved)
- 👥 Subscribers (trial, active, expired)
- 📦 Export (Excel, JSON)
- ⚙️ Sozlamalar (narxlar, trial muddati)

---

## Muammoli Holatlar

### Bot xabar yubormayapti?

✅ **Tekshiring:**
1. `LOGISTICS_TARGET_GROUP_ID` to'g'ri kiritilgan
2. Bot guruhda admin
3. Bot'da "Post Messages" huquqi bor
4. Topic ID'lar to'g'ri (1, 2)

### Klassifikatsiya noto'g'ri?

✅ **To'g'rilash:**
1. E'londa "Yukchi" yoki "Dispecher" tugmasini bosing (admin)
2. Bot keyingi safar to'g'ri klassifikatsiya qiladi

### User guruhga qo'shilmayapti?

✅ **Tekshiring:**
1. Bot guruhda admin
2. `LOGISTICS_ADMIN_IDS` to'g'ri
3. `/invite_{user_id}` buyrug'ini to'g'ri ishlating

---

## Xavfsizlik

🔒 **Muhim:**

- Bot token'ni hech kimga bermang
- `.env` faylni Git'ga commit qilmang
- Admin ID'larni faqat ishonchli odamlarga bering
- Database backup oling (har hafta)

---

## Keyingi Bosqichlar

- [ ] Dashboard yaratish (to'lovlar, statistika)
- [ ] To'lov tizimi (admin tasdiqlash paneli)
- [ ] Export funksiyasi (yukchi/dispecher raqamlar)
- [ ] AI integration (classification'ni yaxshilash)
- [ ] Multi-language support (rus, ingliz)

---

**Savollar bo'lsa telegram'da yozing! 🚀**
