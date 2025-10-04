# ⚡ TEZKOR BOSHLASH

## 🎯 Real Telegram va SemySMS bilan ishlash

### 1️⃣ API kalitlarni olish

**Telegram:**
- https://my.telegram.org/apps → API ID va API HASH oling

**SemySMS:**
- https://semysms.net → Ro'yxatdan o'ting → API KEY oling

### 2️⃣ .env faylini sozlash

```bash
# .env.example dan nusxa oling
cp .env.example .env
```

`.env` faylini tahrirlang:

```env
# Telegram
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890  
TELEGRAM_PHONE=+998901234567

# SemySMS
SEMYSMS_API_KEY=your_api_key_here

# Mode
MODE=production
```

### 3️⃣ Ishga tushirish

```bash
npm start
```

Birinchi safar:
1. Telegram kodini kiriting (telegramga keladi)
2. 2FA parol (agar yoqilgan bo'lsa)
3. Session avtomatik saqlanadi

### 4️⃣ Dashboard

```
http://localhost:3000
Login: admin
Parol: admin123
```

### 5️⃣ Guruh qo'shish

1. Dashboard → **Guruhlar** → **Yangi guruh**
2. Telegram guruhini tanlang
3. Kalit so'zlar: `yuk,transport,mashina`
4. SMS shablon yozing
5. Saqlang

### 6️⃣ SemySMS telefon qo'shish

1. Dashboard → **SemySMS raqamlar** → **Yangi raqam**
2. Telefon: `+998901234567`
3. Saqlang

### 7️⃣ Test

Telegram guruhga yozing:
```
Toshkentga yuk kerak
Tel: 90-123-45-67
```

Natija:
- Terminal'da ko'rasiz: "📞 1 ta raqam topildi"
- Dashboard'da raqam ko'rinadi
- SMS yuborishingiz mumkin

---

## 📝 Batafsil Qo'llanma

- **To'liq setup:** `REAL_SETUP.md`
- **Funksiyalar:** `QOLLANMA.md`

---

## ⚠️ Muhim

- `.env` faylini Git'ga qo'shmang!
- API kalitlarni maxfiy saqlang
- Session'ni backup qiling

---

**Muvaffaqiyat! 🎉**
