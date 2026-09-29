// ==================== CONTACT POPUPS ====================
        function openContactPopup() {
            document.getElementById('contactPopup').classList.add('active');
        }
        function closeContactPopup() {
            document.getElementById('contactPopup').classList.remove('active');
        }
        function openLinePopup() {
            closeContactPopup();
            document.getElementById('lineQrPopup').style.display = 'flex';
        }
        function closeLinePopup() {
            document.getElementById('lineQrPopup').style.display = 'none';
        }

        // ==================== BANNER POPUP ====================
        let bannerData = [];
        let currentBannerIndex = 0;

        async function initBannerPopup() {
            try {
                const data = await KNShop.getBanners();
                if (data.success && data.banners && data.banners.length > 0) {
                    bannerData = data.banners;
                    renderBannerSlider();
                    // Show popup on page load
                    const dismissed = sessionStorage.getItem('bannerDismissed');
                    if (!dismissed) {
                        setTimeout(() => {
                            document.getElementById('bannerPopup').classList.add('active');
                        }, 1000);
                    }
                }
            } catch (err) {
                console.error('Banner load error:', err);
            }
        }

        function renderBannerSlider() {
            const container = document.getElementById('bannerSlideContainer');
            const dots = document.getElementById('bannerDots');

            container.innerHTML = bannerData.map((b, i) => {
                const image = KNShop.safeUrl(b.image);
                const link = KNShop.safeUrl(b.link);
                const title = KNShop.escapeHTML(b.title || '');
                return `
                <div class="banner-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
                    ${b.isHot ? '<div class="slide-hot-tag"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
                    ${link ? `<a href="${KNShop.escapeHTML(link)}" target="_blank" rel="noopener noreferrer">` : ''}
                    ${image ? `<img src="${KNShop.escapeHTML(image)}" alt="${title || 'Banner'}" onerror="this.style.display='none'">` : ''}
                    ${link ? '</a>' : ''}
                    ${title ? `<div class="slide-title">${title}</div>` : ''}
                </div>
            `;
            }).join('');

            dots.innerHTML = bannerData.map((_, i) =>
                `<span class="banner-dot ${i === 0 ? 'active' : ''}" onclick="goToBanner(${i})"></span>`
            ).join('');

            // Hide arrows if only 1 banner
            if (bannerData.length <= 1) {
                document.getElementById('bannerPrev').style.display = 'none';
                document.getElementById('bannerNext').style.display = 'none';
                dots.style.display = 'none';
            }

            updateBannerHotBadge();
        }

        function goToBanner(index) {
            const slides = document.querySelectorAll('.banner-slide');
            const dots = document.querySelectorAll('.banner-dot');
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            currentBannerIndex = index;
            if (slides[index]) slides[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');
            updateBannerHotBadge();
        }

        function updateBannerHotBadge() {
            const badge = document.getElementById('bannerHotBadge');
            if (bannerData[currentBannerIndex]?.isHot) {
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        document.getElementById('bannerPrev')?.addEventListener('click', () => {
            const newIndex = currentBannerIndex <= 0 ? bannerData.length - 1 : currentBannerIndex - 1;
            goToBanner(newIndex);
        });

        document.getElementById('bannerNext')?.addEventListener('click', () => {
            const newIndex = currentBannerIndex >= bannerData.length - 1 ? 0 : currentBannerIndex + 1;
            goToBanner(newIndex);
        });

        function closeBannerPopup() {
            document.getElementById('bannerPopup').classList.remove('active');
            sessionStorage.setItem('bannerDismissed', '1');
        }

        // ==================== LOAD CATEGORIES ====================
        document.addEventListener('DOMContentLoaded', async () => {
            // Init banner popup
            initBannerPopup();

            try {
                const catData = await KNShop.getCategories();
                if (catData.success && catData.categories) {
                    const gameCategories = catData.categories.filter(c => c.isActive && c.slug !== 'robux');

                    // Update hero stats
                    document.getElementById('gpTotalGames').textContent = gameCategories.length;
                    const totalProducts = gameCategories.reduce((sum, c) => sum + (c.productCount || 0), 0);
                    const totalSold = gameCategories.reduce((sum, c) => sum + (c.totalSold || 0), 0);
                    document.getElementById('gpTotalProducts').textContent = totalProducts.toLocaleString();
                    document.getElementById('gpTotalSold').textContent = totalSold.toLocaleString();

                    renderGamepassGrid(gameCategories);
                }
            } catch (err) {
                console.error('Gamepass load error:', err);
                document.getElementById('gamepassGrid').innerHTML =
                    '<p style="text-align:center; color:#999; grid-column:1/-1;">ไม่สามารถโหลดข้อมูลได้</p>';
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') {
                    closeContactPopup();
                    closeLinePopup();
                    closeBannerPopup();
                }
            });
        });

        function renderGamepassGrid(categories) {
            const grid = document.getElementById('gamepassGrid');
            if (!grid) return;

            if (categories.length === 0) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#999;"><h3>ยังไม่มีหมวดหมู่</h3></div>';
                return;
            }

            grid.innerHTML = categories.map(c => {
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
