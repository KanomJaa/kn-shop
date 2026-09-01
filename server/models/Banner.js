const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    image: { type: String, required: true },       // uploaded image path
    link: { type: String, default: '' },            // optional click URL
    isActive: { type: Boolean, default: true },
    isHot: { type: Boolean, default: false },       // show 🔥 hot badge
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
