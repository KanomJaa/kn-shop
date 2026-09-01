const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 30, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    points: { type: Number, default: 0, min: 0 },
    robloxUsername: { type: String, default: '' },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    // Email verification
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    // Social login
    googleId: { type: String, default: null },
    facebookId: { type: String, default: null },
    avatar: { type: String, default: '' },
    // Refresh token version (increment to invalidate all refresh tokens)
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailVerifyToken;
    delete obj.emailVerifyExpires;
    delete obj.tokenVersion;
    delete obj.googleId;
    delete obj.facebookId;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
