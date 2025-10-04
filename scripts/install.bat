@echo off
echo ========================================
echo   TELEGRAM SMS TIZIM - O'RNATISH
echo ========================================
echo.

echo [1/4] Node.js tekshirilmoqda...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo XATO: Node.js o'rnatilmagan!
    echo Node.js yuklab oling: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js topildi

echo.
echo [2/4] Paketlar o'rnatilmoqda...
call npm install
if %errorlevel% neq 0 (
    echo XATO: npm install xatosi
    pause
    exit /b 1
)
echo ✓ Paketlar o'rnatildi

echo.
echo [3/4] Sozlash...
node scripts/setup.js
if %errorlevel% neq 0 (
    echo XATO: Sozlashda xato
    pause
    exit /b 1
)

echo.
echo [4/4] PM2 o'rnatish (global)...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo Ogohlantirish: PM2 o'rnatilmadi (admin huquq kerak)
    echo PM2 siz ham ishlatishingiz mumkin: npm start
)

echo.
echo ========================================
echo   O'RNATISH TUGADI!
echo ========================================
echo.
echo ISHGA TUSHIRISH:
echo   npm start             (oddiy rejim)
echo   npm run pm2:start     (background)
echo.
echo WEB DASHBOARD:
echo   http://localhost:3000
echo.
pause
