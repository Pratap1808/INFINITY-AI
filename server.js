require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { attachUser } = require('./middleware/auth');

const chatRoute = require('./routes/chat');
const ownerRoute = require('./routes/owner');
const configRoute = require('./routes/config');
const memoryRoute = require('./routes/memory');
const weatherRoute = require('./routes/weather');
const newsRoute = require('./routes/news');
const searchRoute = require('./routes/search');
const imageRoute = require('./routes/image');
const uploadRoute = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security -----------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // frontend sets its own via meta tag if needed
  })
);

const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow same-origin/non-browser requests (no origin header) and configured origins
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '20mb' })); // generous limit for base64 images
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests/minute/IP across the API
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use(attachUser);

// --- API routes -----------------------------------------------------------
app.use('/api/chat', chatRoute);
app.use('/api/owner', ownerRoute);
app.use('/api/config', configRoute);
app.use('/api/memory', memoryRoute);
app.use('/api/weather', weatherRoute);
app.use('/api/news', newsRoute);
app.use('/api/search', searchRoute);
app.use('/api/image', imageRoute);
app.use('/api/upload', uploadRoute);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'INFINITY AI', time: new Date().toISOString() });
});

// --- Serve frontend (single deployable service on Render) -----------------
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// --- Error handler ----------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`\n✨ INFINITY AI backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
