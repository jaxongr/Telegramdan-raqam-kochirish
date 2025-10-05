const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
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

// YANGI: Broadcast routes
const accountsRouter = require('./routes/accounts');
const broadcastRouter = require('./routes/broadcast');
const filesRouter = require('./routes/files');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 soat
}));

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

  if (username === validUsername && password === validPassword) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Login yoki parol noto\'g\'ri' });
  }
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
  res.status(500).send(`
    <!DOCTYPE html>
    <html><head><title>Xato</title></head><body style="font-family: Arial; padding: 50px;">
    <h1>Xato yuz berdi</h1>
    <p><strong>${err.message}</strong></p>
    <pre style="background: #f5f5f5; padding: 20px; border-radius: 5px; overflow: auto;">${err.stack}</pre>
    <p><a href="/">Bosh sahifaga qaytish</a></p>
    </body></html>
  `);
});

module.exports = app;
