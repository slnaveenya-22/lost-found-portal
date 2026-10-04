require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');


const authRoutes = require('./authRoutes');
const lostItemRoutes = require('./lostItemRoutes');
const foundItemRoutes = require('./foundItemRoutes');
const searchRoutes = require('./searchRoutes');
const itemReadRoutes = require('./itemReadRoutes');
const itemWriteRoutes = require('./itemWriteRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const matchRoutes = require('./matchRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items/lost', lostItemRoutes);
app.use('/api/items/found', foundItemRoutes);
app.use('/api/items', itemReadRoutes);
app.use('/api/items/search', searchRoutes);
app.use('/api/items', itemWriteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchRoutes);

app.use('/uploads', express.static('uploads'));



app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Lost & Found API' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('unhandled error:', err.message);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.code === 'ENOENT') {
    return res.status(500).json({
      error: 'Upload directory missing. Please contact support.',
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5 MB)' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});