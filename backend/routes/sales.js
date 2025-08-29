const express = require('express');
const router = express.Router();
const Sale = require('../model/Sale');
const Product = require('../model/Product');

// GET all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).populate('items.product');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('items.product');
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create sale
// Body: { items: [{ product: productId, quantity }], tax? }
router.post('/', async (req, res) => {
  try {
    const { items = [], tax = 0 } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    // Load products and validate stock
    const productIds = items.map(i => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const idToProduct = new Map(products.map(p => [String(p._id), p]));

    for (const item of items) {
      const product = idToProduct.get(String(item.product));
      if (!product) return res.status(400).json({ message: 'Invalid product in items' });
      if (item.quantity <= 0) return res.status(400).json({ message: 'Quantity must be > 0' });
      if (product.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
    }

    // Compute subtotal and prepare sale items using current price
    const saleItems = items.map(item => {
      const product = idToProduct.get(String(item.product));
      return {
        product: product._id,
        quantity: item.quantity,
        priceAtSale: product.price
      };
    });

    const subtotal = saleItems.reduce((sum, it) => sum + it.priceAtSale * it.quantity, 0);
    const total = subtotal + tax;

    // Decrement stock atomically-ish (simple sequential for now)
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
    }

    const sale = new Sale({ items: saleItems, subtotal, tax, total });
    const saved = await sale.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;


