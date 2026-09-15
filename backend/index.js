require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./authRoutes');
const lostItemRoutes = require('./lostItemRoutes');
const foundItemRoutes = require('./foundItemRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items/lost', lostItemRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/items/found', foundItemRoutes);

app.get('/', (req, res) => {
  res.send('Lost & Found API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});