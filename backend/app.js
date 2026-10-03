const express = require('express');
const cors = require('cors');
const authRoutes = require('./authRoutes');
const lostItemRoutes = require('./lostItemRoutes');
const foundItemRoutes = require('./foundItemRoutes');
const searchRoutes = require('./searchRoutes');
const itemDetailRoutes = require('./itemDetailRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items/lost', lostItemRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/items/found', foundItemRoutes);
app.use('/api/items/search', searchRoutes);
app.use('/api/items/detail', itemDetailRoutes);

app.get('/', (req, res) => {
  res.send('Lost & Found API is running');
});

module.exports = app;