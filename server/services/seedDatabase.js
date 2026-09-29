const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

async function seedDatabase() {
    try {
        console.log('🌱 Checking seed data...');

        // Create the initial admin only when one does not already exist.
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@knshop.com';
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (!existingAdmin) {
            const adminPassword = process.env.ADMIN_PASSWORD
                || (process.env.NODE_ENV === 'production' ? null : 'admin123');

            if (!adminPassword) {
                console.warn('⚠️ ADMIN_PASSWORD is missing; initial admin was not created');
            } else {
                await User.create({
                    username: process.env.ADMIN_USERNAME || 'admin',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'admin',
                    points: 999999,
                });
                console.log('   ✅ Admin user created');
            }
        }

        // Category → image mapping
        const catImages = {
            bloxfruits: '/uploads/1771480887176-25073779.png',
            petsim99: '/uploads/1771480960015-181679396.png',
            animeadv: '/uploads/1771481061055-462313696.png',
            kinglegacy: '/uploads/1771481107663-231163548.png',
            bladeball: '/uploads/1771481150695-163365411.png',
            brookhaven: '/uploads/1771479009591-390895913.png',
            dahood: '/uploads/1771481267544-995198598.png',
            ttd: '/uploads/1771481323623-179125307.png',
            robux: '/uploads/1771483280196-14785213.jpg',
        };

        // Create categories
        const categories = [
            { name: 'Blox Fruits', slug: 'bloxfruits', icon: 'fa-solid fa-dragon', description: 'ผลปีศาจ, เกมพาส, ดาบ', headerColor: '#0288d1', image: catImages.bloxfruits },
            { name: 'Pet Simulator 99', slug: 'petsim99', icon: 'fa-solid fa-paw', description: 'Gems, Huge Pets, Gamepasses', headerColor: '#7b1fa2', image: catImages.petsim99 },
            { name: 'Anime Adventures', slug: 'animeadv', icon: 'fa-solid fa-khanda', description: 'Units, Gems, Gamepasses', headerColor: '#c62828', image: catImages.animeadv },
            { name: 'King Legacy', slug: 'kinglegacy', icon: 'fa-solid fa-crown', description: 'ดาบ, ผลปีศาจ, Gamepasses', headerColor: '#f57f17', image: catImages.kinglegacy },
            { name: 'Blade Ball', slug: 'bladeball', icon: 'fa-solid fa-baseball-bat-ball', description: 'Coins, Swords, Gamepasses', headerColor: '#1565c0', image: catImages.bladeball },
            { name: 'Brookhaven', slug: 'brookhaven', icon: 'fa-solid fa-ghost', description: 'Premium Pass, Vehicles, Items', headerColor: '#2e7d32', image: catImages.brookhaven },
            { name: 'Da Hood', slug: 'dahood', icon: 'fa-solid fa-city', description: 'Money, Skins, Gamepasses', headerColor: '#4e342e', image: catImages.dahood },
            { name: 'Toilet Tower Defense', slug: 'ttd', icon: 'fa-solid fa-person-running', description: 'Units, Gems, Gamepasses', headerColor: '#e65100', image: catImages.ttd },
            { name: 'Robux', slug: 'robux', icon: 'fa-solid fa-coins', description: 'เติม Robux ราคาถูก', headerColor: '#0288d1', image: catImages.robux },
        ];

        const catDocs = {};
        for (let i = 0; i < categories.length; i++) {
            const cat = await Category.findOneAndUpdate(
                { slug: categories[i].slug },
                { $setOnInsert: { ...categories[i], sortOrder: i } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            catDocs[cat.slug] = cat;
        }
        console.log('   ✅ Categories checked');

        // Create products
        const products = [
            // Blox Fruits
            { title: 'ผล Kitsune ถาวร', price: 1200, categorySlug: 'bloxfruits', imgLabel: 'Kitsune', desc: '• ผล Kitsune ถาวร (Permanent)' },
            { title: 'ผล Leopard ถาวร', price: 950, categorySlug: 'bloxfruits', imgLabel: 'Leopard', desc: '• ผล Leopard ถาวร (Permanent)' },
            { title: 'ผล Dragon (Rework)', price: 800, categorySlug: 'bloxfruits', imgLabel: 'Dragon', desc: '• ผล Dragon Rework ถาวร' },
            { title: 'Dark Blade (Yoru)', price: 350, categorySlug: 'bloxfruits', imgLabel: 'Dark Blade', desc: '• ดาบ Yoru (Dark Blade)' },
            { title: 'Gamepass 2x Money', price: 150, categorySlug: 'bloxfruits', imgLabel: '2x Money', desc: '• Gamepass เงินx2 ตลอด' },
            { title: 'Gamepass 2x Mastery', price: 150, categorySlug: 'bloxfruits', imgLabel: '2x Mastery', desc: '• Gamepass Mastery x2' },
            { title: 'Gamepass Fast Boats', price: 100, categorySlug: 'bloxfruits', imgLabel: 'Fast Boats', desc: '• Gamepass เรือเร็ว' },
            { title: 'Gamepass 2x Drop', price: 100, categorySlug: 'bloxfruits', imgLabel: '2x Drop', desc: '• Gamepass ดรอปx2' },
            { title: '+1 Fruit Storage', price: 80, categorySlug: 'bloxfruits', imgLabel: 'Fruit Storage', desc: '• เพิ่มช่องเก็บผล +1' },
            { title: 'บริการทำเผ่า V4', price: 300, categorySlug: 'bloxfruits', imgLabel: 'Race V4', desc: '• บริการทำเผ่า V4' },

            // Pet Simulator 99
            { title: 'Huge Unicorn', price: 2500, categorySlug: 'petsim99', imgLabel: 'Huge Unicorn', desc: '• Huge Unicorn Pet' },
            { title: 'Huge Dragon', price: 3000, categorySlug: 'petsim99', imgLabel: 'Huge Dragon', desc: '• Huge Dragon Pet' },
            { title: 'Huge Cat', price: 1500, categorySlug: 'petsim99', imgLabel: 'Huge Cat', desc: '• Huge Cat Pet' },
            { title: '10B Gems', price: 500, categorySlug: 'petsim99', imgLabel: '10B Gems', desc: '• 10 Billion Gems' },
            { title: 'Gamepass VIP', price: 200, categorySlug: 'petsim99', imgLabel: 'VIP', desc: '• VIP Gamepass' },
            { title: 'Auto Farm', price: 250, categorySlug: 'petsim99', imgLabel: 'Auto Farm', desc: '• Auto Farm Gamepass' },
            { title: 'Lucky Egg x5', price: 180, categorySlug: 'petsim99', imgLabel: 'Lucky Egg', desc: '• Lucky Egg x5' },
            { title: '2x Coins Boost', price: 150, categorySlug: 'petsim99', imgLabel: '2x Coins', desc: '• Boost Coins x2' },
            { title: 'Golden Egg', price: 350, categorySlug: 'petsim99', imgLabel: 'Golden Egg', desc: '• Golden Egg พิเศษ' },
            { title: 'Exclusive Enchant', price: 400, categorySlug: 'petsim99', imgLabel: 'Enchant', desc: '• Enchant สุดพิเศษ' },

            // Anime Adventures
            { title: 'Goku (LR)', price: 3500, categorySlug: 'animeadv', imgLabel: 'Goku LR', desc: '• ตัวละคร Goku LR' },
            { title: 'Naruto (Sage)', price: 2800, categorySlug: 'animeadv', imgLabel: 'Naruto', desc: '• Naruto Sage Mode' },
            { title: 'Luffy Gear 5', price: 3000, categorySlug: 'animeadv', imgLabel: 'Luffy G5', desc: '• Luffy Gear Fifth' },
            { title: 'Ichigo Vasto', price: 2500, categorySlug: 'animeadv', imgLabel: 'Ichigo', desc: '• Ichigo Vasto Lorde' },
            { title: '10M Gems', price: 400, categorySlug: 'animeadv', imgLabel: '10M Gems', desc: '• 10 Million Gems' },
            { title: 'VIP Gamepass', price: 250, categorySlug: 'animeadv', imgLabel: 'VIP', desc: '• VIP Gamepass' },
            { title: '2x Damage', price: 200, categorySlug: 'animeadv', imgLabel: '2x DMG', desc: '• Damage x2 ถาวร' },
            { title: 'Auto Skip', price: 150, categorySlug: 'animeadv', imgLabel: 'Auto Skip', desc: '• Auto Skip Gamepass' },
            { title: 'Saitama (Secret)', price: 5000, categorySlug: 'animeadv', imgLabel: 'Saitama', desc: '• Saitama Secret Unit' },
            { title: 'Extra Slot +1', price: 100, categorySlug: 'animeadv', imgLabel: '+1 Slot', desc: '• เพิ่มช่องตั้งตัว +1' },

            // King Legacy
            { title: 'ผล Dough Awakened', price: 2000, categorySlug: 'kinglegacy', imgLabel: 'Dough AWK', desc: '• ผล Dough Awakened' },
            { title: 'ผล Magma Awakened', price: 1500, categorySlug: 'kinglegacy', imgLabel: 'Magma AWK', desc: '• ผล Magma Awakened' },
            { title: 'ผล Light Awakened', price: 1200, categorySlug: 'kinglegacy', imgLabel: 'Light AWK', desc: '• ผล Light Awakened' },
            { title: 'Dark Blade', price: 800, categorySlug: 'kinglegacy', imgLabel: 'Dark Blade', desc: '• Dark Blade' },
            { title: 'Gamepass 2x EXP', price: 200, categorySlug: 'kinglegacy', imgLabel: '2x EXP', desc: '• EXP x2 ถาวร' },
            { title: 'Gamepass 2x Money', price: 200, categorySlug: 'kinglegacy', imgLabel: '2x Money', desc: '• Money x2 ถาวร' },
            { title: 'Fruit Bag +1', price: 100, categorySlug: 'kinglegacy', imgLabel: 'Fruit Bag', desc: '• กระเป๋าผลเพิ่ม' },
            { title: 'Haki V2', price: 500, categorySlug: 'kinglegacy', imgLabel: 'Haki V2', desc: '• บริการทำ Haki V2' },
            { title: 'Race V3', price: 400, categorySlug: 'kinglegacy', imgLabel: 'Race V3', desc: '• บริการทำเผ่า V3' },
            { title: 'ผล Rubber Mythical', price: 3000, categorySlug: 'kinglegacy', imgLabel: 'Rubber', desc: '• ผล Rubber Mythical' },

            // Blade Ball
            { title: 'Sword: Katana X', price: 500, categorySlug: 'bladeball', imgLabel: 'Katana X', desc: '• ดาบ Katana X' },
            { title: 'Sword: Flame Blade', price: 600, categorySlug: 'bladeball', imgLabel: 'Flame Blade', desc: '• ดาบ Flame Blade' },
            { title: 'Coins 100K', price: 300, categorySlug: 'bladeball', imgLabel: '100K Coins', desc: '• 100,000 Coins' },
            { title: 'Coins 500K', price: 800, categorySlug: 'bladeball', imgLabel: '500K Coins', desc: '• 500,000 Coins' },
            { title: 'VIP Gamepass', price: 250, categorySlug: 'bladeball', imgLabel: 'VIP', desc: '• VIP Gamepass' },
            { title: '2x Coins', price: 150, categorySlug: 'bladeball', imgLabel: '2x Coins', desc: '• Coins x2' },
            { title: 'Speed Boost', price: 180, categorySlug: 'bladeball', imgLabel: 'Speed', desc: '• Speed Boost ถาวร' },
            { title: 'Auto Parry', price: 350, categorySlug: 'bladeball', imgLabel: 'Auto Parry', desc: '• Auto Parry Gamepass' },
            { title: 'Sword: Ice Blade', price: 550, categorySlug: 'bladeball', imgLabel: 'Ice Blade', desc: '• ดาบ Ice Blade' },
            { title: 'Rainbow Aura', price: 400, categorySlug: 'bladeball', imgLabel: 'Rainbow Aura', desc: '• Rainbow Aura Effect' },

            // Brookhaven
            { title: 'Premium Gamepass', price: 200, categorySlug: 'brookhaven', imgLabel: 'Premium', desc: '• Premium Gamepass' },
            { title: 'Mansion', price: 350, categorySlug: 'brookhaven', imgLabel: 'Mansion', desc: '• บ้าน Mansion' },
            { title: 'Sports Car', price: 180, categorySlug: 'brookhaven', imgLabel: 'Sports Car', desc: '• รถ Sports Car' },
            { title: 'Helicopter', price: 250, categorySlug: 'brookhaven', imgLabel: 'Helicopter', desc: '• เฮลิคอปเตอร์' },
            { title: 'Airplane', price: 300, categorySlug: 'brookhaven', imgLabel: 'Airplane', desc: '• เครื่องบิน' },
            { title: 'Special Hair Pack', price: 100, categorySlug: 'brookhaven', imgLabel: 'Hair Pack', desc: '• ชุดทรงผมพิเศษ' },
            { title: 'VIP Access', price: 400, categorySlug: 'brookhaven', imgLabel: 'VIP', desc: '• VIP Access Pass' },
            { title: 'Tank', price: 500, categorySlug: 'brookhaven', imgLabel: 'Tank', desc: '• รถถัง' },
            { title: 'Motorbike Pack', price: 150, categorySlug: 'brookhaven', imgLabel: 'Motorbike', desc: '• มอเตอร์ไซค์' },
            { title: 'Guitar Animation', price: 80, categorySlug: 'brookhaven', imgLabel: 'Guitar', desc: '• แอนิเมชั่นกีตาร์' },

            // Da Hood
            { title: '$500K Cash', price: 300, categorySlug: 'dahood', imgLabel: '$500K', desc: '• $500,000 Cash' },
            { title: '$1M Cash', price: 500, categorySlug: 'dahood', imgLabel: '$1M', desc: '• $1,000,000 Cash' },
            { title: 'Stomp Gamepass', price: 200, categorySlug: 'dahood', imgLabel: 'Stomp', desc: '• Stomp Gamepass' },
            { title: 'Radio Gamepass', price: 150, categorySlug: 'dahood', imgLabel: 'Radio', desc: '• Radio Gamepass' },
            { title: 'Boombox', price: 180, categorySlug: 'dahood', imgLabel: 'Boombox', desc: '• Boombox' },
            { title: 'Nike Shoes', price: 120, categorySlug: 'dahood', imgLabel: 'Nike', desc: '• รองเท้า Nike' },
            { title: 'AK-47 Skin Gold', price: 250, categorySlug: 'dahood', imgLabel: 'AK Gold', desc: '• สกิน AK-47 Gold' },
            { title: 'Super Punch', price: 300, categorySlug: 'dahood', imgLabel: 'Super Punch', desc: '• Super Punch Gamepass' },
            { title: 'Double Jump', price: 200, categorySlug: 'dahood', imgLabel: 'Dbl Jump', desc: '• Double Jump Gamepass' },
            { title: 'Fly Gamepass', price: 350, categorySlug: 'dahood', imgLabel: 'Fly', desc: '• Fly Gamepass' },

            // Toilet Tower Defense
            { title: 'Unit: Titan TV Man', price: 3000, categorySlug: 'ttd', imgLabel: 'Titan TV', desc: '• Titan TV Man' },
            { title: 'Unit: Large Speaker', price: 2000, categorySlug: 'ttd', imgLabel: 'Large Speaker', desc: '• Large Speaker Man' },
            { title: 'Unit: Upgraded Titan', price: 4000, categorySlug: 'ttd', imgLabel: 'Upg Titan', desc: '• Upgraded Titan Cameraman' },
            { title: '100M Gems', price: 500, categorySlug: 'ttd', imgLabel: '100M Gems', desc: '• 100 Million Gems' },
            { title: '500M Gems', price: 1200, categorySlug: 'ttd', imgLabel: '500M Gems', desc: '• 500 Million Gems' },
            { title: 'VIP Gamepass', price: 250, categorySlug: 'ttd', imgLabel: 'VIP', desc: '• VIP Gamepass' },
            { title: '2x Gems Boost', price: 150, categorySlug: 'ttd', imgLabel: '2x Gems', desc: '• Gems Boost x2' },
            { title: 'Auto Farm', price: 200, categorySlug: 'ttd', imgLabel: 'Auto Farm', desc: '• Auto Farm Gamepass' },
            { title: 'Extra Tower Slot', price: 100, categorySlug: 'ttd', imgLabel: '+1 Tower', desc: '• เพิ่มช่องตั้ง Tower' },
            { title: 'Unit: Plunger Man', price: 800, categorySlug: 'ttd', imgLabel: 'Plunger', desc: '• Plunger Man Unit' },

            // Robux
            { title: 'Robux 100', price: 35, categorySlug: 'robux', imgLabel: '100 R$', desc: '• 100 Robux' },
            { title: 'Robux 200', price: 69, categorySlug: 'robux', imgLabel: '200 R$', desc: '• 200 Robux' },
            { title: 'Robux 400', price: 135, categorySlug: 'robux', imgLabel: '400 R$', desc: '• 400 Robux' },
            { title: 'Robux 800', price: 265, categorySlug: 'robux', imgLabel: '800 R$', desc: '• 800 Robux' },
            { title: 'Robux 1000', price: 330, categorySlug: 'robux', imgLabel: '1,000 R$', desc: '• 1,000 Robux' },
            { title: 'Robux 1700', price: 555, categorySlug: 'robux', imgLabel: '1,700 R$', desc: '• 1,700 Robux' },
            { title: 'Robux 2200', price: 715, categorySlug: 'robux', imgLabel: '2,200 R$', desc: '• 2,200 Robux' },
            { title: 'Robux 4500', price: 1425, categorySlug: 'robux', imgLabel: '4,500 R$', desc: '• 4,500 Robux' },
            { title: 'Robux 10000', price: 3100, categorySlug: 'robux', imgLabel: '10,000 R$', desc: '• 10,000 Robux' },
            { title: 'Robux 22500', price: 6750, categorySlug: 'robux', imgLabel: '22,500 R$', desc: '• 22,500 Robux' },
        ];

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const cat = catDocs[p.categorySlug];
            if (cat) {
                await Product.findOneAndUpdate(
                    { title: p.title, categorySlug: p.categorySlug },
                    {
                        $setOnInsert: {
                            price: p.price,
                            category: cat._id,
                            description: p.desc || '',
                            imgLabel: p.imgLabel || p.title,
                            image: catImages[p.categorySlug] || '',
                            sortOrder: i % 10,
                        },
                    },
                    { upsert: true, setDefaultsOnInsert: true }
                );
            }
        }
        console.log(`   ✅ ${products.length} products checked`);
        console.log('🎉 Database seed check completed!');

    } catch (err) {
        console.error('❌ Seed error:', err.message);
    }
}

module.exports = seedDatabase;
