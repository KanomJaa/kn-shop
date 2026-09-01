const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categorySlug: { type: String, required: true },           // for quick lookup
    description: { type: String, default: '' },
    image: { type: String, default: '' },              // uploaded image path
    imgLabel: { type: String, default: '' },              // placeholder text
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: -1 },              // -1 = unlimited
    soldCount: { type: Number, default: 0 },
    deliveryMethod: { type: String, enum: ['gift', 'trade', 'drop', 'service'], default: 'gift' },
    isActive: { type: Boolean, default: true },
    isHot: { type: Boolean, default: false },               // show 🔥 hot badge
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

// Virtual for average rating
productSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'product',
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
