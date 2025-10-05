#!/bin/bash
# Server yangilash scripti

echo "🔄 Serverdan yangilanish boshlandi..."

# Git pull
cd /root/telegram-sms
git pull origin main

# PM2 restart
pm2 restart telegram-sms

# Loglarni ko'rsatish
echo ""
echo "✅ Yangilandi! Oxirgi 30 qator log:"
echo ""
pm2 logs telegram-sms --lines 30 --nostream
