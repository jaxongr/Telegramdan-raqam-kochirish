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
    echo "⚙️ Creating .env file..."
    cat > .env << 'EOF'
# MODE SOZLAMASI
MODE=production

# TELEGRAM API SOZLAMALARI
TELEGRAM_API_ID=20330024
TELEGRAM_API_HASH=09f429bbd6278fc534798fb349239e0e
TELEGRAM_PHONE=+998901579450
TELEGRAM_SESSION=1AgAOMTQ5LjE1NC4xNjcuNDEBu3y1L8XP3USYh9r1tVJXRaH6kdJrdCo0bzxLqV6sF9BaU32BRoqN4yFnxQsB7fEDWADDXIbf4Jqetkt7aYGyszaNMHMr0sCiIYwwcmUbRHoX2UdNXA1PyjSLeNFR8ACuJmH7PxlUFRZuzTI1gbVnMpX9GiBK+h+5KwXC9Qdl38XELUDXjmm9ux87VChlcghm3fhVxJkQfsZ367+A5N5CT3LLkKb/J9vdDZBFj56zoeKewwDvNrqLgZWcv/N97rmTOKRabpFa52tw9HjzBlpsexjHeMKcwRRNilJxClAhohU+64w+eZkNMV0SIXLpfgjjhVmEehXYhU/cG8QJLg5laI0=

# SEMYSMS API SOZLAMALARI
SEMYSMS_API_KEY=c83da9b60ac2fa1463887a85735cb711

# WEB DASHBOARD
WEB_PORT=3000
WEB_USERNAME=admin
WEB_PASSWORD=admin123
SESSION_SECRET=production_secret_key_$(openssl rand -hex 16)

# SMS SETTINGS
SMS_DAILY_LIMIT_PER_NUMBER=2
SMS_DELAY_SECONDS=1

# SYSTEM
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=Asia/Tashkent
EOF
    echo "✅ .env file created"
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
