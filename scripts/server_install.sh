#!/bin/bash
set -e

APP_DIR="/root/telegram-sms"

echo "[1/6] Installing prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y curl git >/dev/null 2>&1 || true

echo "[2/6] Installing Node.js 18 and PM2..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs >/dev/null 2>&1
fi
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 >/dev/null 2>&1
fi

echo "[3/6] Preparing app directory..."
mkdir -p "$APP_DIR" "$APP_DIR/data" "$APP_DIR/logs" "$APP_DIR/exports"
cd "$APP_DIR"

echo "[4/6] Installing dependencies (production)..."
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --production
fi

echo "[5/6] Starting with PM2..."
pm2 delete telegram-sms 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "[6/6] Done. Logs: pm2 logs telegram-sms"
echo "Dashboard: http://$(hostname -I | awk '{print $1}'):${WEB_PORT:-3000}"

