#!/bin/bash
# Run this script on the server: bash deploy_server.sh

set -e

APP_DIR="/root/telegram-sms"
REPO_URL="https://github.com/jaxongr/Telegramdan-raqam-kochirish.git"

echo "🚀 Deployment boshlandi..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Node.js o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs git
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 o'rnatilmoqda..."
    npm install -g pm2
fi

# Clone or update
if [ -d "$APP_DIR" ]; then
    echo "📥 Repository yangilanmoqda..."
    cd $APP_DIR && git pull origin main
else
    echo "📥 Repository clone qilinmoqda..."
    git clone $REPO_URL $APP_DIR && cd $APP_DIR
fi

cd $APP_DIR

# Create .env if not exists
if [ ! -f .env ]; then
    echo "⚙️ .env yaratilmoqda..."
    cp .env.example .env
    # Update with production values
    sed -i 's/MODE=demo/MODE=production/' .env
    sed -i 's/TELEGRAM_SESSION=/TELEGRAM_SESSION=1AgAOMTQ5LjE1NC4xNjcuNDEBu3y1L8XP3USYh9r1tVJXRaH6kdJrdCo0bzxLqV6sF9BaU32BRoqN4yFnxQsB7fEDWADDXIbf4Jqetkt7aYGyszaNMHMr0sCiIYwwcmUbRHoX2UdNXA1PyjSLeNFR8ACuJmH7PxlUFRZuzTI1gbVnMpX9GiBK+h+5KwXC9Qdl38XELUDXjmm9ux87VChlcghm3fhVxJkQfsZ367+A5N5CT3LLkKb/J9vdDZBFj56zoeKewwDvNrqLgZWcv/N97rmTOKRabpFa52tw9HjzBlpsexjHeMKcwRRNilJxClAhohU+64w+eZkNMV0SIXLpfgjjhVmEehXYhU/cG8QJLg5laI0=/' .env
    sed -i 's/SEMYSMS_API_KEY=/SEMYSMS_API_KEY=c83da9b60ac2fa1463887a85735cb711/' .env
fi

# Install dependencies
echo "📦 Dependencies o'rnatilmoqda..."
npm install --production

# Create directories
mkdir -p data logs exports

# Stop old process
echo "⏹️  Eski jarayon to'xtatilmoqda..."
pm2 delete telegram-sms 2>/dev/null || true

# Start with PM2
echo "▶️  PM2 bilan ishga tushirilmoqda..."
pm2 start ecosystem.config.js --env production

# Save PM2
pm2 save

# Setup startup
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "✅ Deployment tugadi!"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs telegram-sms"
echo "🌐 Dashboard: http://5.189.141.151:3000"
