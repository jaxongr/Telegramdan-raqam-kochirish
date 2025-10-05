# Yangi Session Olish (Copy-Paste)

## 1. Serverga kirish
```bash
ssh root@5.189.141.151
```

## 2. PM2 ni to'xtatish
```bash
cd /root/telegram-sms && pm2 stop telegram-sms
```

## 3. Session olish scriptini ishga tushirish
```bash
cd /root/telegram-sms && node get-session.js
```

Telegram'dan SMS kod keladi, kodni kiriting va Enter bosing.

## 4. Session nusxalash
Ekranda uzun session qatori chiqadi. Uni to'liq nusxalang (Ctrl+Shift+C yoki sichqoncha bilan tanlab)

## 5. Session'ni .env ga yozish
Session ni quyidagi buyruqda `YANGI_SESSION_SHU_YERGA` o'rniga qo'ying:

```bash
cd /root/telegram-sms && sed -i 's|^TELEGRAM_SESSION=.*|TELEGRAM_SESSION=YANGI_SESSION_SHU_YERGA|' .env
```

Masalan:
```bash
cd /root/telegram-sms && sed -i 's|^TELEGRAM_SESSION=.*|TELEGRAM_SESSION=1AgAOMTQ5LjE1NC4xNjcuNDEBu...|' .env
```

## 6. PM2 ni qayta ishga tushirish
```bash
cd /root/telegram-sms && pm2 start ecosystem.config.js && pm2 save
```

## 7. Loglarni tekshirish
```bash
pm2 logs telegram-sms --lines 50
```

Agar "✓ Telegram client ulandi" va "✓ Monitoring boshlandi" ko'rsatsa - hammasi tayyor!
