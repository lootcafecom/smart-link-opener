require('dotenv').config();

const path = require('path');
const express = require('express');
const { initDb } = require('./db');
const linksRouter = require('./routes/links');
const redirectRouter = require('./routes/redirect');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

app.use(express.json());

// Serve the frontend (/, /style.css, /app.js) as static files first.
app.use(express.static(FRONTEND_DIR));

// JSON API for creating/inspecting smart links.
app.use('/api/links', linksRouter);

// Anything left (e.g. GET /aB3xQ9z) is treated as a short slug and redirected.
app.use('/', redirectRouter);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Smart Link Opener running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
