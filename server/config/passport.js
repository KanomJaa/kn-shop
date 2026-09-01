// ================================================================
//  Passport.js Configuration — Google & Facebook OAuth
// ================================================================

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

// NOTE: ไม่ใช้ session (session: false ทุก route) จึงไม่ต้อง serializeUser/deserializeUser

// ==================== GOOGLE STRATEGY ====================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already linked to this Google account
            let user = await User.findOne({ googleId: profile.id });
            if (user) return done(null, user);

            // Check if email already exists
            const email = profile.emails?.[0]?.value;
            if (email) {
                user = await User.findOne({ email });
                if (user) {
                    // Link Google to existing account
                    user.googleId = profile.id;
                    if (!user.avatar && profile.photos?.[0]?.value) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            const displayName = profile.displayName || 'user';
            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = await User.create({
                username: displayName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now().toString(36),
                email: email || `google_${profile.id}@knshop.com`,
                password: randomPass,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value || '',
            });
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
    console.log('✅ Google OAuth configured');
} else {
    console.log('ℹ️ Google OAuth not configured (set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)');
}

// ==================== FACEBOOK STRATEGY ====================
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'email', 'photos'],
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already linked
            let user = await User.findOne({ facebookId: profile.id });
            if (user) return done(null, user);

            // Check email
            const email = profile.emails?.[0]?.value;
            if (email) {
                user = await User.findOne({ email });
                if (user) {
                    user.facebookId = profile.id;
                    if (!user.avatar && profile.photos?.[0]?.value) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new user
            const displayName = profile.displayName || 'user';
            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = await User.create({
                username: displayName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now().toString(36),
                email: email || `fb_${profile.id}@knshop.com`,
                password: randomPass,
                facebookId: profile.id,
                avatar: profile.photos?.[0]?.value || '',
            });
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
    console.log('✅ Facebook OAuth configured');
} else {
    console.log('ℹ️ Facebook OAuth not configured (set FACEBOOK_APP_ID & FACEBOOK_APP_SECRET)');
}

module.exports = passport;
