function openContactPopup() { document.getElementById('contactPopup').classList.add('active'); }
        function closeContactPopup() { document.getElementById('contactPopup').classList.remove('active'); }

        let allProducts = [];
        let categorySlug = null;
        let categoryInfo = null;

        document.addEventListener('DOMContentLoaded', async () => {
            const params = new URLSearchParams(window.location.search);
            categorySlug = params.get('cat') || params.get('category');
            await loadProducts();
            document.getElementById('searchInput').addEventListener('input', renderFilteredProducts);
            document.getElementById('sortSelect').addEventListener('change', renderFilteredProducts);

            // Load banner popup
            try {
                const bannerResult = await KNShop.getBanners();
                if (bannerResult.success && bannerResult.banners && bannerResult.banners.length > 0) {
                    initHomeBannerPopup(bannerResult.banners);
                }
            } catch (e) { console.error('Banner error:', e); }
        });

        async function loadProducts() {
            try {
                if (categorySlug) {
                    const [catData, prodData] = await Promise.all([
                        KNShop.getCategory(categorySlug),
                        KNShop.getProducts(categorySlug)
                    ]);
                    if (catData.success && catData.category) {
                        categoryInfo = catData.category;
                        // Use image as header if available, otherwise use name
                        if (categoryInfo.image) {
                            document.getElementById('pageTitle').textContent = categoryInfo.name;
                            document.getElementById('pageHeader').style.background = `linear-gradient(135deg, #0277bd, #4fc3f7)`;
                        } else {
                            document.getElementById('pageTitle').textContent = categoryInfo.name;
                        }
                        document.getElementById('pageDesc').textContent = categoryInfo.description || 'สินค้าทั้งหมดในหมวดนี้';
                        document.title = `สินค้า ${categoryInfo.name} - KN Shop`;
                        // Update breadcrumb
                        const bcEl = document.getElementById('breadcrumbCurrent');
                        if (bcEl) bcEl.textContent = categoryInfo.name;
                    }
                    allProducts = (prodData.success && prodData.products) ? prodData.products : [];
                } else {
                    const data = await KNShop.getProducts();
                    allProducts = (data.success && data.products) ? data.products : [];
                    document.getElementById('pageTitle').innerHTML = '<i class="fa-solid fa-store"></i> สินค้าทั้งหมด';
                    document.getElementById('pageDesc').textContent = 'ไอเทมเกมทุกชนิด ราคาถูก ส่งไว';
                    document.title = 'สินค้าทั้งหมด - KN Shop';
                    const bcEl = document.getElementById('breadcrumbCurrent');
                    if (bcEl) bcEl.textContent = 'สินค้าทั้งหมด';
                }
                renderFilteredProducts();
            } catch (err) {
                console.error('Load products error:', err);
                document.getElementById('productsGrid').innerHTML = '<div class="products-empty" style="grid-column:1/-1;"><i class="fa-solid fa-exclamation-triangle"></i><p>ไม่สามารถโหลดสินค้าได้</p></div>';
            }
        }

        function renderFilteredProducts() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            const sortBy = document.getElementById('sortSelect').value;

            let filtered = allProducts.filter(p => {
                if (!p.isActive) return false;
                if (searchTerm && !p.title.toLowerCase().includes(searchTerm)) return false;
                return true;
            });

            switch (sortBy) {
                case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
                case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
                case 'name-asc': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
                case 'popular': filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)); break;
            }

            document.getElementById('productCount').textContent = `แสดง ${filtered.length} จาก ${allProducts.length} รายการ`;

            const grid = document.getElementById('productsGrid');
            if (filtered.length === 0) {
                grid.innerHTML = `<div class="products-empty" style="grid-column:1/-1;">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>ไม่พบสินค้า</h3>
                    <p style="color:#999; margin-top:5px;">${searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีสินค้าในหมวดนี้'}</p>
                </div>`;
                return;
            }

            grid.innerHTML = filtered.map(p => {
                const title = KNShop.escapeHTML(p.title);
                const description = KNShop.escapeHTML(p.description || '');
                const label = KNShop.escapeHTML(p.imgLabel || p.title);
                const image = KNShop.safeUrl(p.image);
                const productId = encodeURIComponent(p._id || '');
                // Image section
                const imgHtml = image
                    ? `<img src="${KNShop.escapeHTML(image)}" alt="${title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div class="pd-card-label" style="display:none;">${label}</div>`
                    : `<div class="pd-card-label">${label}</div>`;

                // Determine if out of stock (inStock=false OR stockQty=0)
                const isOutOfStock = !p.inStock || p.stockQty === 0;

                // Stock info
                let stockText = '';
                let stockClass = 'stock-info';
                if (isOutOfStock) {
                    stockText = 'สินค้าหมด';
                    stockClass = 'stock-info out-of-stock';
                } else if (p.stockQty === -1 || p.stockQty === undefined) {
                    stockText = 'สินค้าไม่จำกัด';
                } else {
                    stockText = `เหลือ ${p.stockQty.toLocaleString()} ชิ้น`;
                }

                // Sold count
                const soldCount = p.soldCount || 0;

                return `<div class="pd-card">
                    ${isOutOfStock ? '<div class="pd-out-badge">สินค้าหมด</div>' : ''}
                    ${p.isHot && !isOutOfStock ? '<div class="pd-hot-badge"><i class="fa-solid fa-fire"></i> HOT</div>' : ''}
                    <div class="pd-card-image">
                        ${imgHtml}
                    </div>
                    <div class="pd-body">
                        <div class="pd-title">${title}</div>
                        ${description ? `<div class="pd-desc">${description}</div>` : ''}
                        <div class="pd-price">${p.price.toLocaleString()} P</div>
                        <div class="pd-meta">
                            <span class="sold-info"><i class="fa-solid fa-bag-shopping"></i> ขายแล้ว ${soldCount.toLocaleString()} ชิ้น</span>
                            <span class="${stockClass}"><i class="fa-solid fa-warehouse"></i> ${stockText}</span>
                        </div>
                        <a href="/pages/product-detail.html?id=${productId}" class="pd-btn ${isOutOfStock ? 'disabled' : ''}">
                            <i class="fa-solid fa-cart-shopping"></i> ${isOutOfStock ? 'สินค้าหมด' : 'ซื้อสินค้า'}
                        </a>
                    </div>
                </div>`;
            }).join('');
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeContactPopup();
        });
