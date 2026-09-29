function openContactPopup() { document.getElementById('contactPopup').classList.add('active'); }
        function closeContactPopup() { document.getElementById('contactPopup').classList.remove('active'); }

        let allProducts = [];

        document.addEventListener('DOMContentLoaded', async () => {
            await loadRobuxProducts();
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

        async function loadRobuxProducts() {
            try {
                const data = await KNShop.getProducts('robux');
                allProducts = (data.success && data.products) ? data.products : [];
                renderFilteredProducts();
            } catch (err) {
                console.error('Robux load error:', err);
                document.getElementById('robuxGrid').innerHTML = '<div class="products-empty" style="grid-column:1/-1;"><i class="fa-solid fa-exclamation-triangle"></i><p>ไม่สามารถโหลดข้อมูลได้</p></div>';
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
                case 'popular': filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)); break;
            }

            document.getElementById('productCount').textContent = `แสดง ${filtered.length} จาก ${allProducts.length} รายการ`;

            const grid = document.getElementById('robuxGrid');
            if (filtered.length === 0) {
                grid.innerHTML = `<div class="products-empty" style="grid-column:1/-1;">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>ไม่พบแพ็กเกจ Robux</h3>
                    <p style="color:#999; margin-top:5px;">${searchTerm ? 'ลองค้นหาด้วยคำอื่น' : 'ยังไม่มีแพ็กเกจ Robux'}</p>
                </div>`;
                return;
            }

            grid.innerHTML = filtered.map(p => {
                const title = KNShop.escapeHTML(p.title);
                const description = KNShop.escapeHTML(p.description || '');
                const label = KNShop.escapeHTML(p.imgLabel || p.title);
                const image = KNShop.safeUrl(p.image);
                const productId = encodeURIComponent(p._id || '');
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

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeContactPopup();
        });
