#!/bin/bash

echo "========================================"
echo "  TELEGRAM SMS TIZIM - O'RNATISH"
echo "========================================"
echo ""

# Node.js tekshirish
echo "[1/4] Node.js tekshirilmoqda..."
if ! command -v node &> /dev/null; then
    echo "XATO: Node.js o'rnatilmagan!"
    echo "Node.js yuklab oling: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js topildi: $(node --version)"

# npm paketlar
echo ""
echo "[2/4] Paketlar o'rnatilmoqda..."
npm install
if [ $? -ne 0 ]; then
    echo "XATO: npm install xatosi"
    exit 1
fi
echo "✓ Paketlar o'rnatildi"

# Sozlash
echo ""
echo "[3/4] Sozlash..."
node scripts/setup.js
if [ $? -ne 0 ]; then
    echo "XATO: Sozlashda xato"
    exit 1
fi

# PM2 (global)
echo ""
echo "[4/4] PM2 o'rnatish (global)..."
sudo npm install -g pm2 2>/dev/null || npm install -g pm2
if [ $? -ne 0 ]; then
    echo "Ogohlantirish: PM2 o'rnatilmadi"
    echo "PM2 siz ham ishlatishingiz mumkin: npm start"
fi

echo ""
echo "========================================"
echo "  O'RNATISH TUGADI!"
echo "========================================"
echo ""
echo "ISHGA TUSHIRISH:"
echo "  npm start             (oddiy rejim)"
echo "  npm run pm2:start     (background)"
echo ""
echo "WEB DASHBOARD:"
echo "  http://localhost:3000"
echo ""
