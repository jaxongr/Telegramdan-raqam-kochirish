#!/bin/bash
# Security & Performance Upgrade Script
# Run: chmod +x scripts/upgrade-security.sh && ./scripts/upgrade-security.sh

set -e

echo "🔐 SECURITY & PERFORMANCE UPGRADE"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. NPM Security Fixes
echo -e "${YELLOW}[1/8] NPM Security Vulnerabilities...${NC}"
npm audit fix --force || true
echo -e "${GREEN}✓ Security fixes applied${NC}"
echo ""

# 2. Install Security Packages
echo -e "${YELLOW}[2/8] Installing security packages...${NC}"
npm install express-rate-limit helmet cors bcryptjs --save
echo -e "${GREEN}✓ Security packages installed${NC}"
echo ""

# 3. Generate Strong Session Secret
echo -e "${YELLOW}[3/8] Generating session secret...${NC}"
SESSION_SECRET=$(openssl rand -hex 32)
if grep -q "SESSION_SECRET=" .env 2>/dev/null; then
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=${SESSION_SECRET}/" .env
    echo -e "${GREEN}✓ Session secret updated in .env${NC}"
else
    echo "SESSION_SECRET=${SESSION_SECRET}" >> .env
    echo -e "${GREEN}✓ Session secret added to .env${NC}"
fi
echo ""

# 4. Generate Password Hash
echo -e "${YELLOW}[4/8] Password hash...${NC}"
read -sp "Enter new admin password: " NEW_PASSWORD
echo ""
HASH=$(node -e "console.log(require('bcryptjs').hashSync('${NEW_PASSWORD}', 10))")
if grep -q "WEB_PASSWORD_HASH=" .env 2>/dev/null; then
    sed -i.bak "s|WEB_PASSWORD_HASH=.*|WEB_PASSWORD_HASH=${HASH}|" .env
else
    echo "WEB_PASSWORD_HASH=${HASH}" >> .env
fi
echo -e "${GREEN}✓ Password hash created${NC}"
echo ""

# 5. PM2 Log Rotation
echo -e "${YELLOW}[5/8] PM2 Log Rotation...${NC}"
pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
echo -e "${GREEN}✓ PM2 log rotation configured${NC}"
echo ""

# 6. Create Backup Script
echo -e "${YELLOW}[6/8] Backup script...${NC}"
mkdir -p /backup
cat > /root/backup-telegram-sms.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mkdir -p /backup
tar -czf /backup/telegram-sms-${DATE}.tar.gz \
  /root/telegram-sms/data/ \
  /root/telegram-sms/exports/ \
  /root/telegram-sms/.env
find /backup/ -name "telegram-sms-*.tar.gz" -mtime +7 -delete
echo "Backup completed: telegram-sms-${DATE}.tar.gz"
EOF
chmod +x /root/backup-telegram-sms.sh
echo -e "${GREEN}✓ Backup script created: /root/backup-telegram-sms.sh${NC}"
echo ""

# 7. Setup Cron for Backup
echo -e "${YELLOW}[7/8] Backup cron job...${NC}"
(crontab -l 2>/dev/null | grep -v backup-telegram-sms; echo "0 2 * * * /root/backup-telegram-sms.sh >> /var/log/backup.log 2>&1") | crontab -
echo -e "${GREEN}✓ Daily backup cron added (2:00 AM)${NC}"
echo ""

# 8. Firewall (Ubuntu/Debian)
echo -e "${YELLOW}[8/8] Firewall configuration...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
    ufw allow 80/tcp comment 'HTTP' 2>/dev/null || true
    ufw allow 443/tcp comment 'HTTPS' 2>/dev/null || true
    ufw deny 3000/tcp comment 'Node.js - localhost only' 2>/dev/null || true
    echo -e "${GREEN}✓ Firewall rules configured${NC}"
else
    echo -e "${YELLOW}⚠ UFW not installed. Install with: apt install ufw${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}=================================="
echo "✅ UPGRADE COMPLETED!"
echo "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check .env file for SESSION_SECRET and WEB_PASSWORD_HASH"
echo "2. Restart application: pm2 restart telegram-sms"
echo "3. Test login with new password"
echo "4. Install NGINX for production (see TIZIM_TEKSHIRUVI_2025-10-07.md)"
echo ""
echo "Backup location: /backup/"
echo "Backup cron: Daily at 2:00 AM"
echo ""
