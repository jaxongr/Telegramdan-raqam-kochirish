#!/bin/bash

# Deployment script for VPS server
# Usage: ssh root@5.189.141.151 'bash -s' < deploy.sh

set -e

SERVER_IP="5.189.141.151"
APP_DIR="/root/telegram-sms"
REPO_URL="https://github.com/jaxongr/Telegramdan-raqam-kochirish.git"

echo "🚀 Starting deployment to $SERVER_IP..."

# 1. Install required packages
echo "📦 Installing Node.js and PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 2. Clone or update repository
echo "📥 Cloning repository..."
if [ -d "$APP_DIR" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# 4. Setup .env file (if not exists)
if [ ! -f .env ]; then
    echo "⚙️ .env topilmadi. .env.example dan nusxa olinmoqda..."
    if [ -f .env.example ]; then
      cp .env.example .env
      sed -i 's/^MODE=.*/MODE=production/' .env || true
      sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' .env || true
      echo "⚠️ Iltimos .env faylini serverda to\'ldiring (TELEGRAM_*, SEMYSMS_*, WEB_*)."
    else
      echo "⚠️ .env.example topilmadi. Iltimos .env ni qo'lda yarating."
    fi
fi

# 5. Create necessary directories
mkdir -p data logs exports

# 6. Stop existing PM2 process
echo "⏹️ Stopping existing process..."
pm2 delete telegram-sms 2>/dev/null || true

# 7. Start with PM2
echo "▶️ Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# 8. Save PM2 configuration
pm2 save

# 9. Setup PM2 startup
pm2 startup systemd -u root --hp /root

echo "✅ Deployment completed successfully!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs telegram-sms"
echo "🌐 Access dashboard: http://$SERVER_IP:3000"
