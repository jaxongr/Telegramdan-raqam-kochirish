const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const session = require('express-session');
let SQLiteStore = null;
try {
  SQLiteStore = require('connect-sqlite3')(session);
} catch (_) {
  SQLiteStore = null;
}
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Routes
const dashboardRouter = require('./routes/dashboard');
const groupsRouter = require('./routes/groups');
const phonesRouter = require('./routes/phones');
const smsRouter = require('./routes/sms');
const semysmsRouter = require('./routes/semysms');
const settingsRouter = require('./routes/settings');
const historyRouter = require('./routes/history');
const messagesRouter = require('./routes/messages');
const blacklistRouter = require('./routes/blacklist');
const routesRouter = require('./routes/routes');
const telegramGroupsRouter = require('./routes/telegramGroups');
const analyticsRouter = require('./routes/analytics');

// YANGI: Broadcast routes
const accountsRouter = require('./routes/accounts');
const broadcastRouter = require('./routes/broadcast');
const filesRouter = require('./routes/files');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false); // Disable EJS caching for development

// Middleware
app.disable('x-powered-by');

// Compression - 50-80% size reduction
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// Vaqtincha helmet o'chirilgan - login test uchun
// app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// Static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '1d' : 0,
  etag: true
}));

// Request logging - only in development or errors
if (!isProd) {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

if (isProd) {
  // Secure cookies behind proxy/load balancer
  app.set('trust proxy', 1);
}

const sessionOptions = {
  name: process.env.SESSION_NAME || 'sid',
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 soat
    httpOnly: true,
    sameSite: 'lax',
    secure: false // HTTP da ishlashi uchun false (HTTPS kerak bo'lsa true qiling)
  }
};

if (isProd && SQLiteStore) {
  const dir = require('path').join(__dirname, '../../data');
  sessionOptions.store = new SQLiteStore({
    db: 'sessions.sqlite',
    dir
  });
}

app.use(session(sessionOptions));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/login');
}

// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const validUsername = process.env.WEB_USERNAME || 'admin';
  const validPassword = process.env.WEB_PASSWORD || 'admin123';
  const passwordHash = process.env.WEB_PASSWORD_HASH || '';

  console.log('🔐 Login attempt:', { username, passwordLength: password?.length, validUsername, hasHash: !!passwordHash });

  try {
    let ok = false;
    if (passwordHash) {
      ok = (username === validUsername) && (await bcrypt.compare(password, passwordHash));
      console.log('🔑 Hash check:', { ok, usernameMatch: username === validUsername });
    } else {
      ok = (username === validUsername) && (password === validPassword);
      console.log('🔑 Plain check:', { ok, usernameMatch: username === validUsername, passwordMatch: password === validPassword });
    }

    if (ok) {
      req.session.isAuthenticated = true;
      req.session.username = username;
      console.log('✅ Login success, session:', req.session.id);
      return res.redirect('/');
    }
  } catch (e) {
    console.error('❌ Login check error:', e);
  }

  console.log('❌ Login failed');
  res.render('login', { error: 'Login yoki parol noto\'g\'ri' });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected routes
app.use('/', requireAuth, dashboardRouter);
app.use('/groups', requireAuth, groupsRouter);
app.use('/phones', requireAuth, phonesRouter);
app.use('/sms', requireAuth, smsRouter);
app.use('/semysms', requireAuth, semysmsRouter);
app.use('/history', requireAuth, historyRouter);
app.use('/settings', requireAuth, settingsRouter);
app.use('/messages', requireAuth, messagesRouter);
app.use('/blacklist', requireAuth, blacklistRouter);
app.use('/routes', requireAuth, routesRouter);
app.use('/telegram-groups', requireAuth, telegramGroupsRouter);
app.use('/analytics', requireAuth, analyticsRouter);

// YANGI: Broadcast routes
app.use('/accounts', requireAuth, accountsRouter);
app.use('/broadcast', requireAuth, broadcastRouter);
app.use('/files', requireAuth, filesRouter);

// 404
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html><head><title>404</title></head><body style="font-family: Arial; padding: 50px; text-align: center;">
    <h1>404 - Sahifa topilmadi</h1>
    <p><a href="/">Bosh sahifaga qaytish</a></p>
    </body></html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Web app xatosi:', err);
  const showStack = process.env.NODE_ENV !== 'production';
  res.status(500).send(`
    <!DOCTYPE html>
    <html><head><title>Xato</title></head><body style="font-family: Arial; padding: 50px;">
    <h1>Xato yuz berdi</h1>
    <p><strong>${err.message}</strong></p>
    ${showStack ? `<pre style="background: #f5f5f5; padding: 20px; border-radius: 5px; overflow: auto;">${err.stack}</pre>` : ''}
    <p><a href="/">Bosh sahifaga qaytish</a></p>
    </body></html>
  `);
});

module.exports = app;
