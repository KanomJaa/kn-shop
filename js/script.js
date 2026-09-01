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

        return `
        <div class="gp-card" style="--card-color: ${c.headerColor || '#0288d1'}">
            ${c.isHot ? '<div class="gp-hot-badge"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
            <div class="gp-card-image">
                ${hasImage
                ? `<img src="${c.image}" alt="${c.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="gp-card-icon-fallback" style="display:none;"><i class="${c.icon}"></i></div>`
                : `<div class="gp-card-icon-fallback"><i class="${c.icon}"></i></div>`
            }
            </div>
            <div class="gp-card-body">
                <h3 class="gp-card-title">${c.name}</h3>
                <p class="gp-card-desc">${c.description || 'ดูสินค้าทั้งหมด'}</p>
                <div class="gp-card-stats">
                    <span><i class="fa-solid fa-box"></i> ${c.productCount || 0} สินค้า</span>
                    <span><i class="fa-solid fa-fire-flame-curved"></i> ขายแล้ว ${(c.totalSold || 0).toLocaleString()} ชิ้น</span>
                </div>
                <div class="gp-card-stock">
                    <span><i class="fa-solid fa-warehouse"></i> สต๊อก: ${stockText}</span>
                </div>
                <a href="/pages/products.html?cat=${c.slug}" class="gp-card-btn">
                    <i class="fa-solid fa-store"></i> ดูสินค้า
                </a>
            </div>
        </div>
        `;
    }).join('');
}

// ==================== BANNER POPUP (Homepage) ====================
let homeBanners = [];
let homeCurrentBanner = 0;

function initHomeBannerPopup(banners) {
    homeBanners = banners;

    // Create banner popup dynamically if not exist
    if (!document.getElementById('bannerPopup')) {
        const popupHTML = `
        <div class="banner-popup-overlay" id="bannerPopup" onclick="closeBannerPopup()">
            <div class="banner-popup-box" onclick="event.stopPropagation()">
                <button class="banner-close-btn" onclick="closeBannerPopup()"><i class="fa-solid fa-xmark"></i></button>
                <div class="banner-slider" id="bannerSlider">
                    <div class="banner-slide-container" id="bannerSlideContainer"></div>
                    <button class="banner-arrow banner-prev" id="bannerPrev"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="banner-arrow banner-next" id="bannerNext"><i class="fa-solid fa-chevron-right"></i></button>
                    <div class="banner-dots" id="bannerDots"></div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    }

    renderHomeBannerSlider();

    // Show popup with 5-minute cooldown
    const lastDismissed = localStorage.getItem('bannerDismissedAt');
    const cooldownMs = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const canShow = !lastDismissed || (now - parseInt(lastDismissed)) > cooldownMs;

    if (canShow) {
        setTimeout(() => {
            const popup = document.getElementById('bannerPopup');
            if (popup) popup.classList.add('active');
        }, 1000);
    }
}

function renderHomeBannerSlider() {
    const container = document.getElementById('bannerSlideContainer');
    const dots = document.getElementById('bannerDots');
    if (!container || !dots) return;

    container.innerHTML = homeBanners.map((b, i) => `
        <div class="banner-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
            ${b.isHot ? '<div class="slide-hot-tag"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
            ${b.link ? `<a href="${b.link}" target="_blank">` : ''}
            <img src="${b.image}" alt="${b.title || 'Banner'}" onerror="this.style.display='none'">
            ${b.link ? '</a>' : ''}
            ${b.title ? `<div class="slide-title">${b.title}</div>` : ''}
        </div>
    `).join('');

    dots.innerHTML = homeBanners.map((_, i) =>
        `<span class="banner-dot ${i === 0 ? 'active' : ''}" onclick="goToHomeBanner(${i})"></span>`
    ).join('');

    if (homeBanners.length <= 1) {
        document.getElementById('bannerPrev').style.display = 'none';
        document.getElementById('bannerNext').style.display = 'none';
        dots.style.display = 'none';
    }

    document.getElementById('bannerPrev')?.addEventListener('click', () => {
        goToHomeBanner(homeCurrentBanner <= 0 ? homeBanners.length - 1 : homeCurrentBanner - 1);
    });
    document.getElementById('bannerNext')?.addEventListener('click', () => {
        goToHomeBanner(homeCurrentBanner >= homeBanners.length - 1 ? 0 : homeCurrentBanner + 1);
    });
}

function goToHomeBanner(index) {
    const slides = document.querySelectorAll('.banner-slide');
    const dots = document.querySelectorAll('.banner-dot');
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    homeCurrentBanner = index;
    if (slides[index]) slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
}

function closeBannerPopup() {
    const popup = document.getElementById('bannerPopup');
    if (popup) popup.classList.remove('active');
    localStorage.setItem('bannerDismissedAt', Date.now().toString());
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

