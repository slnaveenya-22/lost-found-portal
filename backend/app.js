const express = require('express');
const cors = require('cors');
const authRoutes = require('./authRoutes');
const lostItemRoutes = require('./lostItemRoutes');
const foundItemRoutes = require('./foundItemRoutes');
const searchRoutes = require('./searchRoutes');
const itemReadRoutes = require('./itemReadRoutes');
const itemWriteRoutes = require('./itemWriteRoutes');
const dashboardRoutes = require('./dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items/lost', lostItemRoutes);
app.use('/api/items/found', foundItemRoutes);
app.use('/api/items', itemReadRoutes);
app.use('/api/items/search', searchRoutes);
app.use('/api/items', itemWriteRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Static uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Lost & Found API' });
});

// Any /api/* request that didn't match a route above
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Catches errors passed via next(err) or thrown in async handlers,
// and body-parser errors (malformed JSON)
app.use((err, req, res, next) => {
  console.error('unhandled error:', err.message);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;