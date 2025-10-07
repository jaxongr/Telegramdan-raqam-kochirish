#!/bin/bash
set -e

APP_DIR="/root/telegram-sms"
cd "$APP_DIR"

echo "[1/3] Pulling latest code (if repo)..."
if [ -d .git ]; then
  git pull --ff-only || true
fi

echo "[2/3] Updating dependencies..."
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --production
fi

echo "[3/3] Restarting PM2..."
pm2 restart telegram-sms || pm2 start ecosystem.config.js --env production
pm2 save
pm2 logs telegram-sms --lines 20 --nostream

