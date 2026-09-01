const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },        // e.g. 'Blox Fruits'
    slug: { type: String, required: true, unique: true },        // e.g. 'bloxfruits'
    description: { type: String, default: '' },
    icon: { type: String, default: 'fa-solid fa-gamepad' },      // Font Awesome class
    image: { type: String, default: '' },                         // uploaded image path
    headerColor: { type: String, default: '#0288d1' },                  // gradient start color
    isActive: { type: Boolean, default: true },
    isHot: { type: Boolean, default: false },                     // show 🔥 hot badge
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
