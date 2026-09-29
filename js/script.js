document.addEventListener('DOMContentLoaded', async () => {
    // ==================== LOAD REAL STATS & DATA ====================
    try {
        // Load real stats from API
        const statsData = await KNShop.getPublicStats();
        if (statsData.success) {
            updateStats(statsData.stats);
        }

        // Load categories for "เกมและสินค้าแนะนำ" section
        const catData = await KNShop.getCategories();
        if (catData.success && catData.categories) {
            renderRecommendedGames(catData.categories);
        }
    } catch (err) {
        console.error('Homepage load error:', err);
    }

    // ==================== BANNER POPUP ====================
    try {
        const bannerResult = await KNShop.getBanners();
        if (bannerResult.success && bannerResult.banners && bannerResult.banners.length > 0) {
            initHomeBannerPopup(bannerResult.banners);
        }
    } catch (err) {
        console.error('Banner load error:', err);
    }
});

// ==================== RENDER RECOMMENDED GAMES (redesigned cards) ====================
function renderRecommendedGames(categories) {
    const grid = document.getElementById('recommendedGrid');
    if (!grid) return;

    // Filter active categories, exclude "robux" since it has its own main card
    const gameCategories = categories.filter(c => c.isActive && c.slug !== 'robux');

    if (gameCategories.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px; color:#999;"><p>ยังไม่มีเกมแนะนำ</p></div>';
        return;
    }

    grid.innerHTML = gameCategories.map(c => {
        const hasImage = c.image && c.image.length > 0;
        const stockText = c.totalStock > 0 ? `${c.totalStock.toLocaleString()} ชิ้น` : 'ไม่จำกัด';
        const name = KNShop.escapeHTML(c.name);
        const description = KNShop.escapeHTML(c.description || 'ดูสินค้าทั้งหมด');
        const icon = KNShop.escapeHTML(c.icon || 'fa-solid fa-gamepad');
        const image = KNShop.safeUrl(c.image);
        const slug = encodeURIComponent(c.slug || '');
        const headerColor = /^#[0-9a-f]{3,8}$/i.test(c.headerColor || '') ? c.headerColor : '#0288d1';

        return `
        <div class="gp-card" style="--card-color: ${headerColor}">
            ${c.isHot ? '<div class="gp-hot-badge"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
            <div class="gp-card-image">
                ${hasImage && image
                ? `<img src="${KNShop.escapeHTML(image)}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="gp-card-icon-fallback" style="display:none;"><i class="${icon}"></i></div>`
                : `<div class="gp-card-icon-fallback"><i class="${icon}"></i></div>`
            }
            </div>
            <div class="gp-card-body">
                <h3 class="gp-card-title">${name}</h3>
                <p class="gp-card-desc">${description}</p>
                <div class="gp-card-stats">
                    <span><i class="fa-solid fa-box"></i> ${c.productCount || 0} สินค้า</span>
                    <span><i class="fa-solid fa-fire-flame-curved"></i> ขายแล้ว ${(c.totalSold || 0).toLocaleString()} ชิ้น</span>
                </div>
                <div class="gp-card-stock">
                    <span><i class="fa-solid fa-warehouse"></i> สต๊อก: ${stockText}</span>
                </div>
                <a href="/pages/products.html?cat=${slug}" class="gp-card-btn">
                    <i class="fa-solid fa-store"></i> ดูสินค้า
                </a>
            </div>
        </div>
        `;
    }).join('');
}

// ==================== UPDATE STATS (REAL DATA) ====================
function updateStats(stats) {
    const dataMap = {
        'stat-users': stats.totalUsers || 0,
        'stat-products': stats.totalProducts || 0,
        'stat-stock': stats.inStockProducts || 0,
        'stat-sold': stats.totalSold || 0
    };

    // Animate counters
    Object.keys(dataMap).forEach(id => {
        const counter = document.getElementById(id);
        if (!counter) return;

        const target = dataMap[id];
        if (target === 0) {
            counter.innerText = '0';
            return;
        }

        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                counter.innerText = Math.ceil(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                counter.innerText = target.toLocaleString();
            }
        };
        updateCounter();
    });
}

