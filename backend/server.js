const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shop-management';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  try {
    const Product = require('./model/Product');
    const Sale = require('./model/Sale');
    await Product.syncIndexes();
    await Sale.syncIndexes();
    console.log('🔧 Synced MongoDB indexes');
  } catch (e) {
    console.warn('⚠️  Failed to sync indexes:', e.message);
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
// app.use('/api/auth', require('./routes/auth'));

// Basic route
app.get('/', (req, res) => {
  res.send('🛍️ Shop Management System API is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});